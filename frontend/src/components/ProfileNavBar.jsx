import React from "react";
import { NavLink } from "react-router-dom";

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
    <nav className="profile-nav">
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
    </nav>
  );
}
