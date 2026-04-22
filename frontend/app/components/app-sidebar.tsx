"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/app/components/ui/sidebar";
import Link from "next/link";

type Category = {
  parent: string;
  children: string[];
};

const topNavItems = [
  { label: "Home", href: "/" },
  { label: "Seller Dashboard", href: "/seller_auction_page" },
  { label: "Orders", href: "/orders" },
];

export function AppSidebar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Fetch categories from the backend on mount
  useEffect(() => {
    fetch("http://localhost:8000/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  function toggleCategory(parent: string) {
    setOpenCategory(openCategory === parent ? null : parent);
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>NittanyAuction</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {topNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Browse Auctions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((cat) => (
                <SidebarMenuItem key={cat.parent}>
                  <SidebarMenuButton
                    onClick={() => cat.children.length > 0 && toggleCategory(cat.parent)}
                    asChild={cat.children.length === 0}
                  >
                    {cat.children.length === 0 ? (
                      <Link href={`/buyer_auction_page?category=${encodeURIComponent(cat.parent)}`}>
                        {cat.parent}
                      </Link>
                    ) : (
                      <span className="flex items-center justify-between w-full cursor-pointer">
                        {cat.parent}
                        <span className="text-xs text-gray-400">
                          {openCategory === cat.parent ? "▾" : "▸"}
                        </span>
                      </span>
                    )}
                  </SidebarMenuButton>

                  {cat.children.length > 0 && openCategory === cat.parent && (
                    <SidebarMenuSub>
                      {cat.children.map((child) => (
                        <SidebarMenuSubItem key={child}>
                          <SidebarMenuSubButton asChild>
                            <Link href={`/buyer_auction_page?category=${encodeURIComponent(child)}`}>
                              {child}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
