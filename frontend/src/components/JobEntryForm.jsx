import React, { useState, useEffect } from "react";
import "./JobEntryForm.css";

const today = new Date().toISOString().split("T")[0];

export default function JobEntryForm({ token, onSaved, onCancel }) {
  useEffect(() => {
    console.log("🔍 JobEntryForm received token:", token);
  }, [token]);
  useEffect(() => {
    console.log("🔍 JobEntryForm received token:", token);
    console.log("🔍 Token type:", typeof token);
    console.log("🔍 Token length:", token?.length);
  }, [token]);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    salary_min: "",
    salary_max: "",
    url: "",
    deadline: "",
    description: "",
    industry: "",
    type: "",
    applied_on: today,
    resume_id: "",        // 🆕 Added
    cover_letter_id: "",  // 🆕 Added
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [resumes, setResumes] = useState([]);          // 🆕
  const [coverLetters, setCoverLetters] = useState([]); // 🆕

  // 🧩 Fetch resumes & cover letters for dropdowns
  useEffect(() => {
    async function fetchMaterials() {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [resResumes, resCovers] = await Promise.all([
          fetch("http://localhost:4000/api/resumes", { headers }),
          fetch("http://localhost:4000/api/cover-letters", { headers }),
        ]);

        if (resResumes.ok) {
          const data = await resResumes.json();
          setResumes(data.resumes || []);
        }

        if (resCovers.ok) {
          const data = await resCovers.json();
          setCoverLetters(data.cover_letters || []);
        }
      } catch (err) {
        console.error("❌ Failed to load resume/cover letter lists:", err);
      }
    }

    if (token) fetchMaterials();
  }, [token]);

  // 🧠 Save job
  async function saveJob() {
    if (!form.title.trim() || !form.company.trim()) {
      return alert("Job Title and Company Name are required.");
    }
    if (!form.deadline) {
      return alert("Please enter an application deadline date.");
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:4000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save job");
      onSaved?.();
    } catch (err) {
      console.error("Job save error:", err);
      alert("❌ Could not save job entry.");
    } finally {
      setLoading(false);
    }
  }

  // 🧭 Import job details (AI)
  async function importJobDetails() {
    try {
      if (!form.url || !form.url.startsWith("http")) {
        return alert("Please enter a valid job posting URL first.");
      }

      setImporting(true);
      setImportStatus("Importing job details...");

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("http://localhost:4000/api/import-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ url: form.url }),
      });

      const data = await res.json();
      console.log("Import result:", data);

      if (data.status === "success" || data.status === "partial") {
        const job = data.job || {};

        setForm((prev) => ({
          ...prev,
          title: job.title || prev.title,
          company: job.company || prev.company,
          location: job.location || prev.location,
          salary_min: job.salary_min || prev.salary_min,
          salary_max: job.salary_max || prev.salary_max,
          description: job.description || prev.description,
        }));

        const missing = [];
        if (!job.title) missing.push("title");
        if (!job.company) missing.push("company");
        if (!job.description) missing.push("description");
        if (!job.salary_min && !job.salary_max) missing.push("salary");

        if (missing.length === 0) {
          setImportStatus(` Job details imported.`);
        } else if (missing.length <= 2) {
          setImportStatus(`⚠️ Partial import — missing ${missing.join(", ")}.`);
        } else {
          setImportStatus(`⚠️ Limited data found. Please review and fill manually.`);
        }
      } else {
        setImportStatus("❌ Could not extract job details. Please fill manually.");
      }
    } catch (err) {
      console.error("Import error:", err);
      setImportStatus("❌ Import failed. Please check the URL or try again later.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="job-form">
      <h3>Add Job Opportunity</h3>

      {/* URL + Import */}
      <label>Job Posting URL</label>
      <div className="import-row">
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://www.linkedin.com/jobs/view/..."
        />
        <button
          type="button"
          onClick={importJobDetails}
          disabled={importing}
          className="import-btn"
        >
          {importing ? "Importing..." : "Import"}
        </button>
      </div>
      {importStatus && <p className="import-status">{importStatus}</p>}

      {/* Job Fields */}
      <label>Job Title *</label>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="e.g., Software Engineer"
      />

      <label>Company *</label>
      <input
        value={form.company}
        onChange={(e) => setForm({ ...form, company: e.target.value })}
        placeholder="e.g., Palantir Technologies"
      />

      <label>Location</label>
      <input
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="e.g., New York, NY"
      />

      <div className="salary-group">
        <div>
          <label>Salary Min ($)</label>
          <input
            type="number"
            value={form.salary_min}
            onChange={(e) =>
              setForm({ ...form, salary_min: e.target.value.replace(/[^\d.-]/g, "") })
            }
          />
        </div>
        <div>
          <label>Salary Max ($)</label>
          <input
            type="number"
            value={form.salary_max}
            onChange={(e) =>
              setForm({ ...form, salary_max: e.target.value.replace(/[^\d.-]/g, "") })
            }
          />
        </div>
      </div>

      <label>Date Applied</label>
      <input
        type="date"
        value={form.applied_on}
        onChange={(e) => setForm({ ...form, applied_on: e.target.value })}
      />

      <label>Application Deadline *</label>
      <input
        type="date"
        value={form.deadline}
        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
      />

      <label>Job Description</label>
      <textarea
        maxLength={2000}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Describe responsibilities, qualifications, etc."
      />

      <label>Industry</label>
      <select
        value={form.industry}
        onChange={(e) => setForm({ ...form, industry: e.target.value })}
      >
        <option value="">Select industry</option>
        <option value="tech">Technology</option>
        <option value="finance">Finance</option>
        <option value="healthcare">Healthcare</option>
        <option value="education">Education</option>
        <option value="manufacturing">Manufacturing</option>
      </select>

      <label>Job Type</label>
      <select
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        <option value="">Select job type</option>
        <option value="full_time">Full Time</option>
        <option value="part_time">Part Time</option>
        <option value="internship">Internship</option>
        <option value="contract">Contract</option>
      </select>

      {/* 🆕 Resume & Cover Letter Linking */}
      <label>Resume Used</label>
      <select
        value={form.resume_id}
        onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
      >
        <option value="">Select a Resume</option>
        {resumes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>

      <label>Cover Letter Used</label>
      <select
        value={form.cover_letter_id}
        onChange={(e) => setForm({ ...form, cover_letter_id: e.target.value })}
      >
        <option value="">Select a Cover Letter</option>
        {coverLetters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

      {/* Buttons */}
      <div className="button-group">
        <button onClick={saveJob} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
