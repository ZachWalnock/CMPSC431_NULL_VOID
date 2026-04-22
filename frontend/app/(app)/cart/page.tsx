"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionResponse = {
  authenticated: boolean;
  email: string;
  role: string;
};

type CartItem = {
  seller_email: string;
  listing_id: number;
  category: string;
  auction_title: string;
  product_name: string;
  product_description: string;
  quantity: number;
  reserve_price: number;
  max_bids: number;
  status: number;
  added_at: string;
};

function formatAddedAt(value: string | null | undefined) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function CartPage() {
  const [role, setRole] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/session", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SessionResponse | null) => {
        setRole(data?.role ?? "");
      })
      .catch(() => {
        setRole("");
      });

    fetch("http://localhost:8000/api/cart", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.error ?? "Unable to load cart.");
          });
        }
        return res.json();
      })
      .then((data) => {
        setItems(data);
        setError("");
      })
      .catch((err) => {
        console.error("Failed to load cart:", err);
        setItems([]);
        setError(err instanceof Error ? err.message : "Unable to load cart.");
      });
  }, []);

  async function removeItem(item: CartItem) {
    const itemKey = `${item.seller_email}:${item.listing_id}`;
    setPendingKey(itemKey);
    setMessage("");
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/cart", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seller_email: item.seller_email,
          listing_id: item.listing_id,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove item.");
      }
      setItems((current) =>
        current.filter(
          (entry) =>
            !(entry.seller_email === item.seller_email && entry.listing_id === item.listing_id),
        ),
      );
      setMessage(`${item.product_name} removed from your cart.`);
    } catch (err) {
      console.error("Failed to remove item:", err);
      setError(err instanceof Error ? err.message : "Unable to remove item.");
    } finally {
      setPendingKey("");
    }
  }

  const totalReserve = items.reduce((sum, item) => sum + item.reserve_price, 0);

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", boxShadow: "0 6px 18px rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#2E5BFF", fontSize: "2rem", fontWeight: 700 }}>Your Cart</div>
            <div style={{ color: "#64748b", marginTop: "0.5rem" }}>
              Save auction listings you want to revisit before bidding.
            </div>
          </div>
          <Link
            href="/buyer_auction_page"
            style={{ background: "#2E5BFF", color: "#fff", textDecoration: "none", padding: "0.65rem 1.2rem", borderRadius: "999px", fontWeight: 600 }}
          >
            Browse More Listings
          </Link>
        </div>

        {role && role !== "buyer" && (
          <div style={{ marginTop: "1rem", background: "#fef3c7", color: "#92400e", padding: "0.85rem 1rem", borderRadius: "10px" }}>
            Only buyer accounts can use the cart.
          </div>
        )}
        {message && (
          <div style={{ marginTop: "1rem", background: "#dcfce7", color: "#166534", padding: "0.85rem 1rem", borderRadius: "10px" }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ marginTop: "1rem", background: "#fef2f2", color: "#b91c1c", padding: "0.85rem 1rem", borderRadius: "10px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ background: "#eff6ff", padding: "1rem 1.25rem", borderRadius: "12px", minWidth: "180px" }}>
            <div style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Items</div>
            <div style={{ color: "#0f172a", fontSize: "1.8rem", fontWeight: 700 }}>{items.length}</div>
          </div>
          <div style={{ background: "#eff6ff", padding: "1rem 1.25rem", borderRadius: "12px", minWidth: "180px" }}>
            <div style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reserve Total</div>
            <div style={{ color: "#0f172a", fontSize: "1.8rem", fontWeight: 700 }}>${totalReserve}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {items.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", boxShadow: "0 6px 18px rgba(15,23,42,0.08)", color: "#64748b" }}>
            Your cart is empty.
          </div>
        ) : (
          items.map((item) => {
            const itemKey = `${item.seller_email}:${item.listing_id}`;
            return (
              <div
                key={itemKey}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  marginBottom: "1rem",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#2E5BFF", fontWeight: 700 }}>{item.product_name}</div>
                    <div style={{ color: "#111827", fontSize: "1rem", marginTop: "0.35rem" }}>{item.auction_title}</div>
                    <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.35rem" }}>{item.product_description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={pendingKey === itemKey}
                    style={{
                      background: pendingKey === itemKey ? "#cbd5e1" : "#fff",
                      color: pendingKey === itemKey ? "#475569" : "#b91c1c",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      padding: "0.65rem 1rem",
                      fontWeight: 600,
                      cursor: pendingKey === itemKey ? "not-allowed" : "pointer",
                    }}
                  >
                    {pendingKey === itemKey ? "Removing..." : "Remove"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap", color: "#64748b", fontSize: "0.9rem" }}>
                  <div>Listing #{item.listing_id}</div>
                  <div>Category: {item.category}</div>
                  <div>Reserve: ${item.reserve_price}</div>
                  <div>Qty: {item.quantity}</div>
                  <div>Seller: {item.seller_email}</div>
                  <div>Added: {formatAddedAt(item.added_at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
