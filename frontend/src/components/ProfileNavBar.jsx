import React from "react";
import { NavLink } from "react-router-dom";

export default function ProfileNavBar({ activeTab, onNavigate }) {
  const tabs = [
    { key: "info", label: "My Info" },
    { key: "employment", label: "Employment" },
    { key: "skills", label: "Skills" },
    { key: "education", label: "Education" },
    { key: "certifications", label: "Certifications" },
    { key: "projects", label: "Projects" },
    { key: "danger", label: "Danger Zone" },
    { key: "dashboard", label: "Dashboard" },
    { key: "jobs", label: "Jobs" },


  ];

  return (
    <nav className="profile-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/profile/${tab.key}`}
          onClick={() => onNavigate(tab.key)}
          className={`profile-tab ${activeTab === tab.key ? "active" : ""}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
