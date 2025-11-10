// src/pages/Jobs.jsx
import React, { useState } from "react";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import { useAuth } from "../contexts/AuthContext";
import "./Jobs.css";

export default function Jobs() {
  const { token } = useAuth();
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [showJobForm, setShowJobForm] = useState(false);

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
          <JobPipeline key={refreshKey} token={token} />
        </div>
      </div>

      {/* ===== Sidebar ===== */}
      <aside className="sidebar-widget">
        <UpcomingDeadlinesWidget token={token} />
      </aside>
    </div>
  );
}
