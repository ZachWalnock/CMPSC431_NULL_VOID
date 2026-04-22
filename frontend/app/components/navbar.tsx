//TODO REPLACE
import React from "react";
import Link from "next/link";
export default function Navbar() {
  return (
    <nav
      style={{
        background: "#fff",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        fontFamily: "inherit",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >

      <div style={{ fontWeight: 700, fontSize: "1.35rem", color: "#2E5BFF" }}>
        NittanyAuction
      </div>


      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link
          href="/buyer_auction_page"
          style={{
            color: "#2E5BFF",
            fontWeight: 500,
            fontSize: "1rem",
            padding: "0.5rem 1.25rem",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Browse Auction
        </Link>
        <Link
          href="/dashboard"
          style={{
            color: "#2E5BFF",
            fontWeight: 500,
            fontSize: "1rem",
            padding: "0.5rem 1.25rem",
            borderRadius: "6px",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          My Dashboard
        </Link>
        <Link
          href="/helpdesk"
          title="HelpDesk"
          style={{
            background: "#E8F0FE",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2E5BFF",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
          </svg>
        </Link>
        <Link
          href="/profile"
          title="Profile"
          style={{
            background: "#E8F0FE",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2E5BFF",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </Link>
      </div>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "1px",
        background: "#e5e7eb"
      }}
    />
    </nav>
  );
}