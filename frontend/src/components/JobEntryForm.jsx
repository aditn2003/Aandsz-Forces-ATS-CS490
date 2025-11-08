import React, { useState } from "react";
import "./jobEntryForm.css";

export default function JobEntryForm({ token, onSaved, onCancel }) {
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
  });

  const [loading, setLoading] = useState(false);
  async function saveJob() {
    if (!form.title.trim() || !form.company.trim()) {
      return alert("Job Title and Company Name are required.");
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
  
     // alert("✅ Job entry saved successfully!");
  
      // ⬇️ trigger refresh immediately
      onSaved?.(); // this will call loadJobs() in JobPipeline
  
    } catch (err) {
      console.error("Job save error:", err);
      alert("❌ Could not save job entry.");
    } finally {
      setLoading(false);
    }
  }
  

  return (
    <div className="job-form">
      <h3>Add Job Opportunity</h3>

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
            onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
          />
        </div>
        <div>
          <label>Salary Max ($)</label>
          <input
            type="number"
            value={form.salary_max}
            onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
          />
        </div>
      </div>

      <label>Job Posting URL</label>
      <input
        type="url"
        value={form.url}
        onChange={(e) => setForm({ ...form, url: e.target.value })}
        placeholder="https://example.com/job/software-engineer"
      />

      <label>Application Deadline</label>
      <input
        type="date"
        value={form.deadline}
        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
      />

      <label>Job Description (max 2000 chars)</label>
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
