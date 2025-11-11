// src/pages/Profile/SkillsTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import SkillsSection from "../../components/SkillsSection";

export default function SkillsTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box">
      <h3>Skills</h3>
      <p>Add, edit, and categorize your technical and professional skills.</p>
      <SkillsSection token={token} />
    </div>
  );
}
