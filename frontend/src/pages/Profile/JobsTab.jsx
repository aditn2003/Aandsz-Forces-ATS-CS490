// src/pages/Profile/JobsTab.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import JobEntryForm from "../../components/JobEntryForm";
import JobPipeline from "../../components/JobPipeLine";
import UpcomingDeadlinesWidget from "../../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../../components/JobsCalendar";

export default function JobsTab() {
  const { token } = useAuth();
  const [showJobForm, setShowJobForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  return (
    <div className="jobs-layout">
      {/* ─── Main Column ─── */}
      <div className="jobs-main">
        {/* Add Job Section */}
        <div className="profile-box">
          <h2>💼 Job Opportunities</h2>

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
                setRefreshKey(Date.now()); // trigger pipeline refresh
              }}
              onCancel={() => setShowJobForm(false)}
            />
          )}
        </div>

        {/* Job Pipeline (Kanban board) */}
        <div className="profile-box">
          <h3>📊 Job Pipeline</h3>
          <JobPipeline key={refreshKey} token={token} />
        </div>
      </div>

      {/* ─── Sidebar ─── */}
      <aside className="sidebar-widget">
        <UpcomingDeadlinesWidget token={token} />
      </aside>
    </div>
  );
}
