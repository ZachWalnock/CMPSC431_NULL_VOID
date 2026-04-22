"use client";
import { useState, useEffect } from "react";

type Listing = {
  listing_id: number;
  seller_email: string;
  category: string;
  auction_title: string;
  product_name: string;
  product_description: string;
  quantity: number;
  reserve_price: number;
  max_bids: number;
  status: number;
  bid_count: number;
};

const TABS = [
  { label: "Active", value: 1 },
  { label: "Inactive", value: 0 },
  { label: "Sold", value: 2 },
];

const emptyForm = {
  auction_title: "", product_name: "", product_description: "",
  category: "", reserve_price: "", max_bids: "", quantity: "1",
};

export default function SellerPage() {
  const [role, setRole] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState(1);

  // create / edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formMsg, setFormMsg] = useState("");

  // remove modal
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeMsg, setRemoveMsg] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRole(d.role ?? null));
  }, []);

  useEffect(() => {
    if (role === "seller") loadListings();
  }, [role]);

  function loadListings() {
    fetch("http://localhost:8000/api/seller/listings", { credentials: "include" })
      .then((r) => r.json())
      .then(setListings);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormMsg("");
    setShowForm(true);
  }

  function openEdit(l: Listing) {
    setEditingId(l.listing_id);
    setForm({
      auction_title: l.auction_title,
      product_name: l.product_name,
      product_description: l.product_description,
      category: l.category,
      reserve_price: String(l.reserve_price),
      max_bids: String(l.max_bids),
      quantity: String(l.quantity),
    });
    setFormMsg("");
    setShowForm(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg("");
    const payload = {
      ...form,
      reserve_price: Number(form.reserve_price),
      max_bids: Number(form.max_bids),
      quantity: Number(form.quantity),
    };
    const url = editingId !== null
      ? `http://localhost:8000/api/seller/listings/${editingId}`
      : "http://localhost:8000/api/seller/listings";
    const method = editingId !== null ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setFormMsg(data.error || "Failed."); return; }
    setShowForm(false);
    loadListings();
  }

  async function handleRemove() {
    if (!removeReason.trim()) { setRemoveMsg("Please enter a reason."); return; }
    const res = await fetch(`http://localhost:8000/api/seller/listings/${removingId}/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason: removeReason }),
    });
    const data = await res.json();
    if (!res.ok) { setRemoveMsg(data.error || "Failed."); return; }
    setRemovingId(null);
    setRemoveReason("");
    loadListings();
  }

  if (role === null) return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;
  if (role !== "seller") return (
    <div style={{ padding: "2rem" }}>
      <div style={{ color: "#b91c1c", fontSize: "1.1rem", fontWeight: 600 }}>Access Denied</div>
      <div style={{ color: "#6b7280", marginTop: "0.5rem" }}>Only sellers can access this dashboard.</div>
    </div>
  );

  const visible = listings.filter((l) => l.status === activeTab);

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh" }}>
      <div style={{ padding: "2rem 2rem 0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#2E5BFF", fontSize: "2rem", fontWeight: 700 }}>Seller Dashboard</div>
          <button
            onClick={openCreate}
            style={{ background: "#2E5BFF", color: "#fff", border: "none", borderRadius: "8px", padding: "0.55rem 1.25rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >
            + New Listing
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
          {TABS.map((tab) => {
            const count = listings.filter((l) => l.status === tab.value).length;
            const isActive = activeTab === tab.value;
            return (
              <button key={tab.value} onClick={() => setActiveTab(tab.value)} style={{
                padding: "0.4rem 1.1rem", borderRadius: "999px",
                border: isActive ? "none" : "1px solid #d1d5db",
                background: isActive ? "#2E5BFF" : "#ffffff",
                color: isActive ? "#ffffff" : "#6b7280",
                fontWeight: 600, fontSize: "0.85rem",
                display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer",
              }}>
                {tab.label}
                <span style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                  color: isActive ? "#fff" : "#6b7280",
                  borderRadius: "999px", padding: "0 7px", fontSize: "0.75rem", fontWeight: 700,
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listing cards */}
      <div style={{ padding: "1rem 2rem" }}>
        {visible.length === 0 ? (
          <div style={{ color: "#9ca3af", textAlign: "center", marginTop: "3rem", fontSize: "0.95rem" }}>
            No {TABS.find((t) => t.value === activeTab)?.label.toLowerCase()} listings.
          </div>
        ) : visible.map((l) => {
          const canEdit = l.status !== 2 && l.bid_count === 0;
          const hasBids = l.status === 1 && l.bid_count > 0;
          return (
            <div key={l.listing_id} style={{
              background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px",
              padding: "1.25rem 1.5rem", margin: "0.5rem 0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{l.product_name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "2px" }}>{l.category}</div>
                </div>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 600, padding: "2px 10px", borderRadius: "999px",
                  background: l.status === 1 ? "#dcfce7" : l.status === 2 ? "#fef3c7" : "#f3f4f6",
                  color: l.status === 1 ? "#16a34a" : l.status === 2 ? "#b45309" : "#6b7280",
                }}>
                  {l.status === 1 ? "Active" : l.status === 2 ? "Sold" : "Inactive"}
                </span>
              </div>

              <div style={{ fontSize: "0.85rem", color: "#374151", margin: "0.4rem 0" }}>{l.product_description}</div>

              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.8rem", color: "#6b7280" }}>
                <span>Reserve: <strong style={{ color: "#111827" }}>${l.reserve_price}</strong></span>
                <span>Max bids: <strong style={{ color: "#111827" }}>{l.max_bids}</strong></span>
                <span>Qty: <strong style={{ color: "#111827" }}>{l.quantity}</strong></span>
                <span>Bids: <strong style={{ color: "#111827" }}>{l.bid_count}</strong></span>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", alignItems: "center" }}>
                {canEdit && (
                  <button onClick={() => openEdit(l)} style={{
                    fontSize: "0.8rem", padding: "0.35rem 0.9rem", border: "1px solid #d1d5db",
                    borderRadius: "6px", background: "#fff", color: "#374151", cursor: "pointer",
                  }}>Edit</button>
                )}
                {hasBids && (
                  <span style={{ fontSize: "0.78rem", color: "#b45309" }}>
                    Cannot edit — bidding has started.
                  </span>
                )}
                {l.status === 1 && (
                  <button onClick={() => { setRemovingId(l.listing_id); setRemoveReason(""); setRemoveMsg(""); }} style={{
                    fontSize: "0.8rem", padding: "0.35rem 0.9rem", border: "1px solid #fca5a5",
                    borderRadius: "6px", background: "#fff", color: "#b91c1c", cursor: "pointer",
                  }}>Remove</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", width: "480px", maxWidth: "95vw" }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827", marginBottom: "1.25rem" }}>
              {editingId !== null ? "Edit Listing" : "New Listing"}
            </div>
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {([
                ["auction_title", "Auction Title"],
                ["product_name", "Product Name"],
                ["product_description", "Description"],
                ["category", "Category"],
                ["reserve_price", "Reserve Price ($)"],
                ["max_bids", "Max Bids"],
                ["quantity", "Quantity"],
              ] as [keyof typeof emptyForm, string][]).map(([key, label]) => (
                <div key={key}>
                  <label style={{ fontSize: "0.78rem", color: "#6b7280", display: "block", marginBottom: "3px" }}>{label}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required
                    type={["reserve_price", "max_bids", "quantity"].includes(key) ? "number" : "text"}
                    min={1}
                    style={{ width: "100%", padding: "0.45rem 0.7rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.9rem", color: "#111827", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              {formMsg && <div style={{ color: "#b91c1c", fontSize: "0.85rem" }}>{formMsg}</div>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                <button type="submit" style={{ flex: 1, background: "#2E5BFF", color: "#fff", border: "none", borderRadius: "8px", padding: "0.6rem", fontWeight: 600, cursor: "pointer" }}>
                  {editingId !== null ? "Save changes" : "Publish"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", padding: "0.6rem", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove modal */}
      {removingId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", width: "400px", maxWidth: "95vw" }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827", marginBottom: "0.75rem" }}>Remove Listing</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1rem" }}>
              This will take the listing off the market. Please provide a reason.
            </div>
            <textarea
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Reason for removal..."
              rows={3}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.9rem", color: "#111827", boxSizing: "border-box", resize: "vertical" }}
            />
            {removeMsg && <div style={{ color: "#b91c1c", fontSize: "0.85rem", marginTop: "0.5rem" }}>{removeMsg}</div>}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={handleRemove} style={{ flex: 1, background: "#b91c1c", color: "#fff", border: "none", borderRadius: "8px", padding: "0.6rem", fontWeight: 600, cursor: "pointer" }}>
                Confirm Remove
              </button>
              <button onClick={() => setRemovingId(null)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", padding: "0.6rem", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
