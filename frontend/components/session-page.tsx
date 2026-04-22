"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, type ApiError } from "@/lib/api";

export type SessionData = {
  authenticated: boolean;
  email: string;
  role: string;
};

type SessionError = ApiError & Partial<SessionData>;

type SessionPageProps = {
  children: (session: SessionData) => React.ReactNode;
};

export function SessionPage({ children }: SessionPageProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch<SessionData>("/api/session")
      .then((data) => {
        if (active) {
          setSession(data);
        }
      })
      .catch((err: SessionError) => {
        if (!active) return;
        if (err?.error || err?.errors || err?.authenticated === false) {
          router.replace("/");
          return;
        }
        setError("Unable to load your session.");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
        Loading...
      </div>
    );
  }

  return <>{children(session)}</>;
}
