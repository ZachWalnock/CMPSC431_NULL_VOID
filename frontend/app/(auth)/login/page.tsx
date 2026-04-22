"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }
      document.cookie = `nittany_user=${encodeURIComponent(data.email)}; path=/; max-age=3600; SameSite=Lax`;
      router.push("/");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "15vh", display: "flex", justifyContent: "center", alignItems: "end" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: "bold", letterSpacing: "0.03em", color: "#334d6e" }}>
            NittanyAuction
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "start", paddingTop: "3vh", color: "#000000" }}>
          <div style={{
            background: "white", borderRadius: "12px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            padding: "2.5rem", width: "40vw", height: "60vh", minWidth: "300px",
            display: "flex", justifyContent: "center",
          }}>
            <form onSubmit={handleSubmit} style={{ width: "80%", display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontWeight: 800, fontSize: "2rem" }}>Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email" required autoFocus
                  style={{ color: "#4D4D4D", border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontWeight: 800, fontSize: "2rem" }}>Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password" required
                  style={{ border: "1px solid black", borderRadius: "5px", padding: "6px" }}
                />
              </div>
              {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
              <Link style={{ display: "flex", justifyContent: "center", color: "#C9C9C9" }} href="/register">
                <span style={{ textDecoration: "underline" }}>Or register!</span>
              </Link>
              <div style={{ display: "grid" }}>
                <button
                  type="submit" disabled={loading}
                  style={{ backgroundColor: "#334d6e", borderRadius: "6px", color: "#FFFFFF", padding: "1rem", border: "none", cursor: "pointer" }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
