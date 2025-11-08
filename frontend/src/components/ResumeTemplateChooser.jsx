// src/components/ResumeTemplateChooser.jsx
import React, { useState, useEffect } from "react";
import { api } from "../api";
import "./ResumeTemplateChooser.css";

export default function ResumeTemplateChooser({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const staticTemplates = [
      {
        id: 1,
        name: "ATS Optimized",
        layout_type: "ats",
        color_scheme: "#000000ff",
        preview_url: "/assets/templates/ats.png",
        pdf_url: "/assets/pdfs/Resume Template - ATS.pdf",
      },
      {
        id: 2,
        name: "Creative",
        layout_type: "creative",
        color_scheme: "#000000ff",
        preview_url: "/assets/templates/creative.png",
        pdf_url: "/assets/pdfs/Resume Template - Creative.pdf",
      },
      {
        id: 3,
        name: "Two Column",
        layout_type: "two-column",
        color_scheme: "#246bdeff",
        preview_url: "/assets/templates/two-column.png",
        pdf_url: "/assets/pdfs/Resume Template - Two Column.pdf",
      },
      {
        id: 4,
        name: "Professional",
        layout_type: "professional",
        color_scheme: "#000000ff",
        preview_url: "/assets/templates/professional.png",
        pdf_url: "/assets/pdfs/Resume Template - Professional.pdf",
      },
    ];

    setTemplates(staticTemplates);
  }, []);

  // ✅ Handle resume import
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setUploading(true);
      const res = await api.post("/api/resumes/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("✅ Resume imported successfully!");
      console.log("Imported data:", res.data);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error uploading resume:", err);
      alert("❌ Failed to import resume.");
    } finally {
      setUploading(false);
    }
  }

  // ✅ Fetch data from existing user info
  async function handleUseExistingInfo() {
    try {
      const res = await api.get("/api/resumes/from-profile");
      alert("✅ Resume created using existing information!");
      console.log("Created:", res.data);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating from profile:", err);
      alert("❌ Failed to create resume from profile.");
    }
  }

  const categories = [
    "All",
    "ATS",
    "Simple",
    "Creative",
    "Two-column",
    "Professional",
  ];

  const filtered = templates.filter(
    (t) => filter === "All" || t.layout_type === filter.toLowerCase()
  );

  return (
    <div className="resume-template-page">
      {/* ===== HEADER ===== */}
      <header className="template-header">
        <h1>Resume Templates</h1>
        <p>
          Each resume template is designed to follow the exact rules you need to
          get hired faster. Choose one and start building your tailored resume!
        </p>

        <button
          className="create-resume-btn"
          onClick={() => setShowCreateModal(true)}
        >
          Create My Resume
        </button>

        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={filter === cat ? "active" : ""}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* ===== TEMPLATE GRID ===== */}
      <section className="template-grid">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`template-card ${
              selected?.id === t.id ? "selected" : ""
            }`}
          >
            <div className="template-image" onClick={() => setPreview(t)}>
              <img
                src={t.preview_url || "/assets/resume-placeholder.png"}
                alt={t.name}
              />
              <div className="template-hover">
                <button
                  className="use-template-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(t);
                    onSelectTemplate && onSelectTemplate(t);
                  }}
                >
                  Use this template
                </button>
              </div>
            </div>

            <div className="template-info">
              <h3>{t.name}</h3>
              <p className="layout-type">{t.layout_type}</p>
              <div className="template-meta">
                <span className="color-dot" style={{ color: t.color_scheme }}>
                  ●
                </span>
                <span className="file-icons">
                  <span className="file-icon">PDF</span>
                  <span className="file-icon">DOCX</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ===== CREATE RESUME MODAL ===== */}
      {showCreateModal && (
        <div
          className="preview-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-preview"
              onClick={() => setShowCreateModal(false)}
            >
              ✕
            </button>
            <h2>Create Resume</h2>
            <p>Choose how you’d like to start building your resume:</p>

            <div className="create-options">
              <button className="btn-primary" onClick={handleUseExistingInfo}>
                Use Existing Information
              </button>

              <label
                htmlFor="resume-upload"
                className="btn-secondary upload-btn"
              >
                {uploading ? "Uploading..." : "Import Resume"}
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  hidden
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP PREVIEW MODAL ===== */}
      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview" onClick={() => setPreview(null)}>
              ✕
            </button>
            <img
              src={preview.preview_url}
              alt={`${preview.name} Preview`}
              className="preview-image"
            />
          </div>
        </div>
      )}
    </div>
  );
}
