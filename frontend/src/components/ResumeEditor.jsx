import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./ResumeEditor.css";

export default function ResumeEditor() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    sections = {},
    resumeTitle: passedTitle = "Untitled Resume",
    selectedTemplate: template = {},
  } = location.state || {};

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
  const [refreshSidebar, setRefreshSidebar] = useState(0);

  /* --------------------------------------------------------------------------
    🎨 HELPER FUNCTIONS - Text & Display Formatting
  -------------------------------------------------------------------------- */

  // Helper 1: Normalize text (remove extra spaces)
  const normalizeText = (text) => {
    if (!text) return "";
    return text.trim().replace(/\s+/g, " ").replace(/\n/g, " ");
  };

  // Helper 2: Render bullet points from description
  const renderBulletPoints = (description) => {
    if (!description) return null;

    const bullets = description
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (bullets.length === 0) return null;

    return (
      <ul className="bullet-list">
        {bullets.map((bullet, idx) => {
          const cleanBullet = bullet.replace(/^[•\-\*]\s*/, "");
          return <li key={idx}>{cleanBullet}</li>;
        })}
      </ul>
    );
  };

  // Helper 3: Technology tags component
  const TechnologyTags = ({ technologies }) => {
    if (
      !technologies ||
      !Array.isArray(technologies) ||
      technologies.length === 0
    ) {
      return null;
    }

    return (
      <div className="tech-tags">
        {technologies.map((tech, idx) => (
          <span key={idx} className="tech-tag">
            {tech}
          </span>
        ))}
      </div>
    );
  };

  // Helper 4: Format dates for display
  const formatDateDisplay = (date) => {
    if (!date) return "Present";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Present";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  /* --------------------------------------------------------------------------
    🧠 Normalize Imported Resume Sections
  -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!sections || Object.keys(sections).length === 0) return;
    console.log("📄 Loading imported resume sections:", sections);

    const normalized = {};

    for (const [key, value] of Object.entries(sections)) {
      if (Array.isArray(value)) {
        normalized[key] = value;
      } else if (typeof value === "string") {
        normalized[key] = { bio: value };
      } else if (value && typeof value === "object") {
        // 🧩 handle Gemini bug: object with numeric keys
        const keys = Object.keys(value);
        const isNumericObj = keys.every((k) => !isNaN(Number(k)));
        if (isNumericObj) {
          normalized[key] = Object.values(value);
        } else {
          normalized[key] = value;
        }
      } else {
        normalized[key] = [];
      }
    }

    // ✅ Normalize skills (handles any format: string, object, array, nested)
    if (Array.isArray(normalized.skills)) {
      normalized.skills = normalized.skills
        .map((s) => {
          if (typeof s === "string") return s.trim();
          if (s && typeof s === "object") {
            if (s.name) return s.name.trim();
            if (s.category && s.proficiency)
              return `${s.category} (${s.proficiency})`.trim();
            return Object.values(s)
              .flat()
              .filter((v) => typeof v === "string" && v.trim() !== "")
              .join(", ")
              .trim();
          }
          return "";
        })
        .filter(Boolean);
    } else if (normalized.skills && typeof normalized.skills === "object") {
      normalized.skills = Object.values(normalized.skills)
        .flat(Infinity)
        .filter((v) => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim());
    } else if (typeof normalized.skills === "string") {
      normalized.skills = normalized.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      normalized.skills = [];
    }

    setDraft((prev) => ({ ...prev, ...normalized }));
    setVisibleSections(
      Object.keys(normalized).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    );
    setSectionOrder(Object.keys(normalized));
  }, [sections]);

  /* --------------------------------------------------------------------------
    ⚙️ Field Helpers
  -------------------------------------------------------------------------- */
  const toLabel = (field) =>
    field
      .replace(/_/g, " ")
      .replace(/\./g, " → ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // 🧠 Clean ISO or datetime values to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (value) => {
    if (!value) return "";
    // Handle full ISO timestamps (2025-09-02T04:00:00.000Z)
    if (typeof value === "string" && value.includes("T")) {
      const dateOnly = value.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
    }
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

  /* --------------------------------------------------------------------------
    ✏️ Update Nested Values
  -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
    🧩 Skills Tag Handlers
  -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
    ➕ Add / Remove Entry
  -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
    ⬆️⬇️ Reorder Sections
  -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
    💾 Save Resume
  -------------------------------------------------------------------------- */
  async function handleSave(format = "pdf") {
    try {
      setSaving(true);

      // 1️⃣ Filter only visible sections
      const filteredDraft = Object.fromEntries(
        sectionOrder
          .filter((key) => visibleSections[key])
          .map((key) => [key, draft[key]])
      );

      // 2️⃣ Use the template passed via navigation
      const selectedTemplate = template?.file
        ? template
        : { id: 1, name: "ATS Optimized", file: "ats-optimized" };

      // 3️⃣ POST data to backend
      await api.post("/api/resumes", {
        title: resumeTitle,
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        template_file: selectedTemplate.file,
        sections: filteredDraft,
        format,
      });

      alert(
        `✅ Resume saved as ${format.toUpperCase()} using "${
          selectedTemplate.name
        }" template!`
      );
      setRefreshSidebar((prev) => prev + 1);
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("❌ Failed to save resume. Check console for details.");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------------------------------
    ✨ AI Optimization
  -------------------------------------------------------------------------- */
  async function goToAIPicker() {
    navigate("/resume/optimize", {
      state: {
        sections: draft,
        resumeTitle,
        selectedTemplate: template || {},
      },
    });
  }

  /* --------------------------------------------------------------------------
    🎨 RENDER PREVIEW SECTION (Display-only view)
  -------------------------------------------------------------------------- */
  const renderPreviewSection = () => {
    return (
      <div className="resume-preview">
        {/* SUMMARY */}
        {visibleSections.summary && draft.summary && (
          <section className="preview-summary">
            <h1 className="preview-name">
              {normalizeText(draft.summary.full_name)}
            </h1>
            <h2 className="preview-title">
              {normalizeText(draft.summary.title)}
            </h2>

            {draft.summary.contact && (
              <div className="preview-contact">
                {draft.summary.contact.email && (
                  <span>📧 {draft.summary.contact.email}</span>
                )}
                {draft.summary.contact.phone && (
                  <span>📱 {draft.summary.contact.phone}</span>
                )}
                {draft.summary.contact.location && (
                  <span>📍 {draft.summary.contact.location}</span>
                )}
              </div>
            )}

            {draft.summary.bio && (
              <p className="preview-bio">{draft.summary.bio}</p>
            )}
          </section>
        )}

        {/* EXPERIENCE */}
        {visibleSections.experience &&
          Array.isArray(draft.experience) &&
          draft.experience.length > 0 && (
            <section className="preview-section">
              <h2 className="preview-section-title">Experience</h2>
              {draft.experience.map((exp, idx) => (
                <div key={idx} className="preview-experience-card">
                  <div className="preview-exp-header">
                    <div>
                      <h3>{normalizeText(exp.title)}</h3>
                      <p className="preview-company">
                        {normalizeText(exp.company)}
                      </p>
                    </div>
                    <div className="preview-dates">
                      {formatDateDisplay(exp.start_date)} -{" "}
                      {exp.current
                        ? "Present"
                        : formatDateDisplay(exp.end_date)}
                    </div>
                  </div>
                  {exp.location && (
                    <p className="preview-location">
                      📍 {normalizeText(exp.location)}
                    </p>
                  )}
                  {exp.description && (
                    <div className="preview-description">
                      {renderBulletPoints(exp.description)}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

        {/* EDUCATION */}
        {visibleSections.education &&
          Array.isArray(draft.education) &&
          draft.education.length > 0 && (
            <section className="preview-section">
              <h2 className="preview-section-title">Education</h2>
              {draft.education.map((edu, idx) => (
                <div key={idx} className="preview-education-card">
                  <h3>{normalizeText(edu.institution)}</h3>
                  <p className="preview-degree">
                    {edu.degree_type} in {edu.field_of_study}
                  </p>

                  <div className="preview-enrollment">
                    {edu.currently_enrolled
                      ? "📚 Currently Enrolled"
                      : "🎓 Graduated"}
                  </div>

                  <p className="preview-grad-date">
                    {edu.currently_enrolled ? "Expected: " : "Completed: "}
                    {formatDateDisplay(edu.graduation_date)}
                  </p>

                  {edu.gpa && <p className="preview-gpa">GPA: {edu.gpa}</p>}
                  {edu.honors && (
                    <div className="preview-honors">
                      <strong>Honors:</strong> {edu.honors}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

        {/* PROJECTS */}
        {visibleSections.projects &&
          Array.isArray(draft.projects) &&
          draft.projects.length > 0 && (
            <section className="preview-section">
              <h2 className="preview-section-title">Projects</h2>
              {draft.projects.map((proj, idx) => (
                <div key={idx} className="preview-project-card">
                  <h3>{normalizeText(proj.name)}</h3>

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="preview-project-tech">
                      <strong>Technologies:</strong>
                      <TechnologyTags technologies={proj.technologies} />
                    </div>
                  )}

                  {proj.description && (
                    <div className="preview-description">
                      {renderBulletPoints(proj.description)}
                    </div>
                  )}

                  <div className="preview-project-links">
                    {proj.repository_link && (
                      <a
                        href={proj.repository_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🔗 GitHub
                      </a>
                    )}
                    {proj.media_url && (
                      <a
                        href={proj.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🌐 Live Demo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

        {/* SKILLS */}
        {visibleSections.skills &&
          Array.isArray(draft.skills) &&
          draft.skills.length > 0 && (
            <section className="preview-section">
              <h2 className="preview-section-title">Skills</h2>
              <div className="preview-skills-grid">
                {draft.skills.map((skill, idx) => (
                  <span key={idx} className="preview-skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

        {/* CERTIFICATIONS */}
        {visibleSections.certifications &&
          Array.isArray(draft.certifications) &&
          draft.certifications.length > 0 && (
            <section className="preview-section">
              <h2 className="preview-section-title">Certifications</h2>
              {draft.certifications.map((cert, idx) => (
                <div key={idx} className="preview-cert-card">
                  <h3>{cert.name}</h3>
                  <p>{cert.organization}</p>
                  <p className="preview-cert-date">
                    Earned: {formatDateDisplay(cert.date_earned)}
                    {!cert.does_not_expire && cert.expiration_date && (
                      <> • Expires: {formatDateDisplay(cert.expiration_date)}</>
                    )}
                  </p>
                </div>
              ))}
            </section>
          )}
      </div>
    );
  };

  /* --------------------------------------------------------------------------
    🧱 Main Render - Editor Layout
  -------------------------------------------------------------------------- */
  return (
    <div className="resume-editor-layout">
      {/* LEFT: Editor Controls */}
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

              {/* SECTION CONTENT */}
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
                          {Object.entries(item || {}).map(([field, val]) => (
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
                                      ? formatDateForInput(val)
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
                  ) : typeof sectionValue === "object" ? (
                    <div className="section-object">
                      {Object.entries(sectionValue || {}).map(
                        ([field, val]) => (
                          <div key={field} className="field-group">
                            <label>{toLabel(field)}</label>

                            {/* 🧠 Special handling for contact objects */}
                            {field.toLowerCase() === "contact" &&
                            val &&
                            typeof val === "object" ? (
                              <div className="contact-subfields">
                                {Object.entries(val).map(([subKey, subVal]) => (
                                  <div key={subKey} className="subfield">
                                    <label>{toLabel(subKey)}</label>
                                    <input
                                      type="text"
                                      value={subVal || ""}
                                      onChange={(e) =>
                                        updateValue(
                                          sectionKey,
                                          `${field}.${subKey}`,
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : isBoolean(val) ? (
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
                                    ? formatDateForInput(val)
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
                  ) : (
                    <textarea
                      rows={4}
                      value={sectionValue || ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          [sectionKey]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer Buttons */}
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

          <button
            onClick={goToAIPicker}
            disabled={optimizing}
            className="btn-primary"
          >
            ✨ AI Optimize
          </button>
        </div>
      </div>
    </div>
  );
}
