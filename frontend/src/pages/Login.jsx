// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api";

export default function Login() {
  const { setToken } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      const { data } = await api.post("/login", form);

      alert("✅ Login successful!");
      setToken(data.token);

      // 🔥 Save userId
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      localStorage.setItem("userId", payload.id);

      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Login failed");
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const idToken = credentialResponse.credential;
      const { data } = await api.post("/google", { idToken });

      alert("✅ Google login successful!");
      setToken(data.token);

      // 🔥 Save userId
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      localStorage.setItem("userId", payload.id);

      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "Google login failed");
    }
  }

  function handleGoogleError() {
    alert("Google sign-in failed. Try again.");
  }

  return (
    <section>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button onClick={handleLogin}>Login</button>

      <div className="text-small">
        <Link to="/forgot">Forgot password?</Link>
      </div>

      <div style={{ marginTop: "10px" }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          shape="pill"
        />
      </div>
    </section>
  );
}
