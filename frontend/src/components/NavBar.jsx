import React from "react";
import "./navbar.css";
import Logo from "./Logo";
import { FaHome, FaUser, FaSignInAlt, FaUserPlus, FaSignOutAlt } from "react-icons/fa";

export default function NavBar({ authed, onNavigate, onLogout, currentPage }) {
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
        <button
          className={currentPage === "home" ? "active" : ""}
          onClick={() => onNavigate("home")}
        >
          <FaHome /> Home
        </button>

        {!authed && (
          <>
            <button
              className={currentPage === "login" ? "active" : ""}
              onClick={() => onNavigate("login")}
            >
              <FaSignInAlt /> Login
            </button>
            <button
              className={currentPage === "register" ? "active" : ""}
              onClick={() => onNavigate("register")}
            >
              <FaUserPlus /> Register
            </button>
          </>
        )}

        {authed && (
          <>
            <button
              className={currentPage === "profile" ? "active" : ""}
              onClick={() => onNavigate("profile")}
            >
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
