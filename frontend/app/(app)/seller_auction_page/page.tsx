"use client";
import { useState } from "react";
import AuctionListingCard from "../../components/auctionListingCard";

const auction_listings = [
  {
    listing_id: 747,
    seller_email: "wspadelli8j@lsu.edu",
    category: "Bakery & Bread",
    auction_title: "Freshness Guaranteed Steak Rolls",
    product_name: "Steak Rolls",
    product_description: "Yummy Rolls",
    quantity: 5,
    reserve_price: 50,
    max_bids: 3,
    status: 1
  },
  {
    listing_id: 2513,
    seller_email: "wspadelli8j@lsu.edu",
    category: "Bakery & Bread",
    auction_title: "Freshness Guaranteed Steak Rolls",
    product_name: "Steak Rolls",
    product_description: "Yummy Rolls",
    quantity: 5,
    reserve_price: 50,
    max_bids: 3,
    status: 1
  }, 
  {
    listing_id: 2513,
    seller_email: "wspadelli8j@lsu.edu",
    category: "Bakery & Bread",
    auction_title: "Freshness Guaranteed Regular Rolls",
    product_name: "Regular Rolls",
    product_description: "Yummy Rolls",
    quantity: 5,
    reserve_price: 50,
    max_bids: 3,
    status: 0
  }, 
  {
    listing_id: 2513,
    seller_email: "wspadelli8j@lsu.edu",
    category: "Bakery & Bread",
    auction_title: "Freshness Guaranteed Pizza Rolls",
    product_name: "Pizza Rolls",
    product_description: "Yummy Rolls",
    quantity: 5,
    reserve_price: 50,
    max_bids: 3,
    status: 2
  }
];

const tabs = [
  { label: "Active", value: 1 },
  { label: "Inactive", value: 0 },
  { label: "Sold", value: 2 },
];

export default function SellerPage() {
  const [activeTab, setActiveTab] = useState(1);
  const visible = auction_listings.filter((l) => l.status === activeTab);

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh" }}>
      <div style={{ padding: "2rem 2rem 0.5rem" }}>
        <div style={{ color: "#2E5BFF", fontSize: "2rem", fontWeight: 700 }}>Seller Dashboard</div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
          {tabs.map((tab) => {
            const count = auction_listings.filter((l) => l.status === tab.value).length;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  padding: "0.4rem 1.1rem",
                  borderRadius: "999px",
                  border: isActive ? "none" : "1px solid #d1d5db",
                  background: isActive ? "#2E5BFF" : "#ffffff",
                  color: isActive ? "#ffffff" : "#6b7280",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {tab.label}
                <span
                  style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                    color: isActive ? "#fff" : "#6b7280",
                    borderRadius: "999px",
                    padding: "0 7px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "1rem 2rem" }}>
        {visible.length === 0 ? (
          <div style={{ color: "#9ca3af", textAlign: "center", marginTop: "3rem", fontSize: "0.95rem" }}>
            No {tabs.find((t) => t.value === activeTab)?.label.toLowerCase()} listings.
          </div>
        ) : (
          visible.map((listing) => (
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
            />
          ))
        )}
      </div>
    </div>
  );
}
