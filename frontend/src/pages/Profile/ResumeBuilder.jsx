import React, { useState } from "react";
import { api } from "../../api";
import ResumeTemplateChooser from "../../components/ResumeTemplateChooser";
import "./ResumeBuilder.css";
import { useNavigate } from "react-router-dom";
export default function ResumeBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [resumeTitle, setResumeTitle] = useState("Untitled Resume");
  const [message, setMessage] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  async function handleCreateResume() {
    if (!selectedTemplate) {
      setMessage("⚠️ Please select a template first.");
      return;
    }

    navigate("/profile/resume/setup", {
      state: { selectedTemplate, resumeTitle },
    });
  }

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
    } finally {
      setShowOptions(false);
    }
  }

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
      setShowOptions(false);
    }
  }

  return (
    <div className="resume-builder-container">
      <ResumeTemplateChooser onSelectTemplate={setSelectedTemplate} />

      {selectedTemplate && (
        <div className="template-summary">
          <p>
            <strong>Selected Template:</strong>{" "}
            <span className="highlight">{selectedTemplate.name}</span>
          </p>
        </div>
      )}

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

      {message && <p className="status-message">{message}</p>}

      {/* ===== Option Modal ===== */}
      {showOptions && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>How would you like to build your resume?</h3>
            <div className="modal-buttons">
              <button className="btn-primary" onClick={handleUseExistingInfo}>
                Use Existing Information
              </button>
              <label className="btn-secondary upload-btn">
                Import Resume
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleImportResume}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <button
              className="close-modal"
              onClick={() => setShowOptions(false)}
            >
              ✕
            </button>
            {uploading && <p>⏳ Uploading and parsing file...</p>}
          </div>
        </div>
      )}
    </div>
  );
}
