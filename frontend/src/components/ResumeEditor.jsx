import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./ResumeEditor.css";

/**
 * ResumeEditor.jsx
 * ----------------
 * Allows users to review, edit, or remove sections
 * before saving the final resume.
 */
export default function ResumeEditor() {
  const location = useLocation();
  const navigate = useNavigate();

  // 🧠 Get prefilled data from navigation state
  const {
    sections = {},
    title = "Untitled Resume",
    template = {},
  } = location.state || {};

  const [draft, setDraft] = useState(sections);
  const [saving, setSaving] = useState(false);
  const [resumeTitle, setResumeTitle] = useState(title);

  // 🗑 Remove a section entirely
  function removeSection(key) {
    if (!window.confirm(`Are you sure you want to remove "${key}"?`)) return;
    const copy = { ...draft };
    delete copy[key];
    setDraft(copy);
  }

  // 🖊 Update a single field in a section
  function updateField(sectionKey, field, value) {
    setDraft((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  }

  // 🧩 Add a new empty item to array-type sections
  function addEntry(sectionKey) {
    const copy = { ...draft };
    if (!Array.isArray(copy[sectionKey])) return;
    copy[sectionKey].push({});
    setDraft(copy);
  }

  // 🗑 Remove individual entries in list sections
  function removeEntry(sectionKey, index) {
    const copy = { ...draft };
    copy[sectionKey].splice(index, 1);
    setDraft(copy);
  }

  // 💾 Save finalized resume
  async function handleSave() {
    try {
      setSaving(true);
      const { data } = await api.post("/api/resumes", {
        title: resumeTitle,
        template_id: template?.id || 1,
        sections: draft,
      });
      alert("✅ Resume saved successfully!");
      navigate("/profile/resume");
    } catch (err) {
      console.error("Save failed:", err);
      alert("❌ Failed to save resume.");
    } finally {
      setSaving(false);
    }
  }

  // ------------------------
  // ✨ Render UI
  // ------------------------
  return (
    <div className="resume-editor-container">
      <h1>🧾 Resume Editor</h1>

      <label className="resume-title-label">Resume Title</label>
      <input
        value={resumeTitle}
        onChange={(e) => setResumeTitle(e.target.value)}
        placeholder="e.g., Summer Internship Resume"
        className="resume-title-input"
      />

      {Object.entries(draft).map(([key, value]) => (
        <div key={key} className="resume-section">
          <div className="section-header">
            <h2>{key.charAt(0).toUpperCase() + key.slice(1)}</h2>
            <button className="btn-delete" onClick={() => removeSection(key)}>
              🗑 Remove Section
            </button>
          </div>

          {/* Handle Object vs Array sections */}
          {Array.isArray(value) ? (
            <div className="section-list">
              {value.length === 0 && (
                <p className="empty-note">No entries in this section.</p>
              )}
              {value.map((item, idx) => (
                <div key={idx} className="entry-card">
                  {Object.entries(item).map(([field, fieldVal]) => (
                    <div key={field} className="field-group">
                      <label>{field}</label>
                      <input
                        value={fieldVal || ""}
                        onChange={(e) =>
                          setDraft((prev) => {
                            const copy = { ...prev };
                            copy[key][idx][field] = e.target.value;
                            return copy;
                          })
                        }
                      />
                    </div>
                  ))}
                  <button
                    className="btn-small"
                    onClick={() => removeEntry(key, idx)}
                  >
                    ❌ Remove Entry
                  </button>
                </div>
              ))}
              <button className="btn-add" onClick={() => addEntry(key)}>
                ➕ Add New
              </button>
            </div>
          ) : (
            <div className="section-object">
              {Object.entries(value || {}).map(([field, fieldVal]) => {
                // If nested (like contact), flatten it
                if (typeof fieldVal === "object" && fieldVal !== null) {
                  return Object.entries(fieldVal).map(([sub, subVal]) => (
                    <div key={`${field}-${sub}`} className="field-group">
                      <label>{`${field}.${sub}`}</label>
                      <input
                        value={subVal || ""}
                        onChange={(e) =>
                          setDraft((prev) => {
                            const copy = { ...prev };
                            copy[key][field][sub] = e.target.value;
                            return copy;
                          })
                        }
                      />
                    </div>
                  ));
                }

                return (
                  <div key={field} className="field-group">
                    <label>{field}</label>
                    <input
                      value={fieldVal || ""}
                      onChange={(e) => updateField(key, field, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="resume-editor-actions">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "💾 Save Resume"}
        </button>
      </div>
    </div>
  );
}
