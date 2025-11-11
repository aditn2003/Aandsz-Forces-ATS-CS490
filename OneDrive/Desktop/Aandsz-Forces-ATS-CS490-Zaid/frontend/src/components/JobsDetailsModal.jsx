import React, { useEffect, useState } from "react";
import "./JobDetails.css";

const STAGES = [
  "Interested",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

export default function JobDetailsModal({ token, jobId, onClose, onStatusUpdate }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🟢 Load job details
  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch job details");
        const data = await res.json();
        setJob(data.job);
      } catch (err) {
        console.error("❌ Failed to fetch job details:", err);
      } finally {
        setLoading(false);
      }
    }

    if (jobId) loadJob();
  }, [jobId, token]);
  

  // 🟡 Save job updates
  async function handleSave() {
    if (!job.title?.trim() || !job.company?.trim()) {
      return alert("Job title and company name are required.");
    }

    try {
      setSaving(true);
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(job),
      });

      if (!res.ok) throw new Error("Failed to update job");
      const data = await res.json();
      setJob(data.job);
      alert("✅ Job updated successfully!");
      onStatusUpdate?.(jobId, data.job.status);
      onClose(); // close after save
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Failed to save job changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="job-details-overlay">
      <div className="job-details-modal edit-mode">
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>
        <h2>Edit Job Details</h2>

        {/* BASIC INFO */}
        <label>Job Title *</label>
        <input
          value={job.title || ""}
          onChange={(e) => setJob({ ...job, title: e.target.value })}
          placeholder="e.g., Software Engineer"
        />

        <label>Company *</label>
        <input
          value={job.company || ""}
          onChange={(e) => setJob({ ...job, company: e.target.value })}
          placeholder="e.g., Palantir Technologies"
        />

        <label>Location</label>
        <input
          value={job.location || ""}
          onChange={(e) => setJob({ ...job, location: e.target.value })}
          placeholder="e.g., New York, NY"
        />

        {/* STAGE */}
        <label>Status</label>
        <select
          value={job.status || ""}
          onChange={(e) => setJob({ ...job, status: e.target.value })}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* SALARY */}
        <label>Salary Range ($)</label>
        <div className="salary-group">
          <input
            type="number"
            placeholder="Min"
            value={job.salary_min || ""}
            onChange={(e) => setJob({ ...job, salary_min: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max"
            value={job.salary_max || ""}
            onChange={(e) => setJob({ ...job, salary_max: e.target.value })}
          />
        </div>

        {/* DEADLINE */}
        <label>Application Deadline</label>
        <input
          type="date"
          value={job.deadline ? job.deadline.split("T")[0] : ""}
          onChange={(e) => setJob({ ...job, deadline: e.target.value })}
        />

        {/* DESCRIPTION */}
        <label>Job Description</label>
        <textarea
          rows={4}
          maxLength={2000}
          value={job.description || ""}
          onChange={(e) => setJob({ ...job, description: e.target.value })}
          placeholder="Describe responsibilities, qualifications, etc."
        />

        {/* INDUSTRY */}
        <label>Industry</label>
        <input
          value={job.industry || ""}
          onChange={(e) => setJob({ ...job, industry: e.target.value })}
          placeholder="e.g., Technology, Finance"
        />

        {/* TYPE */}
        <label>Job Type</label>
        <select
          value={job.type || ""}
          onChange={(e) => setJob({ ...job, type: e.target.value })}
        >
          <option value="">Select job type</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>

        {/* NOTES */}
        <label>Personal Notes</label>
        <textarea
          rows={3}
          value={job.notes || ""}
          onChange={(e) => setJob({ ...job, notes: e.target.value })}
          placeholder="Add your thoughts, next steps, etc."
        />

        {/* CONTACT INFO */}
        <label>Contact Name</label>
        <input
        value={job.contact_name || ""}
        onChange={(e) => setJob({ ...job, contact_name: e.target.value })}
        placeholder="e.g., John Doe"
        />

        <label>Contact Email</label>
        <input
        type="email"
        value={job.contact_email || ""}
        onChange={(e) => setJob({ ...job, contact_email: e.target.value })}
        placeholder="e.g., john.doe@company.com"
        />

        <label>Contact Phone</label>
        <input
        type="tel"
        value={job.contact_phone || ""}
        onChange={(e) => setJob({ ...job, contact_phone: e.target.value })}
        placeholder="e.g., (555) 123-4567"
        />


        {/* SALARY NEGOTIATION NOTES */}
        <label>Salary Negotiation Notes</label>
        <textarea
          rows={2}
          value={job.salary_notes || ""}
          onChange={(e) => setJob({ ...job, salary_notes: e.target.value })}
          placeholder="Negotiation history, offers, etc."
        />

        {/* INTERVIEW FEEDBACK */}
        <label>Interview Notes / Feedback</label>
        <textarea
          rows={2}
          value={job.interview_feedback || ""}
          onChange={(e) => setJob({ ...job, interview_feedback: e.target.value })}
          placeholder="Feedback, interviewer names, or impressions"
        />

        {/* HISTORY */}
        <div className="history-section">
          <h3>Application History</h3>
          {job.history && job.history.length > 0 ? (
            <ul>
              {job.history.map((h, i) => (
                <li key={i}>
                  <small>{new Date(h.timestamp).toLocaleString()}</small> —{" "}
                  {h.event}
                </li>
              ))}
            </ul>
          ) : (
            <p>No history yet.</p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="modal-actions">
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
