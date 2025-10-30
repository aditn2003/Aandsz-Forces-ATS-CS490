import React, { useState } from "react";
import { api } from "../api";

export default function EducationForm({ token, edu, onSaved, onCancel }) {
  const [form, setForm] = useState(
    edu || {
      institution: "",
      degree_type: "",
      field_of_study: "",
      graduation_date: "",
      currently_enrolled: false,
      education_level: "",
      gpa: "",
      gpa_private: false,
      honors: "",
    }
  );

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (edu?.id) {
        await api.put(`/api/education/${edu.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/api/education", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
    } catch (err) {
      console.error("Error saving education:", err);
      alert("Failed to save education entry.");
    }
  }

  return (
    <div className="card-container">
      <h4>{edu ? "Edit Education" : "Add Education"}</h4>
      <form onSubmit={handleSubmit}>
        <label>Institution *</label>
        <input
          value={form.institution}
          onChange={(e) => setForm({ ...form, institution: e.target.value })}
        />

        <label>Degree *</label>
        <input
          value={form.degree_type}
          onChange={(e) => setForm({ ...form, degree_type: e.target.value })}
        />

        <label>Field of Study *</label>
        <input
          value={form.field_of_study}
          onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
        />

        <label>Education Level</label>
        <select
          value={form.education_level}
          onChange={(e) => setForm({ ...form, education_level: e.target.value })}
        >
          <option value="">Select level</option>
          <option>High School</option>
          <option>Associate</option>
          <option>Bachelor's</option>
          <option>Master's</option>
          <option>PhD</option>
        </select>

        <label>Graduation Date</label>
        <input
          type="date"
          value={form.graduation_date || ""}
          onChange={(e) => setForm({ ...form, graduation_date: e.target.value })}
        />

        <label>
          <input
            type="checkbox"
            checked={form.currently_enrolled}
            onChange={(e) =>
              setForm({ ...form, currently_enrolled: e.target.checked })
            }
          />{" "}
          Currently Enrolled
        </label>

        <label>GPA (optional)</label>
        <input
          type="number"
          step="0.01"
          max="4"
          min="0"
          value={form.gpa || ""}
          onChange={(e) => setForm({ ...form, gpa: e.target.value })}
        />

        <label>
          <input
            type="checkbox"
            checked={form.gpa_private}
            onChange={(e) =>
              setForm({ ...form, gpa_private: e.target.checked })
            }
          />{" "}
          Hide GPA (private)
        </label>

        <label>Honors / Achievements</label>
        <textarea
          value={form.honors}
          onChange={(e) => setForm({ ...form, honors: e.target.value })}
        />

        <div className="button-group">
          <button type="submit">Save</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
