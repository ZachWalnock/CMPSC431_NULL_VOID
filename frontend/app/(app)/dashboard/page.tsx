"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { SessionPage, type SessionData } from "@/components/session-page";
import { apiFetch, type ApiError } from "@/lib/api";

type DashboardData = {
  role: string;
  email: string;
  links: Array<{ label: string; href: string }>;
  cards: Array<{ title: string; description: string }>;
};

function roleLabel(role?: string): string {
  switch (role) {
    case "helpdesk":
      return "HelpDesk";
    case "seller":
      return "Seller";
    case "bidder":
    case "buyer":
      return "Buyer";
    default:
      return "User";
  }
}

function DashboardContent({ session }: { session: SessionData }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((err: ApiError) => setError(err.error ?? "Unable to load dashboard."));
  }, []);

  return (
    <AppShell email={session.email} role={session.role}>
      <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                Signed In
              </p>
              <h1 className="text-4xl font-semibold text-[#1e3a5f]">
                {roleLabel(session.role)} Dashboard
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                This dashboard now uses the backend session and JSON API instead of query-string
                placeholders. Existing routing is preserved while the frontend moves toward the
                decoupled architecture.
              </p>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Role
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {roleLabel(session.role)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Account
                </p>
                <p className="mt-3 break-all text-lg font-medium text-slate-900">
                  {session.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {data?.cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.6rem] bg-[#eff5fb] p-6">
            <h2 className="text-xl font-semibold text-[#1e3a5f]">Quick Links</h2>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/profile"
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Edit Profile
              </Link>
              <Link
                href="/requests"
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Request History
              </Link>
              {session.role === "helpdesk" ? (
                <Link
                  href="/helpdesk"
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Staff Ticket Queue
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <SessionPage>{(session) => <DashboardContent session={session} />}</SessionPage>;
}
