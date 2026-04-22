"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AuctionListingCard from "../components/auctionListingCard";

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
};

export default function AuctionPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category"); // e.g. "Basketball" or null

  const [top_listings, setTopListings] = useState<Listing[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/get_top_ten_items")
      .then((res) => res.json())
      .then((data) => setTopListings(data))
      .catch((err) => console.error("Failed to load listings:", err));
  }, []);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ color: "#2E5BFF", fontSize: "2rem", fontWeight: 700, padding: "2rem 2rem 0.5rem" }}>
        {category ? category : "Popular Listings"}
      </div>
      <div style={{ padding: "0.5rem 2rem" }}>
        {top_listings.length === 0 && (
          <p style={{ color: "#9ca3af", marginTop: "2rem" }}>No listings found.</p>
        )}
        {top_listings.map((top_listings) => (
          <AuctionListingCard
            key={top_listings.listing_id}
            listing_id={top_listings.listing_id}
            seller_email={top_listings.seller_email}
            category={top_listings.category}
            auction_title={top_listings.auction_title}
            product_name={top_listings.product_name}
            product_description={top_listings.product_description}
            quantity={top_listings.quantity}
            reserve_price={top_listings.reserve_price}
            max_bids={top_listings.max_bids}
            status={top_listings.status}
          />
        ))}
      </div>
    </div>
  );
}