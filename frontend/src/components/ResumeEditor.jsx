import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./ResumeEditor.css";

export default function ResumeEditor() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- State from navigation ---
  const {
    sections = {},
    resumeTitle: passedTitle = "Untitled Resume",
    selectedTemplate: template = {},
  } = location.state || {};

  // --- Default blank structure ---
  const [draft, setDraft] = useState({
    summary: {
      full_name: "",
      title: "",
      contact: { email: "", phone: "", location: "" },
      bio: "",
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  });

  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [resumeTitle, setResumeTitle] = useState(passedTitle);
  const [visibleSections, setVisibleSections] = useState({});
  const [sectionOrder, setSectionOrder] = useState([]);
  const [refreshSidebar, setRefreshSidebar] = useState(0); // 🔄 sidebar refresh trigger

  // --- Populate from imported resume JSON ---
  useEffect(() => {
    if (sections && Object.keys(sections).length > 0) {
      console.log("📄 Loading imported resume sections:", sections);

      const normalized = { ...sections };

      // ✅ Normalize skills
      if (Array.isArray(normalized.skills)) {
        normalized.skills = normalized.skills
          .map((s) => {
            if (typeof s === "string") return s.trim();
            if (typeof s === "object" && s !== null) {
              if (s.name) return s.name.trim();
              if (s.category && s.proficiency)
                return `${s.category} (${s.proficiency})`.trim();
              return Object.values(s)
                .filter((v) => typeof v === "string" && v.trim() !== "")
                .join(" ")
                .trim();
            }
            return "";
          })
          .filter(Boolean);
      }

      setDraft(normalized);
      setVisibleSections(
        Object.keys(normalized).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      );
      setSectionOrder(Object.keys(normalized));
    }
  }, [sections]);

  // ---------- Helpers ----------
  const toLabel = (field) =>
    field
      .replace(/_/g, " ")
      .replace(/\./g, " → ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toISOString().split("T")[0];
  };

  const normalizeValue = (val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    return val;
  };

  const isDateField = (key) =>
    key.toLowerCase().includes("date") ||
    key === "start" ||
    key === "end" ||
    key.toLowerCase().endsWith("_at");

  const isBoolean = (val) =>
    typeof val === "boolean" ||
    val === "true" ||
    val === "false" ||
    val === true ||
    val === false;

  const isLongTextField = (field) =>
    ["description", "bio", "summary", "details", "responsibilities"].some((t) =>
      field.toLowerCase().includes(t)
    );

  // ---------- Nested update helper ----------
  function updateValue(sectionKey, fieldPath, value) {
    setDraft((prev) => {
      const copy = structuredClone(prev);
      const keys = fieldPath.split(".");
      let obj = copy[sectionKey];
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (obj[k] === undefined) obj[k] = isNaN(Number(keys[i + 1])) ? {} : [];
        obj = obj[k];
      }
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  // ---------- Skills tag handlers ----------
  const addSkill = (skillName) => {
    const newSkill = skillName.trim();
    if (!newSkill) return;
    setDraft((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), newSkill],
    }));
  };

  const removeSkill = (index) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  // ---------- Entry controls ----------
  function addEntry(sectionKey) {
    setDraft((prev) => {
      const existing = Array.isArray(prev[sectionKey]) ? prev[sectionKey] : [];
      const newEntry = {};
      return { ...prev, [sectionKey]: [...existing, newEntry] };
    });
  }

  function removeEntry(sectionKey, index) {
    setDraft((prev) => {
      const list = Array.isArray(prev[sectionKey]) ? prev[sectionKey] : [];
      return { ...prev, [sectionKey]: list.filter((_, i) => i !== index) };
    });
  }

  // ---------- Reorder via arrows ----------
  function moveSection(key, direction) {
    setSectionOrder((prev) => {
      const newOrder = [...prev];
      const index = newOrder.indexOf(key);
      if (index === -1) return prev;
      if (direction === "up" && index > 0)
        [newOrder[index - 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index - 1],
        ];
      else if (direction === "down" && index < newOrder.length - 1)
        [newOrder[index + 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index + 1],
        ];
      return newOrder;
    });
  }

  // ---------- Save Resume ----------
  async function handleSave(format = "pdf") {
    try {
      setSaving(true);
      const filteredDraft = Object.fromEntries(
        sectionOrder
          .filter((key) => visibleSections[key])
          .map((key) => [key, draft[key]])
      );

      await api.post("/api/resumes", {
        title: resumeTitle,
        template_id: template?.id || 1,
        sections: filteredDraft,
        format, // ✅ added export format
      });

      alert(`✅ Resume saved as ${format.toUpperCase()}!`);
      setRefreshSidebar((prev) => prev + 1); // 🔄 refresh sidebar
    } catch (err) {
      console.error("Save failed:", err);
      alert("❌ Failed to save resume.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- AI Customization ----------
  async function handleAICustomization() {
    try {
      setOptimizing(true);
      const token = localStorage.getItem("token");

      const response = await api.post(
        "/api/resumes/optimize",
        { title: resumeTitle, sections: draft },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✨ AI Optimization complete!");
      if (response.data?.optimizedSections) {
        setDraft(response.data.optimizedSections);
      }
    } catch (err) {
      console.error("AI optimization failed:", err);
      alert("❌ AI customization failed. Please try again.");
    } finally {
      setOptimizing(false);
    }
  }

  // ---------- Render ----------
  return (
    <div className="resume-editor-layout">
      <div className="editor-main resume-editor-container">
        <h1>🧾 Resume Editor</h1>

        <label className="resume-title-label">Resume Title</label>
        <input
          value={resumeTitle}
          onChange={(e) => setResumeTitle(e.target.value)}
          placeholder="e.g., Summer Internship Resume"
          className="resume-title-input"
        />

        {sectionOrder.map((sectionKey, idx) => {
          const sectionValue = draft[sectionKey];
          if (!sectionValue) return null;

          return (
            <div key={sectionKey} className="resume-section">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>{toLabel(sectionKey)}</h2>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={visibleSections[sectionKey]}
                      onChange={(e) =>
                        setVisibleSections((prev) => ({
                          ...prev,
                          [sectionKey]: e.target.checked,
                        }))
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="section-controls">
                  <button
                    className="arrow-btn"
                    onClick={() => moveSection(sectionKey, "up")}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="arrow-btn"
                    onClick={() => moveSection(sectionKey, "down")}
                    disabled={idx === sectionOrder.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>

              {visibleSections[sectionKey] && (
                <div className="section-content">
                  {sectionKey === "skills" ? (
                    <div className="skills-tags-container">
                      <div className="skills-tags">
                        {(sectionValue || []).map((skill, index) => (
                          <div key={index} className="skill-tag">
                            {skill}
                            <button
                              className="skill-remove"
                              onClick={() => removeSkill(index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Type a skill and press Enter"
                        className="skill-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill(e.target.value);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  ) : Array.isArray(sectionValue) ? (
                    <div className="section-list">
                      {sectionValue.map((item, idx) => (
                        <div key={idx} className="entry-card">
                          {Object.entries(item).map(([field, val]) => (
                            <div key={field} className="field-group">
                              <label>{toLabel(field)}</label>
                              {isBoolean(val) ? (
                                <input
                                  type="checkbox"
                                  checked={normalizeValue(val)}
                                  onChange={(e) =>
                                    updateValue(
                                      sectionKey,
                                      `${idx}.${field}`,
                                      e.target.checked
                                    )
                                  }
                                />
                              ) : isLongTextField(field) ? (
                                <textarea
                                  rows={4}
                                  value={val || ""}
                                  onChange={(e) =>
                                    updateValue(
                                      sectionKey,
                                      `${idx}.${field}`,
                                      e.target.value
                                    )
                                  }
                                />
                              ) : (
                                <input
                                  type={isDateField(field) ? "date" : "text"}
                                  value={
                                    isDateField(field)
                                      ? formatDate(val)
                                      : val || ""
                                  }
                                  onChange={(e) =>
                                    updateValue(
                                      sectionKey,
                                      `${idx}.${field}`,
                                      e.target.value
                                    )
                                  }
                                />
                              )}
                            </div>
                          ))}
                          <button
                            className="btn-small"
                            onClick={() => removeEntry(sectionKey, idx)}
                          >
                            ❌ Remove Entry
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn-add"
                        onClick={() => addEntry(sectionKey)}
                      >
                        ➕ Add Entry
                      </button>
                    </div>
                  ) : (
                    <div className="section-object">
                      {Object.entries(sectionValue || {}).map(
                        ([field, val]) => (
                          <div key={field} className="field-group">
                            <label>{toLabel(field)}</label>
                            {isBoolean(val) ? (
                              <input
                                type="checkbox"
                                checked={normalizeValue(val)}
                                onChange={(e) =>
                                  updateValue(
                                    sectionKey,
                                    field,
                                    e.target.checked
                                  )
                                }
                              />
                            ) : isLongTextField(field) ? (
                              <textarea
                                rows={4}
                                value={val || ""}
                                onChange={(e) =>
                                  updateValue(sectionKey, field, e.target.value)
                                }
                              />
                            ) : (
                              <input
                                type={isDateField(field) ? "date" : "text"}
                                value={
                                  isDateField(field)
                                    ? formatDate(val)
                                    : val || ""
                                }
                                onChange={(e) =>
                                  updateValue(sectionKey, field, e.target.value)
                                }
                              />
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* --- Footer Buttons --- */}
        <div className="resume-editor-actions">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Back
          </button>

          <button
            onClick={() => handleSave("pdf")}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving..." : "💾 Save as PDF"}
          </button>

          {/* <button
            onClick={handleAICustomization}
            disabled={optimizing}
            className="btn-ai"
          >
            {optimizing ? "Optimizing..." : "✨ AI Optimize"}
          </button> */}
        </div>
      </div>
    </div>
  );
}
