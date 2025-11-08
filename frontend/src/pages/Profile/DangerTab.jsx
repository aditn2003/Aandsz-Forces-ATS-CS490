// src/pages/Profile/DangerTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";

export default function DangerTab() {
  const { token, setToken } = useAuth();

  // 🧨 Delete account permanently
  async function deleteAccount() {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Deleting your account is immediate and permanent.\n\n" +
        "All of your data, including your profile, employment history, and job records, will be removed permanently.\n\n" +
        "Are you absolutely sure you want to continue?"
    );
    if (!confirmDelete) return;

    const password = prompt("Enter your password to confirm deletion:") || "";
    if (!password) return alert("Password is required.");

    try {
      await api.post(
        "/delete",
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Account deleted successfully.");
      setToken(null);
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (e) {
      console.error("❌ Account deletion failed:", e);
      alert(e?.response?.data?.error || "❌ Account deletion failed.");
    }
  }

  return (
    <div
      className="profile-box"
      style={{
        border: "1px solid #ffb3b3",
        background: "#fff5f5",
        padding: "20px",
        borderRadius: "10px",
      }}
    >
      <h3 className="danger-zone" style={{ color: "#e63946" }}>
        Danger Zone
      </h3>
      <p>
        This action cannot be undone. Deleting your account will remove all
        associated data, including employment, education, skills, and projects.
      </p>
      <button
        className="btn-danger"
        onClick={deleteAccount}
        style={{
          background: "#e63946",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Delete My Account
      </button>
    </div>
  );
}
