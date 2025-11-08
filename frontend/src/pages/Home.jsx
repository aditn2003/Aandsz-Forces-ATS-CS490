// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { authed } = useAuth();

  return (
    <section className="home-section">
      <div className="home-content">
        <h2>
          Welcome to <span>ATS for Candidates</span>
        </h2>
        <p>
          Manage job applications, resumes, and professional profiles — all in
          one place.
        </p>
        <p className="coming-soon">🚀 Exciting updates are coming soon!</p>

        {!authed && (
          <p style={{ marginTop: 12 }}>
            <Link to="/login">Login</Link> or{" "}
            <Link to="/register">Create an account</Link>
          </p>
        )}
      </div>
    </section>
  );
}
