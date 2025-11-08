import { useState } from "react";
import  { api }  from "../api";

export default function EmploymentForm({ job = {}, token, onCancel, onSaved }) {
  const [form, setForm] = useState({
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    start_date: job.start_date || "",
    end_date: job.end_date || "",
    current: job.current || false,
    description: job.description || "",
  });

  async function save() {
    if (!form.title || !form.company || !form.start_date) {
      alert("Title, company, and start date are required.");
      return;
    }
    if (
      !form.current &&
      form.end_date &&
      new Date(form.end_date) < new Date(form.start_date)
    ) {
      alert("End date must be after start date.");
      return;
    }

    try {
      const endpoint = job.id ? `/api/employment/${job.id}` : "/api/employment";
      const method = job.id ? "put" : "post";
      await api[method](endpoint, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(job.id ? "Employment updated!" : "Employment added!");
      onSaved();
    } catch (err) {
      alert("Could not save employment entry.");
    }
  }

  return (
    <div
      style={{
        background: "#f5f5f5",
        padding: "1rem",
        borderRadius: "10px",
        marginBottom: "1rem",
      }}
    >
      <h4>{job.id ? "Edit Employment" : "Add Employment"}</h4>

      <label>Job Title *</label>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <label>Company Name *</label>
      <input
        value={form.company}
        onChange={(e) => setForm({ ...form, company: e.target.value })}
      />

      <label>Location</label>
      <input
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
      />

      <label>Start Date *</label>
      <input
        type="date"
        value={form.start_date}
        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
      />

      {!form.current && (
        <>
          <label>End Date</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </>
      )}

      <label>
        <input
          type="checkbox"
          checked={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.checked })}
        />
        Current Position
      </label>

      <label>Job Description</label>
      <textarea
        maxLength={1000}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <p style={{ textAlign: "right", fontSize: 12 }}>
        {form.description.length}/1000
      </p>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button onClick={save}>{job.id ? "Save Changes" : "Add"}</button>
        <button onClick={onCancel} style={{ background: "gray" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

