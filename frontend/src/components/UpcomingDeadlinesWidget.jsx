import React, { useEffect, useState } from "react";
import "./UpcomingDeadlinesWidget.css";

function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function urgencyColor(deadline) {
  const days = daysUntil(deadline);
  if (days === null) return "#9ca3af"; // gray
  if (days < 0) return "#ef4444"; // red (overdue)
  if (days <= 2) return "#f87171"; // urgent
  if (days <= 7) return "#fbbf24"; // warning
  return "#4ade80"; // green (safe)
}

export default function UpcomingDeadlinesWidget({ token }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:4000/api/jobs?sortBy=deadline", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const valid = (data.jobs || data || []).filter((j) => j.deadline);
        // Sort and limit to 5
        const sorted = valid
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
          .slice(0, 5);
        setJobs(sorted);
      } catch (err) {
        console.error("❌ Failed to load deadlines:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) return <div className="widget-card">Loading deadlines...</div>;

  return (
    <div className="widget-card">
      <h3>📅 Upcoming Deadlines</h3>
      {jobs.length === 0 ? (
        <p>No deadlines set yet.</p>
      ) : (
        <ul>
          {jobs.map((job) => {
            const days = daysUntil(job.deadline);
            const color = urgencyColor(job.deadline);
            return (
              <li key={job.id}>
                <span className="dot" style={{ backgroundColor: color }}></span>
                <div className="job-info">
                  <strong>{job.title}</strong>
                  <small>
                    {days < 0
                      ? `Overdue (${Math.abs(days)} days ago)`
                      : `${days} days remaining`}
                  </small>
                </div>
                <span className="date">
                  {new Date(job.deadline).toLocaleDateString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
