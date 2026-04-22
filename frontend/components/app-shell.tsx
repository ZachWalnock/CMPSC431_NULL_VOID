"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

type AppShellProps = {
  children: React.ReactNode;
  email?: string;
  role?: string;
};

const roleLabel = (role?: string) => {
  switch (role) {
    case "helpdesk":
      return "HelpDesk";
    case "seller":
      return "Seller";
    case "buyer":
    case "bidder":
      return "Buyer";
    default:
      return "User";
  }
};

export function AppShell({ children, email, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/profile", label: "Profile" },
    { href: "/requests", label: "Requests" },
    ...(role === "helpdesk" ? [{ href: "/helpdesk", label: "HelpDesk" }] : []),
  ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch<{ success: boolean }>("/api/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f8fbff_100%)] text-slate-800">
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
