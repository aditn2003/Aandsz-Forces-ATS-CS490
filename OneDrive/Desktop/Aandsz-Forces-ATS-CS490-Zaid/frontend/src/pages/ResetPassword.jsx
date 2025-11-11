// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function ResetPassword() {
  const [form, setForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function handleReset() {
    try {
      const { data } = await api.post("/reset", form);
      alert("✅ Password reset successful!");
      setToken(data.token);
      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Reset failed");
    }
  }

  return (
    <section>
      <h2>Reset Password</h2>

      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        placeholder="Reset Code"
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
      />
      <input
        type="password"
        placeholder="New Password"
        value={form.newPassword}
        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
      />
      <input
        type="password"
        placeholder="Confirm New Password"
        value={form.confirmPassword}
        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
      />
      <button onClick={handleReset}>Reset Password</button>
    </section>
  );
}
