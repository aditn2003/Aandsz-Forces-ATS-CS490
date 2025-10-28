import React from "react";
import "./navbar.css";
import Logo from "./Logo";
import { FaHome, FaUser, FaSignInAlt, FaUserPlus, FaSignOutAlt } from "react-icons/fa";

export default function NavBar({ authed, onNavigate, onLogout }) {
  return (
    <header className="navbar">
      {/* Centered logo */}
      <div className="navbar-logo">
        <Logo size={80} />
      </div>

      {/* Title under logo */}
      <h1 className="navbar-title">ATS for Candidates</h1>

      {/* Navigation options horizontally aligned */}
      <nav className="navbar-right">
        <button onClick={() => onNavigate("home")}>
          <FaHome /> Home
        </button>

        {!authed && (
          <>
            <button onClick={() => onNavigate("login")}>
              <FaSignInAlt /> Login
            </button>
            <button onClick={() => onNavigate("register")}>
              <FaUserPlus /> Register
            </button>
          </>
        )}

        {authed && (
          <>
            <button onClick={() => onNavigate("profile")}>
              <FaUser /> Profile
            </button>
            <button onClick={onLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

