import React, { useState } from "react";
import { api } from "../../api";
import ResumeTemplateChooser from "../../components/ResumeTemplateChooser";
import "./ResumeBuilder.css";
import { useNavigate } from "react-router-dom";

export default function ResumeBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [resumeTitle, setResumeTitle] = useState("Untitled Resume");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // ✅ Go to the full Resume Setup page (Paste JD + Use Existing Info + Import)
  async function handleCreateResume() {
    if (!selectedTemplate) {
      setMessage("⚠️ Please select a template first.");
      return;
    }

    // Navigate to /resume/setup (not /profile/resume/setup)
    navigate("/resume/setup", {
      state: { selectedTemplate, resumeTitle },
    });
  }

  // ✅ Optional: handle direct use of existing info (if needed)
  async function handleUseExistingInfo() {
    try {
      const res = await api.post("/api/resumes", {
        title: resumeTitle,
        template_id: selectedTemplate.id,
        use_existing_info: true,
      });
      setMessage(`✅ Resume "${res.data.title}" created from profile data!`);
    } catch (err) {
      console.error("Error creating resume:", err);
      setMessage("❌ Failed to create resume from existing data.");
    }
  }

  // ✅ Optional: handle direct import (if needed)
  async function handleImportResume(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("title", resumeTitle);
    formData.append("template_id", selectedTemplate.id);

    try {
      setUploading(true);
      const res = await api.post("/api/resumes/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`✅ Imported and parsed "${res.data.title}" successfully!`);
    } catch (err) {
      console.error("Error importing resume:", err);
      setMessage("❌ Failed to import resume.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="resume-builder-container">
      {/* ===== Template Chooser ===== */}
      <ResumeTemplateChooser onSelectTemplate={setSelectedTemplate} />

      {selectedTemplate && (
        <div className="template-summary">
          <p>
            <strong>Selected Template:</strong>{" "}
            <span className="highlight">{selectedTemplate.name}</span>
          </p>
          <p className="subtext">
            Next, you’ll be able to paste a job description or import your
            existing resume.
          </p>
        </div>
      )}

      {/* ===== Resume Title ===== */}
      <div className="resume-title-section">
        <label htmlFor="resume-title">Resume Title</label>
        <input
          id="resume-title"
          type="text"
          className="resume-title-input"
          value={resumeTitle}
          onChange={(e) => setResumeTitle(e.target.value)}
          placeholder="e.g. SWE Internship Resume"
        />
      </div>

      {/* ===== Action Buttons ===== */}
      <div className="resume-actions">
        <button
          className="btn-primary"
          onClick={handleCreateResume}
          disabled={!selectedTemplate}
        >
          Create Resume
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setSelectedTemplate(null);
            setMessage("");
          }}
        >
          Reset Selection
        </button>
      </div>

      {/* ===== Status Message ===== */}
      {message && <p className="status-message">{message}</p>}

      {/* ===== Optional Upload Loading Message ===== */}
      {uploading && <p className="status-message">⏳ Uploading file...</p>}
    </div>
  );
}
