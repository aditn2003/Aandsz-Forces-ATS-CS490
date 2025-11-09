import React from "react";
import { NavLink } from "react-router-dom";
import "./ProfileNavBar.css";

export default function ProfileNavBar() {
  const tabs = [
    { key: "info", label: "My Info" },
    { key: "employment", label: "Employment" },
    { key: "skills", label: "Skills" },
    { key: "education", label: "Education" },
    { key: "certifications", label: "Certifications" },
    { key: "projects", label: "Projects" },
    { key: "dashboard", label: "Dashboard" },
    { key: "jobs", label: "Jobs" },
    { key: "danger", label: "Danger Zone" },
  ];

  return (
    <nav className="profile-navbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/profile/${tab.key}`}
          className={({ isActive }) =>
            `profile-tab ${isActive ? "active" : ""}`
          }
        >
          {tab.label}
        </NavLink>
      ))}

      {/* 🔽 Dropdown for Resume */}
      <div className="profile-tab dropdown">
        <span className="dropdown-toggle">Resume Builder ▾</span>
        <div className="dropdown-menu">
          <NavLink
            to="/profile/resume"
            className={({ isActive }) =>
              `dropdown-item ${isActive ? "active" : ""}`
            }
          >
            Resume Builder
          </NavLink>
          <NavLink
            to="/profile/resume/saved"
            className={({ isActive }) =>
              `dropdown-item ${isActive ? "active" : ""}`
            }
          >
            Saved Resumes
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
