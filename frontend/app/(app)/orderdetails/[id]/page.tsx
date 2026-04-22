"use client";
import Link from "next/link";
import React, { useEffect, useState, use } from "react";

type Details = {
  seller_email: string;
  listing_id: number;
  category: string;
  auction_title: string;
  product_name: string;
  product_description: string;
  quantity: number;
  reserve_price: number;
  status: number;
};

export default function OrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [orderDetails, setOrderDetails] = useState<Details | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingDesc, setRatingDesc] = useState("");
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [existingRating, setExistingRating] = useState<{ rating: number; rating_desc: string } | null>(null);
  const [ratingMsg, setRatingMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/get_order_details?bid_id=${id}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => setOrderDetails(data));

    fetch(`http://localhost:8000/api/rating/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.already_rated) {
          setAlreadyRated(true);
          setExistingRating({ rating: data.rating, rating_desc: data.rating_desc });
        }
      });
  }, [id]);

  async function handleRatingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setRatingMsg("");
    const res = await fetch(`http://localhost:8000/api/rating/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rating: ratingValue, rating_desc: ratingDesc }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRatingMsg(data.error || "Failed to submit rating.");
    } else {
      setAlreadyRated(true);
      setExistingRating({ rating: ratingValue, rating_desc: ratingDesc });
      setRatingMsg("Rating submitted!");
    }
    setSubmitting(false);
  }

  if (!orderDetails) return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;

  const isPaid = orderDetails.status === 2;

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ color: "#2E5BFF", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          {orderDetails.product_name} — Order Details
        </div>
        <Link href="/orders" style={{ color: "#6b7280", fontSize: "0.85rem" }}>
          ← Back to orders
        </Link>

        {/* Receipt */}
        <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginTop: "1.25rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: "1rem" }}>Order Receipt</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem 2rem", fontSize: "0.9rem", color: "#374151" }}>
            <div><strong>Order ID:</strong> {id}</div>
            <div><strong>Product:</strong> {orderDetails.product_name}</div>
            <div><strong>Auction:</strong> {orderDetails.auction_title}</div>
            <div><strong>Category:</strong> {orderDetails.category}</div>
            <div><strong>Seller:</strong> {orderDetails.seller_email}</div>
            <div><strong>Quantity:</strong> {orderDetails.quantity}</div>
            <div><strong>Reserve Price:</strong> ${orderDetails.reserve_price}</div>
            <div>
              <strong>Status:</strong>{" "}
              <span style={{ color: isPaid ? "#16a34a" : "#b45309" }}>
                {isPaid ? "Paid" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Rating section — only for paid orders */}
        {isPaid && (
          <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginTop: "1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: "0.75rem" }}>Rate the Seller</div>

            {alreadyRated ? (
              <div style={{ fontSize: "0.9rem", color: "#374151" }}>
                <div style={{ color: "#16a34a", fontWeight: 600, marginBottom: "0.4rem" }}>✓ You rated this seller</div>
                <div>Stars: {"★".repeat(existingRating?.rating ?? 0)}{"☆".repeat(5 - (existingRating?.rating ?? 0))}</div>
                {existingRating?.rating_desc && <div style={{ marginTop: "0.25rem", color: "#6b7280" }}>{existingRating.rating_desc}</div>}
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>Stars (1–5)</label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRatingValue(n)}
                        style={{
                          fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer",
                          color: n <= ratingValue ? "#f59e0b" : "#d1d5db",
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>Feedback (optional)</label>
                  <textarea
                    value={ratingDesc}
                    onChange={(e) => setRatingDesc(e.target.value)}
                    placeholder="Write your feedback here..."
                    rows={3}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.9rem", color: "#111827", boxSizing: "border-box", resize: "vertical" }}
                  />
                </div>
                {ratingMsg && (
                  <div style={{ fontSize: "0.85rem", color: ratingMsg === "Rating submitted!" ? "#16a34a" : "#b91c1c" }}>{ratingMsg}</div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: "#2E5BFF", color: "#fff", border: "none", borderRadius: "8px", padding: "0.6rem 1.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}
                >
                  {submitting ? "Submitting..." : "Submit Rating"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
