"use client"
import Link from "next/link";
import { useEffect, useState } from "react"
type OrderCardProps = {
    listing_id: number;
    auction_title: string;
    product_name: string;
    product_description: string;
    status: string;
    bid_amount: number;
  };

export default function OrderCard({
    listing_id,
    auction_title,
    product_name,
    product_description,
    status,
    bid_amount
}: OrderCardProps) {
    return (
    <div
        style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            background: "#F8FAFF",
            border: "1px solid #E3E9F9",
            borderRadius: "10px",
            padding: "1rem 1.5rem",
            margin: "1rem 2rem"
        }}
    >
        <div style={{ fontWeight: 700, color: "#2E5BFF" }}>
            {product_name}
        </div>
        <div style={{ color: "#23282A", whiteSpace: "nowrap" }}>
            {product_description}
        </div>
        <div style={{ color: "#455565", whiteSpace: "nowrap" }}>
            <b>Bid:</b> ${bid_amount}
        </div>
        <div style={{ color: "#6A7AA3", whiteSpace: "nowrap" }}>
            <b>Status:</b> {status}
        </div>
        <div style={{ color: "#9EA7C7", whiteSpace: "nowrap", flex: 1 }}>
            <b>Auction:</b> {auction_title}
        </div>
        <Link href={`/orderdetails/${listing_id}`}>
            <button
                style={{
                    background: "#2E5BFF",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            > 
                View Order
            </button>
        </Link>
    </div>
    )
}