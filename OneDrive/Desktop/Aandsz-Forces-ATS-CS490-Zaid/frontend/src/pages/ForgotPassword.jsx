// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  async function handleForgot() {
    try {
      const { data } = await api.post("/forgot", { email });
      alert(data.message || "Check your email for the reset code.");
      navigate("/reset");
    } catch (e) {
      alert(e?.response?.data?.error || "Request failed");
    }
  }

  return (
    <section>
      <h2>Forgot Password</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleForgot}>Send Reset Code</button>
    </section>
  );
}
