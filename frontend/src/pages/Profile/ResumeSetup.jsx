import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";
import "./ResumeSetup.css";

export default function ResumeSetup() {
  const navigate = useNavigate();
  const location = useLocation();

  const { selectedTemplate, resumeTitle } = location.state || {};
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  if (!selectedTemplate) {
    return (
      <div className="resume-setup-container">
        <h2>⚠️ No template selected</h2>
        <p>Please return to the Resume Builder and pick one first.</p>
        <button
          className="btn-primary"
          onClick={() => navigate("/profile/resume")}
        >
          ← Back to Templates
        </button>
      </div>
    );
  }

  // 🧠 Fetch draft data from profile and open editor
  async function handleUseExistingInfo() {
    try {
      setLoadingDraft(true);
      setMessage("");

      const res = await api.get("/api/resumes/from-profile");

      // ✅ Navigate to editor page with draft data + template info
      navigate("/profile/resume/editor", {
        state: {
          sections: res.data.sections,
          selectedTemplate,
          resumeTitle,
        },
      });
    } catch (err) {
      console.error("Error loading profile data for resume:", err);
      setMessage("❌ Failed to load data from profile.");
    } finally {
      setLoadingDraft(false);
    }
  }

  // 📤 Import and parse PDF/DOC resume
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

      // navigate to editor with parsed text (for later AI/NLP parsing)
      navigate("/profile/resume/editor", {
        state: {
          parsedText: res.data.text_snippet,
          selectedTemplate,
          resumeTitle,
        },
      });
    } catch (err) {
      console.error("Error importing resume:", err);
      setMessage("❌ Failed to import resume file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="resume-setup-container">
      <h1>Build Your Resume</h1>
      <p>How would you like to start?</p>

      <div className="resume-options">
        {/* Existing Info Option */}
        <button
          type="button"
          className="resume-option-btn"
          onClick={handleUseExistingInfo}
          disabled={loadingDraft}
        >
          {loadingDraft ? "Loading..." : "Use Existing Information"}
        </button>

        {/* Import Option */}
        <button type="button" className="resume-option-btn upload-btn">
          Import Resume
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleImportResume}
          />
        </button>
      </div>

      {uploading && <p>⏳ Uploading and parsing resume...</p>}
      {message && <p className="status-message">{message}</p>}

      <button className="btn-back" onClick={() => navigate("/profile/resume")}>
        ← Back to Resume Builder
      </button>
    </div>
  );
}
