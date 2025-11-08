// src/components/NavBar.jsx
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
import { useAuth } from "../contexts/AuthContext";

export default function NavBar() {
  const { authed, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <Logo size={80} />
      </div>

      <h1 className="navbar-title">ATS for Candidates</h1>

      <nav className="navbar-right">
        <NavLink to="/" end>
          <FaHome /> Home
        </NavLink>

        {authed ? (
          <>
            <NavLink to="/profile/info">
              <FaUser /> Profile
            </NavLink>
            <button onClick={logout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">
              <FaSignInAlt /> Login
            </NavLink>
            <NavLink to="/register">
              <FaUserPlus /> Register
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
