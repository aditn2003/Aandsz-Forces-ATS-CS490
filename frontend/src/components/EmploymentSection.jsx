import { useState, useEffect } from "react";
import { api } from "../api";
import EmploymentForm from "./EmploymentForm";
import "../App.css";

// ✅ Helper to safely format ISO or plain date strings
function formatDate(dateString) {
  if (!dateString) return "N/A";

  try {
    // Remove timezone or weird endings like "T04:00:00.000Z"
    const clean = dateString.split("T")[0];

    // Convert to Date object properly
    const date = new Date(clean + "T00:00:00");

    // Format to readable form
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}


export default function EmploymentSection({ token }) {
  const [employment, setEmployment] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  async function loadEmployment() {
    try {
      const { data } = await api.get("/api/employment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployment(data.employment || []);
    } catch (err) {
      console.error("Failed to load employment:", err);
    }
  }

  async function deleteEmployment(id) {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await api.delete(`/api/employment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadEmployment();
    } catch (err) {
      alert("Failed to delete entry");
      console.error(err);
    }
  }

  useEffect(() => {
    loadEmployment();
  }, []);

  return (
    <div className="profile-box">
      <h3>Employment History</h3>

      {!adding && !editingJob && (
        <button className="btn-success" onClick={() => setAdding(true)}>
          ➕ Add Employment
        </button>
      )}

      {adding && (
        <EmploymentForm
          token={token}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            loadEmployment();
          }}
        />
      )}

      {editingJob && (
        <EmploymentForm
          token={token}
          job={editingJob}
          onCancel={() => setEditingJob(null)}
          onSaved={() => {
            setEditingJob(null);
            loadEmployment();
          }}
        />
      )}

      {!adding && !editingJob && (
        <>
          {employment.length === 0 ? (
            <p>No employment history yet.</p>
          ) : (
            <div className="timeline">
              {employment
                .sort(
                  (a, b) => new Date(b.start_date) - new Date(a.start_date)
                )
                .map((job) => (
                  <div key={job.id} className="timeline-item">
                    <strong>{job.title}</strong> — {job.company}
                    <small>
                      {job.location ? `${job.location} • ` : ""}
                      {formatDate(job.start_date)} –{" "}
                      {job.current ? "Present" : formatDate(job.end_date)}
                    </small>

                    <p>{job.description || "No description."}</p>

                    <div className="employment-actions">
                      <button
                        className="btn-edit"
                        onClick={() => setEditingJob(job)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => deleteEmployment(job.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
