"use client";
import { useState, useEffect } from "react";

type Profile = {
  email: string;
  role: string;
  profile: Record<string, string | number | null>;
};

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(d.profile || {})) {
          flat[k] = v != null ? String(v) : "";
        }
        setForm(flat);
      })
      .catch(() => setSaveMsg("Failed to load profile."));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg("");
    const res = await fetch("http://localhost:8000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    setSaveMsg(res.ok ? "Profile saved." : "Failed to save.");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    const res = await fetch("http://localhost:8000/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    const d = await res.json();
    if (res.ok) {
      setPwMsg("Password updated.");
      setCurrentPw("");
      setNewPw("");
    } else {
      setPwMsg(d.error || "Failed to update password.");
    }
  }

  if (!data) return <div style={{ padding: "2rem", color: "#6b7280" }}>Loading...</div>;

  const fieldLabels: Record<string, string> = {
    first_name: "First Name",
    last_name: "Last Name",
    age: "Age",
    major: "Major",
    bank_routing_number: "Bank Routing Number",
    bank_account_number: "Bank Account Number",
    position: "Position",
  };

  const editableFields = Object.keys(form).filter(
    (k) => k !== "email" && k !== "home_address_id" && fieldLabels[k]
  );

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111827" }}>My Profile</div>
          <div style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: "4px" }}>
            Role: <strong>{data.role}</strong>
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>
            Email address (cannot be changed)
          </label>
          <div style={{ fontSize: "1rem", color: "#374151", fontWeight: 500 }}>{data.email}</div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
            To change your email, contact HelpDesk.
          </div>
        </div>

        {/* Profile fields */}
        <form onSubmit={handleSave}>
          <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#111827", marginBottom: "1rem" }}>Account Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {editableFields.map((key) => (
                <div key={key}>
                  <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                    {fieldLabels[key]}
                  </label>
                  <input
                    name={key}
                    value={form[key]}
                    onChange={handleChange}
                    style={{
                      width: "100%", padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db", borderRadius: "8px",
                      fontSize: "0.9rem", color: "#111827", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                type="submit"
                style={{ background: "#2E5BFF", color: "#fff", border: "none", borderRadius: "8px", padding: "0.55rem 1.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
              >
                Save changes
              </button>
              {saveMsg && <span style={{ fontSize: "0.85rem", color: saveMsg.includes("Failed") ? "#b91c1c" : "#16a34a" }}>{saveMsg}</span>}
            </div>
          </div>
        </form>

        {/* Password change */}
        <form onSubmit={handlePasswordChange}>
          <div style={{ background: "#fff", border: "1px solid #e3e9f9", borderRadius: "12px", padding: "1.5rem" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#111827", marginBottom: "1rem" }}>Change Password</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>Current password</label>
                <input
                  type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", color: "#111827", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>New password</label>
                <input
                  type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", color: "#111827", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                type="submit"
                style={{ background: "#334d6e", color: "#fff", border: "none", borderRadius: "8px", padding: "0.55rem 1.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
              >
                Update password
              </button>
              {pwMsg && <span style={{ fontSize: "0.85rem", color: pwMsg.includes("Failed") || pwMsg.includes("incorrect") ? "#b91c1c" : "#16a34a" }}>{pwMsg}</span>}
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
