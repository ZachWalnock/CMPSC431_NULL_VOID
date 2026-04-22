"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { SessionPage, type SessionData } from "@/components/session-page";
import { apiFetch, type ApiError } from "@/lib/api";

type RequestRow = {
  request_id: number;
  requester_email: string;
  request_type: string;
  subject: string;
  description: string;
  status: string;
  assigned_to: string;
  created_at: string | null;
  completed_at: string | null;
};

function RequestsContent({ session }: { session: SessionData }) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    request_type: "ChangeID",
    subject: "",
    description: "",
  });

  async function loadRequests() {
    try {
      const result = await apiFetch<{ requests: RequestRow[] }>("/api/requests");
      setRequests(result.requests);
    } catch {
      setMessage("Unable to load request history.");
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage(null);

    try {
      await apiFetch<{ success: boolean }>("/api/requests", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ request_type: "ChangeID", subject: "", description: "" });
      setMessage("HelpDesk request submitted successfully.");
      void loadRequests();
    } catch (err) {
      const apiError = err as ApiError;
      setErrors(apiError.errors ?? {});
      setMessage(apiError.error ?? null);
    }
  }

  return (
    <AppShell email={session.email} role={session.role}>
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <h1 className="text-3xl font-semibold text-[#1e3a5f]">Support Requests</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Submit administrative requests for changing user IDs, adding categories, or
            requesting market analysis. HelpDesk staff can only view history here.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {message}
            </div>
          ) : null}

          {session.role !== "helpdesk" ? (
            <form onSubmit={submitRequest} className="mt-6 space-y-4">
              <Field
                label="Request Type"
                as="select"
                value={form.request_type}
                onChange={(value) => setForm((current) => ({ ...current, request_type: value }))}
              >
                <option value="ChangeID">Changing user IDs</option>
                <option value="AddCategory">Adding new product categories</option>
                <option value="MarketAnalysis">Performing market analysis</option>
              </Field>
              <Field
                label="Subject"
                value={form.subject}
                onChange={(value) => setForm((current) => ({ ...current, subject: value }))}
                error={errors.subject}
              />
              <Field
                label="Description"
                as="textarea"
                value={form.description}
                onChange={(value) =>
                  setForm((current) => ({ ...current, description: value }))
                }
                error={errors.description}
              />
              <button
                type="submit"
                className="rounded-2xl bg-[#334d6e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263c57]"
              >
                Submit Request
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              HelpDesk staff do not submit user-facing support tickets from this screen.
            </div>
          )}
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <h2 className="text-2xl font-semibold text-slate-900">Ticket History</h2>
          <div className="mt-6 grid gap-4">
            {requests.length ? (
              requests.map((ticket) => (
                <div
                  key={ticket.request_id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                        {ticket.request_type}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">
                        {ticket.subject}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{ticket.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Assigned: {ticket.assigned_to || "helpdeskteam@lsu.edu"}</span>
                    <span>Created: {ticket.created_at ?? "N/A"}</span>
                    {ticket.completed_at ? <span>Completed: {ticket.completed_at}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No support requests found.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  as = "input",
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  as?: "input" | "textarea" | "select";
  children?: React.ReactNode;
}) {
  const sharedClassName =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#334d6e] focus:bg-white focus:ring-4 focus:ring-[#334d6e]/10";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${sharedClassName} min-h-32 resize-y`}
        />
      ) : as === "select" ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={sharedClassName}
        >
          {children}
        </select>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={sharedClassName}
        />
      )}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

export default function RequestsPage() {
  return <SessionPage>{(session) => <RequestsContent session={session} />}</SessionPage>;
}
