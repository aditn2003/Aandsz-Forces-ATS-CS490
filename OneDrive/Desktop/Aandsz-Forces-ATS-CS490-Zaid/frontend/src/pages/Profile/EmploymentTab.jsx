// src/pages/Profile/EmploymentTab.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import EmploymentForm from "../../components/EmploymentForm";

export default function EmploymentTab() {
  const { token } = useAuth();
  const [employment, setEmployment] = useState([]);
  const [employmentForm, setEmploymentForm] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch employment history from backend
  async function loadEmployment() {
    try {
      setLoading(true);
      const { data } = await api.get("/api/employment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployment(data.employment || []);
    } catch (e) {
      console.error("❌ Failed to load employment:", e);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Delete entry
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await api.delete(`/api/employment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Employment entry deleted successfully!");
      loadEmployment();
    } catch (err) {
      alert("❌ Could not delete employment entry.");
    }
  }

  // ✅ Duration helper (same as before)
  function getDuration(start, end) {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    if (years && remMonths)
      return `${years} yr${years > 1 ? "s" : ""} ${remMonths} mo${
        remMonths > 1 ? "s" : ""
      }`;
    if (years) return `${years} yr${years > 1 ? "s" : ""}`;
    if (remMonths) return `${remMonths} mo${remMonths > 1 ? "s" : ""}`;
    return "Less than a month";
  }

  // ✅ Load on mount
  useEffect(() => {
    loadEmployment();
  }, []);

  // ---------- UI ----------
  return (
    <div className="profile-box">
      <h3>Employment History</h3>

      <button className="btn-success" onClick={() => setEmploymentForm({})}>
        ➕ Add Employment
      </button>

      {/* Form Section */}
      {employmentForm && (
        <EmploymentForm
          job={employmentForm}
          token={token}
          onCancel={() => setEmploymentForm(null)}
          onSaved={() => {
            setEmploymentForm(null);
            loadEmployment();
          }}
        />
      )}

      {/* List Section */}
      {loading ? (
        <p>Loading employment...</p>
      ) : employment.length === 0 ? (
        <p>No employment history yet.</p>
      ) : (
        <ul className="employment-list">
          {employment.map((job) => (
            <li key={job.id}>
              <strong>{job.title}</strong> — {job.company}
              <div className="employment-meta">
                {job.start_date && (
                  <span>
                    {new Date(job.start_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {job.end_date
                      ? new Date(job.end_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                        })
                      : "Present"}{" "}
                    ({getDuration(job.start_date, job.end_date)})
                  </span>
                )}
              </div>
              <div className="employment-actions">
                <button
                  className="btn-edit"
                  onClick={() => setEmploymentForm(job)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(job.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
