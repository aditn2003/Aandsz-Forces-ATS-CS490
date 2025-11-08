import React, { useEffect, useState } from "react";
import "./JobPipeline.css";
import JobDetailsModal from "./JobsDetailsModal";
import JobSearchFilter from "./JobSearchFilter";
import UpcomingDeadlinesWidget from "./UpcomingDeadlinesWidget";

// 🟡 highlight helper: wraps matching text with <mark> tag
function highlight(text, term) {
  if (!term || !text) return text;
  const regex = new RegExp(`(${term})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}
const STAGES = [
  { name: "Interested", color: "#a78bfa" },
  { name: "Applied", color: "#60a5fa" },
  { name: "Phone Screen", color: "#34d399" },
  { name: "Interview", color: "#fbbf24" },
  { name: "Offer", color: "#4ade80" },
  { name: "Rejected", color: "#f87171" },
];

export default function JobPipeline({ token }) {
  const [jobs, setJobs] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [filter, setFilter] = useState("All");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [bulkStage, setBulkStage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [filters, setFilters] = useState(
    JSON.parse(localStorage.getItem("jobSearch") || "{}")
  );
  const [loading, setLoading] = useState(false);
  const [bulkDays, setBulkDays] = useState("");

  async function handleBulkDeadlineExtend() {
    if (!bulkDays || selectedJobs.length === 0)
      return alert("Select jobs and a duration");
    try {
      const res = await fetch("http://localhost:4000/api/jobs/bulk/deadline", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobIds: selectedJobs, daysToAdd: bulkDays }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Extended deadlines for ${data.updated.length} jobs`);
        loadJobs(); // reload updated jobs
        setSelectedJobs([]);
        setBulkDays("");
      } else {
        alert(data.error || "Failed to extend deadlines");
      }
    } catch (err) {
      console.error("❌ Bulk deadline update failed:", err);
    }
  }

  // 🔄 Fetch jobs from backend based on filters/search
  async function loadJobs(currentFilters = filters) {
    try {
      setLoading(true);
      // remove empty keys
      const clean = Object.fromEntries(
        Object.entries(currentFilters).filter(
          ([, v]) => v !== "" && v !== null && v !== undefined
        )
      );
      const query = new URLSearchParams(clean).toString();

      const res = await fetch(`http://localhost:4000/api/jobs?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data.jobs || data || []);
    } catch (err) {
      console.error("❌ Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    loadJobs();
  }, [token]);

  // reload when filters change
  useEffect(() => {
    localStorage.setItem("jobSearch", JSON.stringify(filters));
    loadJobs(filters);
  }, [filters]);

  // 🟪 Update stage for a single job
  async function updateJobStage(jobId, newStage) {
    try {
      await fetch(`http://localhost:4000/api/jobs/${jobId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStage }),
      });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: newStage, status_updated_at: new Date() }
            : j
        )
      );
    } catch (err) {
      console.error("❌ Failed to update stage:", err);
    }
  }
  // 🗓️ Days in current stage (for display)

  // 🗓️ Deadline tracking helpers
  function daysUntilDeadline(deadline) {
    if (!deadline) return null;
    const diffDays = Math.ceil(
      (new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return diffDays;
  }

  function deadlineColor(deadline) {
    const days = daysUntilDeadline(deadline);
    if (days === null) return "gray";
    if (days < 0) return "#ef4444"; // red = overdue
    if (days <= 2) return "#f87171"; // urgent
    if (days <= 7) return "#fbbf24"; // warning
    return "#4ade80"; // safe (green)
  }

  // 🟨 Bulk update selected jobsa
  async function handleBulkUpdate() {
    if (!bulkStage || selectedJobs.length === 0) return;
    for (const id of selectedJobs) await updateJobStage(id, bulkStage);
    setSelectedJobs([]);
    setBulkStage("");
  }

  // 🔍 Filter pipeline stages
  const filteredStages =
    filter === "All" ? STAGES : STAGES.filter((s) => s.name === filter);

  // 🗓 Format "days in stage"
  const formatDaysInStage = (date) => {
    if (!date) return "-";
    const days = Math.round(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days} days in stage`;
  };

  return (
    <div className="pipeline-wrapper">
      {/* === Job Search & Filter Bar === */}
      <JobSearchFilter onFilterChange={setFilters} savedPreferences={filters} />

      {/* === Toolbar === */}
      <div className="pipeline-toolbar">
        <div className="toolbar-left">
          <label>Stage Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {STAGES.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-right">
          <label>Bulk Update:</label>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
          >
            <option value="">Select stage</option>
            {STAGES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <button onClick={handleBulkUpdate}>Move Selected</button>
        </div>
        <div className="toolbar-right">
          <label>Extend Deadline:</label>
          <select
            value={bulkDays || ""}
            onChange={(e) => setBulkDays(Number(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">+1 days</option>
            <option value="3">+3 days</option>
            <option value="7">+7 days</option>
            <option value="14">+14 days</option>
          </select>
          <button onClick={handleBulkDeadlineExtend}>Apply</button>
        </div>
      </div>

      {/* === Loading Indicator === */}
      {loading && <p className="loading-text">Loading jobs...</p>}

      {/* === Pipeline Columns === */}
      <div className="pipeline">
        {filteredStages.map((stage) => {
          const stageJobs = jobs.filter((j) => j.status === stage.name);
          return (
            <div
              key={stage.name}
              className="pipeline-column"
              style={{ borderTopColor: stage.color }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragged && updateJobStage(dragged.id, stage.name)}
            >
              <h3 style={{ color: stage.color }}>
                {stage.name} ({stageJobs.length})
              </h3>

              <div className="column-content">
                {stageJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`job-card ${
                      selectedJobs.includes(job.id) ? "selected" : ""
                    }`}
                    draggable
                    onDragStart={() => setDragged(job)}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        e.stopPropagation();
                        setSelectedJobs((prev) =>
                          prev.includes(job.id)
                            ? prev.filter((id) => id !== job.id)
                            : [...prev, job.id]
                        );
                      } else {
                        setSelectedJobId(job.id);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedJobs((prev) =>
                          prev.includes(job.id)
                            ? prev.filter((id) => id !== job.id)
                            : [...prev, job.id]
                        );
                      }}
                    />
                    <div className="job-info">
                      <strong
                        dangerouslySetInnerHTML={{
                          __html: highlight(job.title, filters.search),
                        }}
                      />
                      <p
                        dangerouslySetInnerHTML={{
                          __html: highlight(job.company, filters.search),
                        }}
                      />

                      {/* 🗓️ Deadline indicator (added) */}
                      {job.deadline && (
                        <small
                          style={{
                            color: deadlineColor(job.deadline),
                            fontWeight: 500,
                            display: "block",
                          }}
                        >
                          {daysUntilDeadline(job.deadline) < 0
                            ? `Overdue (${Math.abs(
                                daysUntilDeadline(job.deadline)
                              )} days ago)`
                            : `${daysUntilDeadline(
                                job.deadline
                              )} days remaining`}
                        </small>
                      )}

                      {/* existing stage info stays untouched */}
                      <small>
                        {formatDaysInStage(
                          job.status_updated_at || job.created_at
                        )}
                      </small>
                    </div>
                  </div>
                ))}
                {stageJobs.length === 0 && (
                  <p className="empty-column">No jobs match filters.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* === Job Details Modal === */}
      {selectedJobId && (
        <JobDetailsModal
          jobId={selectedJobId}
          token={token}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}
