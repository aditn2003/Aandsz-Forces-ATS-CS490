// src/pages/Jobs.jsx
import React, { useState } from "react";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";   // <-- NEW
import "./Jobs.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();                 // <-- NEW
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [showJobForm, setShowJobForm] = useState(false);

  // 🔥 NEW — when user clicks “Analyze Skills”
  const handleAnalyzeSkills = (jobId) => {
    navigate(`/skills-gap/${jobId}`);
  };

  return (
    <div className="jobs-layout">
      {/* ===== Left/Main Content ===== */}
      <div className="jobs-main">
        {/* 🔹 Job Form Section */}
        <div className="profile-box">
          <h2>💼 Job Tracker</h2>
          {!showJobForm && (
            <button
              className="btn-success"
              onClick={() => setShowJobForm(true)}
            >
              ➕ Add New Job
            </button>
          )}
          {showJobForm && (
            <JobEntryForm
              token={token}
              onSaved={() => {
                setShowJobForm(false);
                setRefreshKey(Date.now());
              }}
              onCancel={() => setShowJobForm(false)}
            />
          )}
        </div>

        {/* 🔹 Job Pipeline */}
        <div className="profile-box">
          <h3>📊 Job Pipeline</h3>

          {/* 🔥 PASS ANALYZE HANDLER INTO PIPELINE */}
          <JobPipeline
            key={refreshKey}
            token={token}
            onAnalyzeSkills={handleAnalyzeSkills}   // <-- NEW
          />
        </div>
      </div>

      {/* ===== Sidebar ===== */}
      <aside className="sidebar-widget">
        <UpcomingDeadlinesWidget token={token} />
      </aside>
    </div>
  );
}
