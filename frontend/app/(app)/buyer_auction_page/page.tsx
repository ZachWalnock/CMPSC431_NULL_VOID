"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import AuctionListingCard from "../../components/auctionListingCard";

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
  in_cart?: boolean;
};

type SessionResponse = {
  authenticated: boolean;
  email: string;
  role: string;
};

export default function AuctionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const category = searchParams.get("category") ?? "";
  const q = searchParams.get("q") ?? "";
  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";

  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);
  const [listings, setListings] = useState<Listing[]>([]);
  const [role, setRole] = useState("");
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
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);

    fetch(`http://localhost:8000/api/listings?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load listings.");
        }
        return res.json();
      })
      .then((data) => {
        setListings(data);
        setError("");
      })
      .catch((err) => {
        console.error("Failed to load listings:", err);
        setListings([]);
        setError("Unable to load listings.");
      });
  }, [category, q, minPrice, maxPrice]);

  function applyPriceFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (minInput) params.set("min_price", minInput);
    if (maxInput) params.set("max_price", maxInput);
    router.push(`/buyer_auction_page?${params.toString()}`);
  }

  function clearPriceFilter() {
    setMinInput("");
    setMaxInput("");
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    router.push(`/buyer_auction_page?${params.toString()}`);
  }

  async function addToCart(listing: Listing) {
    const itemKey = `${listing.seller_email}:${listing.listing_id}`;
    setPendingKey(itemKey);
    setError("");
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/cart", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seller_email: listing.seller_email,
          listing_id: listing.listing_id,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add item to cart.");
      }
      setListings((current) =>
        current.map((item) =>
          item.seller_email === listing.seller_email && item.listing_id === listing.listing_id
            ? { ...item, in_cart: true }
            : item,
        ),
      );
      setMessage(`${listing.product_name} added to your cart.`);
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setError(err instanceof Error ? err.message : "Unable to add item to cart.");
    } finally {
      setPendingKey("");
    }
  }

  const pageTitle = q ? `Results for "${q}"` : category ? category : "All Listings";

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh" }}>
      <div style={{ padding: "2rem 2rem 0.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "#2E5BFF", fontSize: "2rem", fontWeight: 700 }}>{pageTitle}</div>
          <Link
            href="/cart"
            style={{
              background: "#2E5BFF",
              color: "#fff",
              textDecoration: "none",
              padding: "0.65rem 1.2rem",
              borderRadius: "999px",
              fontWeight: 600,
            }}
          >
            View Your Cart
          </Link>
        </div>

        <form onSubmit={applyPriceFilter} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>Price range:</span>
          <input
            type="number" placeholder="Min $" value={minInput}
            onChange={(e) => setMinInput(e.target.value)} min={0}
            style={{ width: "100px", padding: "0.4rem 0.7rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem", color: "#111827" }}
          />
          <span style={{ color: "#9ca3af" }}>-</span>
          <input
            type="number" placeholder="Max $" value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)} min={0}
            style={{ width: "100px", padding: "0.4rem 0.7rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem", color: "#111827" }}
          />
          <button type="submit"
            style={{ padding: "0.4rem 1rem", background: "#2E5BFF", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            Apply
          </button>
          {(minPrice || maxPrice) && (
            <button type="button" onClick={clearPriceFilter}
              style={{ padding: "0.4rem 0.8rem", background: "none", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Clear
            </button>
          )}
        </form>

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
      </div>

      <div style={{ padding: "1rem 2rem" }}>
        {listings.length === 0 && (
          <p style={{ color: "#9ca3af", marginTop: "2rem" }}>No listings found.</p>
        )}
        {listings.map((listing) => {
          const itemKey = `${listing.seller_email}:${listing.listing_id}`;
          const disabled = role !== "buyer" || listing.in_cart || pendingKey === itemKey;

          return (
            <AuctionListingCard
              key={listing.listing_id}
              listing_id={listing.listing_id}
              seller_email={listing.seller_email}
              category={listing.category}
              auction_title={listing.auction_title}
              product_name={listing.product_name}
              product_description={listing.product_description}
              quantity={listing.quantity}
              reserve_price={listing.reserve_price}
              max_bids={listing.max_bids}
              status={listing.status}
              footer={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    {listing.in_cart ? "Already saved in your cart." : "Save this listing to revisit it later."}
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(listing)}
                    disabled={disabled}
                    style={{
                      background: disabled ? "#cbd5e1" : "#2E5BFF",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.65rem 1rem",
                      fontWeight: 600,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {pendingKey === itemKey ? "Adding..." : listing.in_cart ? "In Cart" : "Add to Cart"}
                  </button>
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
