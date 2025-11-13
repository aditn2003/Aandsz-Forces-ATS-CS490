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
  FaFileAlt,
  FaBriefcase,
  FaChartBar,
  FaArchive,
  FaBuilding, 
  FaStar,
  FaComments   // 🗨️ NEW ICON FOR INTERVIEWS
} from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NavBar() {
  const { authed, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <Logo size={80} />
      </div>

      <h1 className="navbar-title">ATS for Candidates</h1>

      {/* Nav Links */}
      <nav className="navbar-right">
        <NavLink to="/" end>
          <FaHome /> Home
        </NavLink>

        {authed ? (
          <>
            <NavLink to="/resume">
              <FaFileAlt /> Resume
            </NavLink>

            <NavLink to="/jobs">
              <FaBriefcase /> Jobs
            </NavLink>

            {/* 📊 Statistics */}
            <NavLink to="/statistics">
              <FaChartBar /> Statistics
            </NavLink>

            {/* 🗄️ Archived */}
            <NavLink to="/archived">
              <FaArchive /> Archived
            </NavLink>

            {/* 🏢 Company Research */}
            <NavLink to="/company-research">
              <FaBuilding /> Research
            </NavLink>

            {/* 🗨️ INTERVIEW INSIGHTS */}
            <NavLink to="/interviews">
              <FaComments /> Interviews
            </NavLink>

            {/* ⭐ JOB MATCH */}
            <NavLink to="/job-match">
              <FaStar /> Job Match
            </NavLink>

            {/* 👤 Profile */}
            <NavLink to="/profile/info">
              <FaUser /> Profile
            </NavLink>

            {/* 🚪 Logout */}
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
