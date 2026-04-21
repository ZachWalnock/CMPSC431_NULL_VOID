//TODO REPLACE
import React from "react";
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
        <button
          style={{
            color: "#2E5BFF",
            fontWeight: 500,
            fontSize: "1rem",
            padding: "0.5rem 1.25rem",
          }}
        >
          Browse Auction
        </button>
        <button
          style={{
            color: "#2E5BFF",
            fontWeight: 500,
            fontSize: "1rem",
            padding: "0.5rem 1.25rem",
            borderRadius: "6px",
          }}
        >
          My Dashboard
        </button>
        <button
          aria-label="Profile"
          style={{
            background: "#E8F0FE",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
        </button>
      </div>
    </nav>
  );
}