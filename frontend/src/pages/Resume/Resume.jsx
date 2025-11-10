// src/pages/Resume/Resume.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import ResumeTemplateChooser from "../../components/ResumeTemplateChooser";

export default function Resume() {
  const navigate = useNavigate();

  // When user selects a template, move to editor (if you pass template data)
  function handleTemplateSelect(template) {
    navigate("/resume/editor", { state: { template } });
  }

  return (
    <div className="resume-page">
      <h2>📄 Resume Builder</h2>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Choose a template below to start customizing your resume.
      </p>

      {/* Use your existing chooser, passing the handler */}
      <ResumeTemplateChooser onTemplateSelect={handleTemplateSelect} />
    </div>
  );
}
