"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

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
  winner_email: string | null;
  successful: boolean | null;
  seller_avg_rating: number | null;
  seller_rating_count: number;
};

function getCurrentUser(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)nittany_user=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function ListingDetailPage() {
  const currentUser = getCurrentUser();
  const { listing_id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState<{ text: string; accepted: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  function fetchListing() {
    fetch(`http://localhost:8000/api/listing/${listing_id}`)
      .then((res) => res.json())
      .then(setListing)
      .catch((err) => console.error("Failed to load listing:", err));
  }

  useEffect(() => { fetchListing(); }, [listing_id]);

  async function handleBid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!listing) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`http://localhost:8000/api/listing/${listing_id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ bidder_email: currentUser, bid_price: Number(bidAmount) }),
    });
    const data = await res.json();
    setMessage({ text: data.reason, accepted: data.accepted });
    if (data.accepted) {
      setBidAmount("");
      fetchListing();
    }
    setLoading(false);
  }

  if (!listing) return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;

  const isActive = listing.status === 1;
  const isLastBidder = listing.last_bidder_email === currentUser;
  const minBid = listing.highest_bid !== null ? listing.highest_bid + 1 : listing.reserve_price;
  const bidsRemaining = listing.max_bids - listing.bid_count;
  const iWon = !isActive && listing.winner_email === currentUser && listing.successful;
  const iLost = !isActive && listing.winner_email !== null && listing.winner_email !== currentUser;
  const isUnsuccessful = !isActive && listing.successful === false;
  const alreadyPaid = listing.status === 2;

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", padding: "2rem" }}>

      {/* Header */}
      <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.3rem", color: "#111827" }}>{listing.product_name}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "2px" }}>
              {listing.category} · Sold by {listing.seller_email}
              {listing.seller_avg_rating !== null && (
                <span style={{ marginLeft: "0.5rem", color: "#f59e0b" }}>
                  {"★".repeat(Math.round(listing.seller_avg_rating))}{"☆".repeat(5 - Math.round(listing.seller_avg_rating))}
                  <span style={{ color: "#6b7280", marginLeft: "3px" }}>({listing.seller_avg_rating} · {listing.seller_rating_count} reviews)</span>
                </span>
              )}
            </div>
          </div>
          <span style={{
            fontSize: "0.75rem", fontWeight: 600, padding: "3px 12px", borderRadius: "999px",
            background: isActive ? "#dcfce7" : alreadyPaid ? "#fef3c7" : "#f3f4f6",
            color: isActive ? "#16a34a" : alreadyPaid ? "#b45309" : "#6b7280",
          }}>
            {isActive ? "Active" : alreadyPaid ? "Sold" : "Ended"}
          </span>
        </div>
        <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#374151" }}>{listing.product_description}</div>
      </div>

      {/* Stats */}
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

      {/* Result / bid area */}
      <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem" }}>
        {isActive ? (
          <>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: "0.75rem" }}>Place your bid</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.75rem" }}>
              Minimum bid: <strong style={{ color: "#111827" }}>${minBid}</strong>
              {listing.highest_bid !== null ? " (current high bid + $1)" : " (reserve price)"}
            </div>
            {isLastBidder && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.85rem", color: "#92400e", marginBottom: "0.75rem" }}>
                You are the highest bidder. Wait for another bidder before bidding again.
              </div>
            )}
            <form onSubmit={handleBid} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: "4px" }}>Your bid ($)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>$</span>
                  <input
                    type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={String(minBid)} min={minBid} step="1" required
                    style={{ paddingLeft: "1.5rem", paddingRight: "0.75rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", width: "160px", color: "#111827" }}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || isLastBidder} style={{
                background: isLastBidder ? "#e5e7eb" : "#2E5BFF",
                color: isLastBidder ? "#9ca3af" : "#fff",
                border: "none", borderRadius: "8px", padding: "0.55rem 1.4rem",
                fontWeight: 600, fontSize: "0.9rem", cursor: isLastBidder ? "not-allowed" : "pointer",
              }}>
                {loading ? "Placing..." : "Place bid"}
              </button>
            </form>
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
          </>
        ) : iWon && !alreadyPaid ? (
          /* Winner — awaiting payment */
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a", marginBottom: "0.5rem" }}>🎉 You won this auction!</div>
            <div style={{ fontSize: "0.9rem", color: "#374151", marginBottom: "1.25rem" }}>
              Your winning bid: <strong>${listing.highest_bid}</strong>. Complete your purchase to finalize the transaction.
            </div>
            <button onClick={() => router.push(`/payment/${listing.listing_id}`)} style={{
              background: "#2E5BFF", color: "#fff", border: "none", borderRadius: "8px",
              padding: "0.65rem 1.6rem", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer",
            }}>
              Proceed to Payment
            </button>
          </div>
        ) : alreadyPaid && iWon ? (
          <div style={{ color: "#16a34a", fontWeight: 600 }}>✓ Payment complete. Thank you for your purchase!</div>
        ) : alreadyPaid ? (
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>This auction has been sold.</div>
        ) : isUnsuccessful ? (
          <div>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: "0.25rem" }}>Auction unsuccessful</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>The reserve price was not met. This listing is no longer available.</div>
          </div>
        ) : iLost ? (
          <div>
            <div style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Auction ended</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Winner: <strong>{listing.winner_email}</strong> with a bid of <strong>${listing.highest_bid}</strong>.
            </div>
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>This auction has ended.</div>
        )}
      </div>
    </div>
  );
}
