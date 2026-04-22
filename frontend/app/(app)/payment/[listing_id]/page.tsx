"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type SavedCard = {
  card_token: string;
  card_type: string;
  expire_month: number;
  expire_year: number;
  last_four_digits: string;
};

type PaymentPageData = {
  listing: {
    product_name: string;
    auction_title: string;
    seller_email: string;
  };
  winning_bid: number;
  saved_cards: SavedCard[];
};

export default function PaymentPage() {
  const { listing_id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<PaymentPageData | null>(null);
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<string>("new");
  const [form, setForm] = useState({ card_token: "", card_type: "", expire_month: "", expire_year: "", security_code: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!listing_id) return;
    fetch(`http://localhost:8000/api/payment/${listing_id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        if (d.saved_cards?.length > 0) setSelectedCard(d.saved_cards[0].card_token);
      });
  }, [listing_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    let payload;
    if (selectedCard !== "new") {
      const card = data!.saved_cards.find((c) => c.card_token === selectedCard)!;
      payload = { card_token: card.card_token, card_type: card.card_type, expire_month: card.expire_month, expire_year: card.expire_year, security_code: form.security_code };
    } else {
      payload = {
        card_token: form.card_token,
        card_type: form.card_type,
        expire_month: Number(form.expire_month),
        expire_year: Number(form.expire_year),
        security_code: form.security_code,
      };
    }
    const res = await fetch(`http://localhost:8000/api/payment/${listing_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) { setError(result.error || "Payment failed."); setSubmitting(false); return; }
    setSuccessMsg("Payment successful! Your order has been placed.");
    setTimeout(() => router.push("/orders"), 2000);
  }

  if (error && !data) return (
    <div style={{ padding: "2rem" }}>
      <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div>
    </div>
  );
  if (!data) return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;

  const { listing, winning_bid, saved_cards } = data;

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111827", marginBottom: "1.5rem" }}>Complete Payment</div>

        {/* Order summary */}
        <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.75rem" }}>Order Summary</div>
          <div style={{ fontSize: "0.95rem", color: "#374151" }}>{listing.product_name}</div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "2px" }}>Seller: {listing.seller_email}</div>
          <div style={{ marginTop: "0.75rem", fontSize: "1.2rem", fontWeight: 700, color: "#2E5BFF" }}>
            Total: ${winning_bid}
          </div>
        </div>

        {/* Payment form */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem" }}>
            <div style={{ fontWeight: 600, color: "#111827", marginBottom: "1rem" }}>Payment Method</div>

            {/* Saved cards */}
            {saved_cards.length > 0 && (
              <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {saved_cards.map((card) => (
                  <label key={card.card_token} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.9rem", color: "#374151" }}>
                    <input type="radio" name="card" value={card.card_token} checked={selectedCard === card.card_token} onChange={() => setSelectedCard(card.card_token)} />
                    {card.card_type} ending in {card.last_four_digits} — exp {card.expire_month}/{card.expire_year}
                  </label>
                ))}
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.9rem", color: "#374151" }}>
                  <input type="radio" name="card" value="new" checked={selectedCard === "new"} onChange={() => setSelectedCard("new")} />
                  Use a new card
                </label>
              </div>
            )}

            {/* New card fields */}
            {(selectedCard === "new" || saved_cards.length === 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1rem" }}>
                {([
                  ["card_token", "Card Number"],
                  ["card_type", "Card Type (Visa, Mastercard, etc.)"],
                  ["expire_month", "Expiry Month (1–12)"],
                  ["expire_year", "Expiry Year"],
                ] as [keyof typeof form, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label style={{ fontSize: "0.78rem", color: "#6b7280", display: "block", marginBottom: "3px" }}>{label}</label>
                    <input
                      value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required type={["expire_month", "expire_year"].includes(key) ? "number" : "text"}
                      style={{ width: "100%", padding: "0.45rem 0.7rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.9rem", color: "#111827", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Security code always required */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.78rem", color: "#6b7280", display: "block", marginBottom: "3px" }}>Security Code (CVV)</label>
              <input
                type="password" value={form.security_code} onChange={(e) => setForm({ ...form, security_code: e.target.value })}
                required maxLength={4}
                style={{ width: "80px", padding: "0.45rem 0.7rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.9rem", color: "#111827" }}
              />
            </div>

            {error && <div style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</div>}
            {successMsg && <div style={{ color: "#16a34a", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{successMsg}</div>}

            <button type="submit" disabled={submitting} style={{
              width: "100%", background: "#2E5BFF", color: "#fff", border: "none",
              borderRadius: "8px", padding: "0.7rem", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer",
            }}>
              {submitting ? "Processing..." : `Pay $${winning_bid}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
