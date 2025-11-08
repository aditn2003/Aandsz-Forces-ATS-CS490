// src/pages/Profile/DashboardTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import ProfileDashboard from "../../components/ProfileDashboard";

export default function DashboardTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box">
      <h3>📊 Profilee Dashboard</h3>
      <ProfileDashboard token={token} setActiveTab={() => {}} />
    </div>
  );
}
