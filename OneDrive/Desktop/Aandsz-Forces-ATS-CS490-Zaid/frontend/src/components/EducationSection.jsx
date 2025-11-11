import React, { useEffect, useState } from "react";
import { api } from "../api";
import EducationForm from "./EducationForm";
import "../App.css";

// Helper to format ISO date into readable form
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EducationSection({ token }) {
  const [education, setEducation] = useState([]);
  const [eduForm, setEduForm] = useState(null);

  async function loadEducation() {
    try {
      const { data } = await api.get("/api/education", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEducation(data.education || []);
    } catch (err) {
      console.error("Error loading education:", err);
    }
  }

  async function deleteEducation(id) {
    if (!window.confirm("Delete this education entry?")) return;
    try {
      await api.delete(`/api/education/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadEducation();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete education entry");
    }
  }

  useEffect(() => {
    if (token) loadEducation();
  }, [token]);

  return (
    <div className="profile-box">
      {!eduForm && (
        <button className="btn-success" onClick={() => setEduForm({})}>
          ➕ Add Education
        </button>
      )}

      {eduForm && (
        <EducationForm
          token={token}
          edu={eduForm}
          onCancel={() => setEduForm(null)}
          onSaved={() => {
            setEduForm(null);
            loadEducation();
          }}
        />
      )}

      {!eduForm && (
        <>
          {education.length === 0 ? (
            <p>No education history yet.</p>
          ) : (
            <div className="timeline">
              {education
                .sort(
                  (a, b) =>
                    new Date(b.graduation_date || "9999-12-31") -
                    new Date(a.graduation_date || "9999-12-31")
                )
                .map((e) => (
                  <div key={e.id} className="timeline-item">
                    <strong>{e.degree_type}</strong> in {e.field_of_study}
                    <small>
                      {e.institution} •{" "}
                      {e.currently_enrolled
                        ? "Currently Enrolled"
                        : formatDate(e.graduation_date)}
                    </small>

                    {e.gpa && !e.gpa_private && (
                      <p>
                        <strong>GPA:</strong> {e.gpa}
                      </p>
                    )}

                    {e.honors && (
                      <p>
                        🎖️ <strong>Honors:</strong> {e.honors}
                      </p>
                    )}

                    <div className="employment-actions">
                      <button
                        className="btn-edit"
                        onClick={() => setEduForm(e)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => deleteEducation(e.id)}
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
