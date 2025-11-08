// src/pages/Profile/ProfileLayout.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProfileNavBar from "../../components/ProfileNavBar";
import InfoTab from "./InfoTab";
import EmploymentTab from "./EmploymentTab";
import SkillsTab from "./SkillsTab";
import EducationTab from "./EducationTab";
import CertificationsTab from "./CertificationsTab";
import ProjectsTab from "./ProjectsTab";
import JobsTab from "./JobsTab";
import DashboardTab from "./DashboardTab";
import DangerTab from "./DangerTab";
import ResumeBuilder from "./ResumeBuilder";
import ResumeSetup from "./ResumeSetup";
import ResumeEditor from "../../components/ResumeEditor"; // 🆕 added

import { useAuth } from "../../contexts/AuthContext";

export default function ProfileLayout() {
  const { authed } = useAuth();

  if (!authed) {
    return (
      <section className="profile-box">
        <p>You must log in to view your profile.</p>
      </section>
    );
  }

  return (
    <section className="profile-section">
      <h2>My Profile</h2>

      {/* 🧭 Top navigation bar for tabs */}
      <ProfileNavBar />

      {/* Nested tab routes */}
      <Routes>
        {/* /profile → Info by default */}
        <Route index element={<InfoTab />} />
        {/* /profile/info → Info tab */}
        <Route path="info" element={<InfoTab />} />
        {/* Other tabs */}
        <Route path="dashboard" element={<DashboardTab />} />
        <Route path="employment" element={<EmploymentTab />} />
        <Route path="skills" element={<SkillsTab />} />
        <Route path="education" element={<EducationTab />} />
        <Route path="certifications" element={<CertificationsTab />} />
        <Route path="projects" element={<ProjectsTab />} />
        <Route path="jobs" element={<JobsTab />} />
        <Route path="resume" element={<ResumeBuilder />} />
        <Route path="resume/setup" element={<ResumeSetup />} />
        <Route path="resume/editor" element={<ResumeEditor />} /> {/* ✅ new */}
        <Route path="danger" element={<DangerTab />} />
        {/* Fallback: any unknown /profile/... → /profile/info */}
        <Route path="*" element={<Navigate to="/profile/info" replace />} />
      </Routes>
    </section>
  );
}
