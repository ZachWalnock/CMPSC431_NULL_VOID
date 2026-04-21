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
      <nav className="border-b border-slate-200/80 bg-[#1e3a5f]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xl font-semibold tracking-[0.04em] text-white">
              NittanyAuction
            </p>
            <p className="mt-1 text-sm text-blue-100/80">
              {email ? `${email} | ${roleLabel(role)}` : "Session-backed frontend"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#1e3a5f]"
                      : "border border-white/25 text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1e3a5f] transition hover:bg-slate-100 disabled:opacity-70"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
