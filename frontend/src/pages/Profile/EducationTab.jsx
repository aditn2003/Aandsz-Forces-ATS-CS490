// src/pages/Profile/EducationTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import EducationSection from "../../components/EducationSection";

export default function EducationTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box">
      <h3>Education</h3>
      <p>Record your academic background, degrees, and honors.</p>

      <EducationSection token={token} />
    </div>
  );
}
