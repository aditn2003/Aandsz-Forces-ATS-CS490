// src/pages/Profile/ProjectsTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import ProjectSection from "../../components/ProjectSection";

export default function ProjectsTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box">
      <h3>Projects</h3>
      <p>
        Showcase academic, professional, or personal projects. Include your
        role, technologies used, outcomes, and media or repository links.
      </p>

      <ProjectSection token={token} />
    </div>
  );
}
