"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { SessionPage, type SessionData } from "@/components/session-page";
import { apiFetch, type ApiError } from "@/lib/api";

type Ticket = {
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

type TicketResponse = {
  unassigned: Ticket[];
  assigned: Ticket[];
  completed: Ticket[];
};

function TicketColumn({
  title,
  tickets,
  actionLabel,
  onAction,
}: {
  title: string;
  tickets: Ticket[];
  actionLabel?: string;
  onAction?: (ticket: Ticket) => void;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {tickets.length}
        </span>
      </div>
      <div className="grid gap-4">
        {tickets.length ? (
          tickets.map((ticket) => (
            <div
              key={ticket.request_id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                {ticket.request_type}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{ticket.subject}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{ticket.description}</p>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <p>Requester: {ticket.requester_email}</p>
                <p>Assigned: {ticket.assigned_to}</p>
                <p>Created: {ticket.created_at ?? "N/A"}</p>
                {ticket.completed_at ? <p>Completed: {ticket.completed_at}</p> : null}
              </div>
              {actionLabel && onAction ? (
                <button
                  type="button"
                  onClick={() => onAction(ticket)}
                  className="mt-4 rounded-2xl bg-[#334d6e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#263c57]"
                >
                  {actionLabel}
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No tickets in this queue.</p>
        )}
      </div>
    </section>
  );
}

function HelpDeskContent({ session }: { session: SessionData }) {
  const [data, setData] = useState<TicketResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    try {
      const result = await apiFetch<TicketResponse>("/api/helpdesk/tickets");
      setData(result);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.error ?? "Unable to load the HelpDesk queue.");
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function claimTicket(ticket: Ticket) {
    setMessage(null);
    await apiFetch(`/api/helpdesk/tickets/${ticket.request_id}/claim`, {
      method: "POST",
    });
    setMessage(`Claimed ticket #${ticket.request_id}.`);
    void loadTickets();
  }

  async function resolveTicket(ticket: Ticket) {
    setMessage(null);
    await apiFetch(`/api/helpdesk/tickets/${ticket.request_id}/resolve`, {
      method: "POST",
    });
    setMessage(`Resolved ticket #${ticket.request_id}.`);
    void loadTickets();
  }

  if (session.role !== "helpdesk") {
    return (
      <AppShell email={session.email} role={session.role}>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          HelpDesk access is required for this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell email={session.email} role={session.role}>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <h1 className="text-3xl font-semibold text-[#1e3a5f]">HelpDesk Queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Review the shared team inbox, claim tickets into your assigned queue, and resolve them
            with a completion timestamp. This route preserves the existing login flow while adding
            the support system from the migration plan.
          </p>
          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
        </section>

        {data ? (
          <div className="grid gap-6 xl:grid-cols-3">
            <TicketColumn
              title="Unassigned Queue"
              tickets={data.unassigned}
              actionLabel="Claim Ticket"
              onAction={claimTicket}
            />
            <TicketColumn
              title="Assigned To Me"
              tickets={data.assigned}
              actionLabel="Resolve Ticket"
              onAction={resolveTicket}
            />
            <TicketColumn title="Completed" tickets={data.completed} />
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            Loading ticket data...
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function HelpDeskPage() {
  return <SessionPage>{(session) => <HelpDeskContent session={session} />}</SessionPage>;
}
