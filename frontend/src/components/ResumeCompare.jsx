import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ResumeCompare.css";

export default function ResumeCompare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { masterResume, aiSuggestions, resumeTitle, selectedTemplate, job } =
    location.state || {};

  const [mergedResume, setMergedResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGeminiBox, setShowGeminiBox] = useState(false);

  // Helper: Convert description string to bullet array
  function descriptionToBullets(desc) {
    if (!desc) return [];
    if (Array.isArray(desc)) return desc;

    const text = String(desc).trim();

    // First try splitting by newlines
    let bullets = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // If we only got 1 bullet but text is long, try splitting by periods followed by capital letters
    if (bullets.length === 1 && text.length > 100) {
      bullets = text
        .split(/\.(?=\s+[A-Z])/) // Split on period followed by space and capital letter
        .map((s) => s.trim())
        .map((s) => (s.endsWith(".") ? s : s + ".")) // Ensure each ends with period
        .filter(Boolean);
    }

    // Remove existing bullet markers
    bullets = bullets.map((s) => s.replace(/^[•\-\*]\s*/, ""));

    return bullets;
  }

  // Helper: Convert bullet array to description string
  function bulletsToDescription(bullets) {
    if (!bullets) return "";
    if (typeof bullets === "string") {
      // If it's already a string, ensure each sentence is on its own line
      return bullets
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n");
    }
    return bullets.join("\n");
  }

  async function reconcileWithGemini() {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:4000/api/resumes/reconcile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ masterResume, aiSuggestions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reconciliation failed");

      const aiMerged = data.merged || data;
      const newMergedResume = {
        ...masterResume,
        summary: { ...masterResume.summary, ...aiMerged.summary },
        experience: [...(aiMerged.experience || masterResume.experience)],
        education: [...(aiMerged.education || masterResume.education)],
        projects: [...(aiMerged.projects || masterResume.projects)],
        skills: aiMerged.skills?.length
          ? aiMerged.skills
          : masterResume.skills || [],
      };

      setMergedResume(newMergedResume);
    } catch (err) {
      console.error("❌ Merge failed:", err);
      setError(err.message || "Failed to merge resumes");
    } finally {
      setLoading(false);
    }
  }

  function updateField(section, field, value, index = null, subfield = null) {
    const updated = { ...mergedResume };
    if (index !== null && Array.isArray(updated[section])) {
      if (subfield) {
        updated[section][index][field][subfield] = value;
      } else {
        updated[section][index][field] = value;
      }
    } else if (section === "summary" && subfield) {
      updated.summary[field][subfield] = value;
    } else if (section === "summary") {
      updated.summary[field] = value;
    } else {
      updated[section] = value;
    }
    setMergedResume(updated);
  }

  function getScoreColor(score) {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    if (dateString.includes("T")) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
      }
    } catch (e) {
      console.warn("Could not parse date:", dateString);
    }
    return dateString;
  }

  function formatDateReadable(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    } catch (e) {
      return dateString;
    }
  }

  if (!masterResume)
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <h2>⚠️ Missing resume data</h2>
      </div>
    );

  return (
    <div className="compare-container">
      <h1>⚖️ Compare & Edit Resume</h1>
      <p>
        Job: <strong>{job?.title}</strong> – {job?.company}
      </p>

      <div className="gemini-toggle">
        <button
          className="gemini-toggle-btn"
          onClick={() => setShowGeminiBox(!showGeminiBox)}
        >
          {showGeminiBox
            ? "Hide Gemini Suggestions ▲"
            : "Show Gemini Suggestions ▼"}
        </button>
        {showGeminiBox && aiSuggestions && (
          <div className="ai-preview-box">
            {aiSuggestions.summary_recommendation && (
              <div className="suggestion-card">
                <div className="card-header">
                  <span className="card-icon">💼</span>
                  <h4>Recommended Summary</h4>
                </div>
                <p className="card-content">
                  {aiSuggestions.summary_recommendation}
                </p>
              </div>
            )}

            {aiSuggestions.optimized_experience && (
              <div className="suggestion-card">
                <div className="card-header">
                  <span className="card-icon">🎯</span>
                  <h4>Optimized Experience (with Relevance Scores)</h4>
                </div>
                {aiSuggestions.optimized_experience
                  .sort(
                    (a, b) =>
                      (b.relevance_score || 0) - (a.relevance_score || 0)
                  )
                  .map((exp, i) => (
                    <div key={i} className="experience-item-enhanced">
                      <div className="exp-header-row">
                        <strong className="role-title">
                          {exp.role || exp.title}
                        </strong>
                        <div
                          className="relevance-score-badge"
                          style={{
                            backgroundColor: getScoreColor(
                              exp.relevance_score || 0
                            ),
                          }}
                        >
                          {exp.relevance_score || 0}%
                        </div>
                      </div>

                      {exp.relevance_reasoning && (
                        <div className="relevance-info">
                          <strong>Why relevant:</strong>{" "}
                          {exp.relevance_reasoning}
                        </div>
                      )}

                      {exp.relevant_keywords &&
                        exp.relevant_keywords.length > 0 && (
                          <div className="keywords-row">
                            {exp.relevant_keywords.map((kw, j) => (
                              <span key={j} className="keyword-chip">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}

                      <ul className="bullet-list">
                        {(Array.isArray(exp.bullets) ? exp.bullets : []).map(
                          (bullet, j) => {
                            const bulletData =
                              typeof bullet === "string"
                                ? { text: bullet, is_relevant: true }
                                : bullet;

                            return (
                              <li
                                key={j}
                                className={
                                  bulletData.is_relevant
                                    ? "relevant-bullet"
                                    : "normal-bullet"
                                }
                              >
                                <span className="bullet-text">
                                  {bulletData.text}
                                </span>
                                {bulletData.highlight_reason && (
                                  <div className="highlight-note">
                                    {bulletData.highlight_reason}
                                  </div>
                                )}
                              </li>
                            );
                          }
                        )}
                      </ul>

                      {exp.quantification_notes && (
                        <div className="quantify-note">
                          <strong>📊 Metrics suggestion:</strong>{" "}
                          {exp.quantification_notes}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {aiSuggestions.optimized_skills && (
              <div className="suggestion-card">
                <div className="card-header">
                  <span className="card-icon">⚡</span>
                  <h4>Recommended Skills (Prioritized)</h4>
                </div>
                <div className="skills-grid">
                  {aiSuggestions.optimized_skills.map((skill, i) => (
                    <div key={i} className="skill-chip-enhanced">
                      <div className="skill-header">
                        <span className="skill-name">{skill.skill}</span>
                        {skill.priority && (
                          <span
                            className={`priority-badge priority-${skill.priority}`}
                          >
                            {skill.priority}
                          </span>
                        )}
                      </div>
                      <span className="skill-reason">{skill.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiSuggestions.ats_keywords && (
              <div className="suggestion-card">
                <div className="card-header">
                  <span className="card-icon">🔑</span>
                  <h4>ATS Keywords</h4>
                </div>
                <div className="keyword-tags">
                  {aiSuggestions.ats_keywords.map((keyword, i) => (
                    <span key={i} className="keyword-tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {aiSuggestions.variation_options && (
              <div className="suggestion-card">
                <div className="card-header">
                  <span className="card-icon">✨</span>
                  <h4>Alternative Summaries</h4>
                </div>
                {aiSuggestions.variation_options.map((variation, i) => (
                  <div key={i} className="variation-item">
                    <span className="variation-label">Option {i + 1}</span>
                    <p>{variation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="resume-columns">
        {/* LEFT SIDE – Current Resume */}
        <div className="resume-column resume-current">
          <h2>🧩 Current Resume</h2>

          <section>
            <h3>Summary</h3>
            <div className="section-item">
              <strong>{masterResume.summary.full_name}</strong>
              <p>{masterResume.summary.title}</p>
              <p>
                {masterResume.summary.contact.email} |{" "}
                {masterResume.summary.contact.phone} |{" "}
                {masterResume.summary.contact.location}
              </p>
              <p>{masterResume.summary.bio}</p>
            </div>
          </section>

          <section>
            <h3>Experience</h3>
            {masterResume.experience.map((exp, i) => (
              <div key={i} className="section-item">
                <strong>{exp.title}</strong>
                <p>
                  {exp.company} ({exp.location})
                </p>
                <p>
                  {formatDateReadable(exp.start_date)} -{" "}
                  {exp.end_date ? formatDateReadable(exp.end_date) : "Present"}
                </p>
                <p>{exp.current ? "Current Role" : "Past Role"}</p>
                <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                  {descriptionToBullets(exp.description).map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section>
            <h3>Education</h3>
            {masterResume.education.map((edu, i) => (
              <div key={i} className="section-item">
                <strong>{edu.institution}</strong>
                <p>
                  {edu.degree_type} in {edu.field_of_study}
                </p>
                <p>Level: {edu.education_level}</p>
                <p>GPA: {edu.gpa}</p>
                <p>{formatDateReadable(edu.graduation_date)}</p>
                <p>
                  {edu.currently_enrolled ? "Currently Enrolled" : "Completed"}
                </p>
                {edu.honors && <p>Honors: {edu.honors}</p>}
              </div>
            ))}
          </section>

          <section>
            <h3>Skills</h3>
            <div className="section-item">
              <p>{masterResume.skills.join(", ")}</p>
            </div>
          </section>

          <section>
            <h3>Projects</h3>
            {masterResume.projects.map((proj, i) => (
              <div key={i} className="section-item">
                <strong>{proj.name}</strong>
                <p>Status: {proj.status}</p>
                <p>
                  {proj.role} – {proj.industry}
                </p>
                <p>
                  {formatDateReadable(proj.start_date)} -{" "}
                  {formatDateReadable(proj.end_date)}
                </p>
                <p>Type: {proj.project_type}</p>
                <p>Tech: {proj.technologies?.join(", ")}</p>
                <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                  {descriptionToBullets(proj.description).map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
                {proj.repository_link && (
                  <a
                    href={proj.repository_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {proj.repository_link}
                  </a>
                )}
              </div>
            ))}
          </section>

          <section>
            <h3>Certifications</h3>
            {masterResume.certifications.map((cert, i) => (
              <div key={i} className="section-item">
                <strong>{cert.name}</strong>
                <p>{cert.organization}</p>
                <p>Category: {cert.category}</p>
                <p>Earned: {formatDateReadable(cert.date_earned)}</p>
                <p>
                  {cert.does_not_expire
                    ? "No Expiration"
                    : `Expires: ${formatDateReadable(cert.expiration_date)}`}
                </p>
                <p>Verified: {cert.verified ? "✅" : "❌"}</p>
              </div>
            ))}
          </section>
        </div>

        {/* RIGHT SIDE – Editable AI Resume */}
        <div className="resume-column resume-ai">
          <h2>✨ AI Optimized Resume</h2>
          {error && <p className="error-message">{error}</p>}
          {loading && <p className="loading-message">🤖 Reconciling...</p>}

          {mergedResume ? (
            <>
              <section>
                <h3>Summary</h3>
                <input
                  value={mergedResume.summary.full_name}
                  onChange={(e) =>
                    updateField("summary", "full_name", e.target.value)
                  }
                  className="input-field"
                />
                <input
                  value={mergedResume.summary.title}
                  onChange={(e) =>
                    updateField("summary", "title", e.target.value)
                  }
                  className="input-field"
                />
                <div className="contact-inputs">
                  <input
                    value={mergedResume.summary.contact.email}
                    onChange={(e) =>
                      updateField(
                        "summary",
                        "contact",
                        e.target.value,
                        null,
                        "email"
                      )
                    }
                    placeholder="Email"
                    className="input-field"
                  />
                  <input
                    value={mergedResume.summary.contact.phone}
                    onChange={(e) =>
                      updateField(
                        "summary",
                        "contact",
                        e.target.value,
                        null,
                        "phone"
                      )
                    }
                    placeholder="Phone"
                    className="input-field"
                  />
                  <input
                    value={mergedResume.summary.contact.location}
                    onChange={(e) =>
                      updateField(
                        "summary",
                        "contact",
                        e.target.value,
                        null,
                        "location"
                      )
                    }
                    placeholder="Location"
                    className="input-field"
                  />
                </div>
                <textarea
                  value={mergedResume.summary.bio}
                  onChange={(e) =>
                    updateField("summary", "bio", e.target.value)
                  }
                  className="textarea-field textarea-bio"
                />
              </section>

              <section>
                <h3>Experience</h3>
                {mergedResume.experience.map((exp, i) => (
                  <div key={i} className="form-item-enhanced">
                    {exp.relevance_score && (
                      <div className="inline-relevance">
                        <span>Relevance:</span>
                        <div
                          className="score-indicator"
                          style={{
                            backgroundColor: getScoreColor(exp.relevance_score),
                          }}
                        >
                          {exp.relevance_score}%
                        </div>
                      </div>
                    )}

                    {["title", "company", "location"].map((field) => (
                      <input
                        key={field}
                        value={exp[field] || ""}
                        onChange={(e) =>
                          updateField("experience", field, e.target.value, i)
                        }
                        placeholder={field.replace("_", " ")}
                        className="input-field"
                      />
                    ))}

                    <input
                      type="month"
                      value={exp.start_date ? formatDate(exp.start_date) : ""}
                      onChange={(e) =>
                        updateField(
                          "experience",
                          "start_date",
                          e.target.value,
                          i
                        )
                      }
                      placeholder="Start Date (YYYY-MM)"
                      className="input-field"
                    />
                    <input
                      type="month"
                      value={exp.end_date ? formatDate(exp.end_date) : ""}
                      onChange={(e) =>
                        updateField("experience", "end_date", e.target.value, i)
                      }
                      placeholder="End Date (YYYY-MM)"
                      className="input-field"
                    />
                    <label className="checkbox-label">
                      Current:
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) =>
                          updateField(
                            "experience",
                            "current",
                            e.target.checked,
                            i
                          )
                        }
                      />
                    </label>
                    <div style={{ marginTop: "12px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontWeight: "500",
                        }}
                      >
                        Description (one bullet per line):
                      </label>
                      <textarea
                        value={(() => {
                          const bullets = descriptionToBullets(exp.description);
                          return bullets
                            .map((b) => (b.startsWith("•") ? b : `• ${b}`))
                            .join("\n");
                        })()}
                        onChange={(e) => {
                          const text = e.target.value;
                          const bullets = text
                            .split("\n")
                            .map((s) => s.trim().replace(/^[•\-\*]\s*/, ""))
                            .filter(Boolean);
                          updateField(
                            "experience",
                            "description",
                            bullets.join("\n"),
                            i
                          );
                        }}
                        placeholder="• Achievement 1&#10;• Achievement 2&#10;• Achievement 3"
                        className="textarea-field"
                        rows="6"
                      />
                    </div>
                  </div>
                ))}
              </section>

              <section>
                <h3>Education</h3>
                {mergedResume.education.map((edu, i) => (
                  <div key={i} className="form-item">
                    {[
                      "institution",
                      "degree_type",
                      "field_of_study",
                      "education_level",
                      "gpa",
                      "honors",
                    ].map((field) => (
                      <input
                        key={field}
                        value={edu[field] || ""}
                        onChange={(e) =>
                          updateField("education", field, e.target.value, i)
                        }
                        placeholder={field.replace("_", " ")}
                        className="input-field"
                      />
                    ))}
                    <input
                      type="month"
                      value={
                        edu.graduation_date
                          ? formatDate(edu.graduation_date)
                          : ""
                      }
                      onChange={(e) =>
                        updateField(
                          "education",
                          "graduation_date",
                          e.target.value,
                          i
                        )
                      }
                      placeholder="Graduation Date (YYYY-MM)"
                      className="input-field"
                    />
                    <label className="checkbox-label">
                      Currently Enrolled:
                      <input
                        type="checkbox"
                        checked={edu.currently_enrolled}
                        onChange={(e) =>
                          updateField(
                            "education",
                            "currently_enrolled",
                            e.target.checked,
                            i
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
              </section>

              <section>
                <h3>Skills</h3>
                <button
                  onClick={() => {
                    if (aiSuggestions?.optimized_skills) {
                      const priorityMap = {};
                      aiSuggestions.optimized_skills.forEach((s) => {
                        priorityMap[s.skill.toLowerCase()] =
                          s.priority === "high"
                            ? 3
                            : s.priority === "medium"
                            ? 2
                            : 1;
                      });

                      const sorted = [...mergedResume.skills].sort((a, b) => {
                        const scoreA = priorityMap[a.toLowerCase()] || 0;
                        const scoreB = priorityMap[b.toLowerCase()] || 0;
                        return scoreB - scoreA;
                      });

                      setMergedResume({ ...mergedResume, skills: sorted });
                    }
                  }}
                  className="btn btn-secondary"
                  style={{
                    fontSize: "0.9rem",
                    padding: "8px 16px",
                    marginBottom: 12,
                  }}
                >
                  🎯 Auto-Sort by Relevance
                </button>
                <textarea
                  value={mergedResume.skills.join(", ")}
                  onChange={(e) =>
                    setMergedResume({
                      ...mergedResume,
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Enter skills separated by commas"
                  className="textarea-field textarea-skills"
                />
                {aiSuggestions?.optimized_skills && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: "0.85rem",
                      color: "#64748b",
                    }}
                  >
                    <strong>AI Skill Priorities:</strong>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      {aiSuggestions.optimized_skills.map((s, i) => {
                        const priorityColor =
                          s.priority === "high"
                            ? "#dc2626"
                            : s.priority === "medium"
                            ? "#f59e0b"
                            : "#6b7280";
                        return (
                          <span
                            key={i}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 12,
                              background: priorityColor,
                              color: "white",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                            }}
                          >
                            {s.skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3>Projects</h3>
                {mergedResume.projects.map((proj, i) => (
                  <div key={i} className="form-item">
                    {[
                      "name",
                      "role",
                      "industry",
                      "project_type",
                      "status",
                      "repository_link",
                      "media_url",
                    ].map((field) => (
                      <input
                        key={field}
                        value={proj[field] || ""}
                        onChange={(e) =>
                          updateField("projects", field, e.target.value, i)
                        }
                        placeholder={field.replace("_", " ")}
                        className="input-field"
                      />
                    ))}
                    <input
                      type="month"
                      value={proj.start_date ? formatDate(proj.start_date) : ""}
                      onChange={(e) =>
                        updateField("projects", "start_date", e.target.value, i)
                      }
                      placeholder="Start Date (YYYY-MM)"
                      className="input-field"
                    />
                    <input
                      type="month"
                      value={proj.end_date ? formatDate(proj.end_date) : ""}
                      onChange={(e) =>
                        updateField("projects", "end_date", e.target.value, i)
                      }
                      placeholder="End Date (YYYY-MM)"
                      className="input-field"
                    />
                    <div style={{ marginTop: "12px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontWeight: "500",
                        }}
                      >
                        Description (one bullet per line):
                      </label>
                      <textarea
                        value={(() => {
                          const bullets = descriptionToBullets(
                            proj.description
                          );
                          return bullets
                            .map((b) => (b.startsWith("•") ? b : `• ${b}`))
                            .join("\n");
                        })()}
                        onChange={(e) => {
                          const text = e.target.value;
                          const bullets = text
                            .split("\n")
                            .map((s) => s.trim().replace(/^[•\-\*]\s*/, ""))
                            .filter(Boolean);
                          updateField(
                            "projects",
                            "description",
                            bullets.join("\n"),
                            i
                          );
                        }}
                        placeholder="• Key feature 1&#10;• Key feature 2&#10;• Impact/Result"
                        className="textarea-field"
                        rows="5"
                      />
                    </div>
                    <textarea
                      value={proj.technologies?.join(", ") || ""}
                      onChange={(e) =>
                        updateField(
                          "projects",
                          "technologies",
                          e.target.value.split(",").map((s) => s.trim()),
                          i
                        )
                      }
                      placeholder="Technologies (comma separated)"
                      className="textarea-field textarea-tech"
                    />
                  </div>
                ))}
              </section>

              <section>
                <h3>Certifications</h3>
                {mergedResume.certifications.map((cert, i) => (
                  <div key={i} className="form-item">
                    {[
                      "name",
                      "organization",
                      "category",
                      "cert_number",
                      "document_url",
                    ].map((field) => (
                      <input
                        key={field}
                        value={cert[field] || ""}
                        onChange={(e) =>
                          updateField(
                            "certifications",
                            field,
                            e.target.value,
                            i
                          )
                        }
                        placeholder={field.replace("_", " ")}
                        className="input-field"
                      />
                    ))}
                    <input
                      type="month"
                      value={
                        cert.date_earned ? formatDate(cert.date_earned) : ""
                      }
                      onChange={(e) =>
                        updateField(
                          "certifications",
                          "date_earned",
                          e.target.value,
                          i
                        )
                      }
                      placeholder="Date Earned (YYYY-MM)"
                      className="input-field"
                    />
                    <input
                      type="month"
                      value={
                        cert.expiration_date
                          ? formatDate(cert.expiration_date)
                          : ""
                      }
                      onChange={(e) =>
                        updateField(
                          "certifications",
                          "expiration_date",
                          e.target.value,
                          i
                        )
                      }
                      placeholder="Expiration Date (YYYY-MM)"
                      className="input-field"
                      disabled={cert.does_not_expire}
                    />
                    <label className="checkbox-label">
                      Does Not Expire:
                      <input
                        type="checkbox"
                        checked={cert.does_not_expire}
                        onChange={(e) =>
                          updateField(
                            "certifications",
                            "does_not_expire",
                            e.target.checked,
                            i
                          )
                        }
                      />
                    </label>
                    <label className="checkbox-label">
                      Verified:
                      <input
                        type="checkbox"
                        checked={cert.verified}
                        onChange={(e) =>
                          updateField(
                            "certifications",
                            "verified",
                            e.target.checked,
                            i
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <p className="placeholder-message">
              🕐 Click "Reconcile via Gemini" to generate editable resume
            </p>
          )}
        </div>
      </div>

      <div className="button-container">
        <button
          onClick={reconcileWithGemini}
          disabled={loading}
          className="btn btn-primary"
        >
          🤖 Reconcile via Gemini
        </button>
        <button
          onClick={() => {
            if (!mergedResume) {
              alert("Please reconcile the resume first.");
              return;
            }

            navigate("/resume/final-review", {
              state: {
                sections: mergedResume,
                resumeTitle: `${resumeTitle} (Final Review)`,
                selectedTemplate,
              },
            });
          }}
          disabled={!mergedResume}
          className="btn btn-success"
        >
          ✅ Save & Continue
        </button>

        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          ← Back
        </button>
      </div>
    </div>
  );
}
