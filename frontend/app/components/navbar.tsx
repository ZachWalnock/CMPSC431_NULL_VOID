"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query.trim() === "") return;
    router.push(`/buyer_auction_page?q=${encodeURIComponent(query.trim())}`);
  }

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

      <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings..."
          style={{
            width: "280px",
            padding: "0.45rem 1rem",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            fontSize: "0.9rem",
            outline: "none",
            color: "#111827",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#2E5BFF",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "0.45rem 1.1rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <button
          onClick={() => router.push("/buyer_auction_page")}
          style={{ color: "#2E5BFF", fontWeight: 500, fontSize: "1rem", padding: "0.5rem 1.25rem", background: "none", border: "none", cursor: "pointer" }}
        >
          Browse Auctions
        </button>
        <button
          onClick={() => router.push("/seller_auction_page")}
          style={{ color: "#2E5BFF", fontWeight: 500, fontSize: "1rem", padding: "0.5rem 1.25rem", background: "none", border: "none", cursor: "pointer" }}
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
            border: "none",
            cursor: "pointer",
          }}
        />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "1px", background: "#e5e7eb" }} />
    </nav>
  );
}
