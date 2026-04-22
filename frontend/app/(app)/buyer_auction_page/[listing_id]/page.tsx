"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type ListingDetail = {
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
  highest_bid: number | null;
  last_bidder_email: string | null;
};

// Hardcoded until session/auth is wired up
const CURRENT_USER = "testbidder@lsu.edu";

export default function ListingDetailPage() {
  const { listing_id } = useParams();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState<{ text: string; accepted: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  function fetchListing() {
    fetch(`http://localhost:8000/api/listing/${listing_id}`)
      .then((res) => res.json())
      .then((data) => setListing(data))
      .catch((err) => console.error("Failed to load listing:", err));
  }

  useEffect(() => {
    fetchListing();
  }, [listing_id]);

  async function handleBid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!listing) return;
    setLoading(true);
    setMessage(null);

    const res = await fetch(`http://localhost:8000/api/listing/${listing_id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidder_email: CURRENT_USER, bid_price: Number(bidAmount) }),
    });
    const data = await res.json();
    setMessage({ text: data.reason, accepted: data.accepted });

    if (data.accepted) {
      setBidAmount("");
      fetchListing();
    }
    setLoading(false);
  }

  if (!listing) {
    return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;
  }

  const isEnded = listing.status !== 1;
  const isLastBidder = listing.last_bidder_email === CURRENT_USER;
  const minBid = listing.highest_bid !== null ? listing.highest_bid + 1 : listing.reserve_price;
  const bidsRemaining = listing.max_bids - listing.bid_count;

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", padding: "2rem" }}>
      {/* Header card */}
      <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.3rem", color: "#111827" }}>{listing.product_name}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "2px" }}>{listing.category} · Sold by {listing.seller_email}</div>
          </div>
          <span style={{
            fontSize: "0.75rem", fontWeight: 600, padding: "3px 12px", borderRadius: "999px",
            background: isEnded ? "#f3f4f6" : "#dcfce7",
            color: isEnded ? "#6b7280" : "#16a34a",
          }}>
            {isEnded ? "Ended" : "Active"}
          </span>
        </div>
        <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#374151" }}>{listing.product_description}</div>
      </div>

      {/* Bid stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Current high bid", value: listing.highest_bid !== null ? `$${listing.highest_bid}` : "No bids yet" },
          { label: "Reserve price",    value: `$${listing.reserve_price}` },
          { label: "Bids placed",      value: `${listing.bid_count} / ${listing.max_bids}` },
          { label: "Bids remaining",   value: String(bidsRemaining) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "10px", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827", marginTop: "4px" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bid form card */}
      <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: "1rem" }}>Place your bid</div>

        {/* Minimum bid info */}
          Minimum bid: <strong>${minBid}</strong>
          {listing.highest_bid !== null ? " (current high bid + $1)" : " (reserve price)"}

        {/* Turn-taking warning */}
        {isLastBidder && !isEnded && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.85rem", color: "#92400e", marginBottom: "1rem" }}>
            You are the highest bidder. Wait for another bidder before bidding again.
          </div>
        )}

        {isEnded ? (
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>This auction has ended.</div>
        ) : (
          <form onSubmit={handleBid} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: "4px" }}>Your bid ($)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>$</span>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={String(minBid)}
                  min={minBid}
                  step="1"
                  required
                  style={{ paddingLeft: "1.5rem", paddingRight: "0.75rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", width: "160px", color: "#111827" }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || isLastBidder}
              style={{
                background: isLastBidder ? "#e5e7eb" : "#2E5BFF",
                color: isLastBidder ? "#9ca3af" : "#fff",
                border: "none", borderRadius: "8px",
                padding: "0.55rem 1.4rem", fontWeight: 600, fontSize: "0.9rem",
                cursor: isLastBidder ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Placing..." : "Place bid"}
            </button>
          </form>
        )}

        {/* Result message */}
        {message && (
          <div style={{
            marginTop: "1rem", padding: "0.65rem 1rem", borderRadius: "8px", fontSize: "0.875rem",
            background: message.accepted ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${message.accepted ? "#bbf7d0" : "#fecaca"}`,
            color: message.accepted ? "#15803d" : "#b91c1c",
          }}>
            {message.accepted ? "✓ " : "✗ "}{message.text}
          </div>
        )}
      </div>
    </div>
  );
}
