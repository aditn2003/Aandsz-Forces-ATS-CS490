// components/NavBar.jsx
import React from "react";
import "./navbar.css";
import Logo from "./Logo";
import {
  FaHome,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
} from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";

export default function NavBar({ authed, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      {/* Centered logo */}
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <Logo size={80} />
      </div>

      {/* Title under logo */}
      <h1 className="navbar-title">ATS for Candidates</h1>

      {/* Navigation options */}
      <nav className="navbar-right">
        <NavLink to="/" end>
          <FaHome /> Home
        </NavLink>

        {!authed && (
          <>
            <NavLink to="/login">
              <FaSignInAlt /> Login
            </NavLink>
            <NavLink to="/register">
              <FaUserPlus /> Register
            </NavLink>
          </>
        )}

        {authed && (
          <>
            <NavLink to="/profile/info">
              <FaUser /> Profile
            </NavLink>
            <button onClick={onLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
