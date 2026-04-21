"use client";

import { useEffect, useState } from "react";
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
import { apiFetch } from "@/lib/api";

const categories = [
  {
    label: "Electronics",
    sub: ["Cameras", "Camera Lenses", "Laptops", "Audio", "Gaming"],
  },
  {
    label: "Furniture",
    sub: ["Office Chairs"],
  },
  {
    label: "Appliances",
    sub: ["Vacuums"],
  },
  {
    label: "Books & Media",
    sub: [],
  },
  {
    label: "Clothing & Accessories",
    sub: [],
  },
  {
    label: "Sports & Outdoors",
    sub: [],
  },
];

const baseNavItems = [
  { label: "Home", href: "/" },
  { label: "Orders", href: "/orders" },
];

export function AppSidebar() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    apiFetch<{ role: string }>("/api/session")
      .then((data) => setIsSeller(data.role === "seller"))
      .catch(() => {});
  }, []);

  const topNavItems = isSeller
    ? [baseNavItems[0], { label: "Seller Dashboard", href: "/seller_auction_page" }, baseNavItems[1]]
    : baseNavItems;

  function toggleCategory(label: string) {
    setOpenCategory(openCategory === label ? null : label);
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
                <SidebarMenuItem key={cat.label}>
                  <SidebarMenuButton onClick={() => cat.sub.length > 0 && toggleCategory(cat.label)} asChild={cat.sub.length === 0}>
                    {cat.sub.length === 0 ? (
                      <Link href={`/buyer_auction_page?category=${encodeURIComponent(cat.label)}`}>
                        {cat.label}
                      </Link>
                    ) : (
                      <span className="flex items-center justify-between w-full cursor-pointer">
                        {cat.label}
                        <span className="text-xs text-gray-400">{openCategory === cat.label ? "▾" : "▸"}</span>
                      </span>
                    )}
                  </SidebarMenuButton>

                  {cat.sub.length > 0 && openCategory === cat.label && (
                    <SidebarMenuSub>
                      {cat.sub.map((sub) => (
                        <SidebarMenuSubItem key={sub}>
                          <SidebarMenuSubButton asChild>
                            <Link href={`/buyer_auction_page?category=${encodeURIComponent(cat.label)}&sub=${encodeURIComponent(sub)}`}>
                              {sub}
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
