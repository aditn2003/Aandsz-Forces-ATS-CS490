import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";
import "./ResumeSetup.css";

export default function ResumeSetup() {
  const navigate = useNavigate();
  const location = useLocation();

  // Props passed from template selection page
  const { selectedTemplate, resumeTitle } = location.state || {};

  // Local state
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // 🧠 Redirect if no template selected
  if (!selectedTemplate) {
    return (
      <div className="resume-setup-container">
        <h2>⚠️ No template selected</h2>
        <p>Please return to the Resume Builder and pick one first.</p>
        <button className="btn-primary" onClick={() => navigate("/resume")}>
          ← Back to Templates
        </button>
      </div>
    );
  }

  // ✅ Ensure selectedTemplate includes filename
  const templateMap = {
    ats: { id: 1, name: "ATS Optimized", file: "ats-optimized" },
    creative: { id: 2, name: "Creative", file: "professional" },
  };

  const currentTemplate =
    selectedTemplate?.file === "professional" ||
    selectedTemplate?.name?.toLowerCase().includes("creative")
      ? templateMap.creative
      : templateMap.ats;

  console.log("🎨 Using template:", currentTemplate);

  // ✅ Load last saved job description
  useEffect(() => {
    const fetchLastDescription = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await api.get("/api/job-descriptions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.jobDescriptions?.length > 0) {
          setJobDescription(res.data.jobDescriptions[0].content);
        }
      } catch (err) {
        console.warn("⚠️ Could not load previous job descriptions:", err);
      }
    };
    fetchLastDescription();
  }, []);

  // ✅ Auto-save job description with debounce
  useEffect(() => {
    const delay = setTimeout(() => {
      if (jobDescription.trim() !== "") ensureJobDescriptionSaved();
    }, 1500);
    return () => clearTimeout(delay);
  }, [jobDescription]);

  // 🧠 Save job description
  async function ensureJobDescriptionSaved() {
    if (!jobDescription.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("⚠️ Please log in to continue.");
      navigate("/login");
      return;
    }

    try {
      setSaving(true);
      const res = await api.post(
        "/api/job-descriptions",
        { content: jobDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("✅ Auto-saved job description:", res.data);
    } catch (err) {
      console.error("❌ Failed to save job description:", err);
      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setSaving(false);
    }
  }

  // 🧠 Generate resume from existing profile
  async function handleUseExistingInfo() {
    try {
      setLoadingDraft(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await api.get("/api/resumes/from-profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/resume/editor", {
        state: {
          sections: res.data.sections || {},
          selectedTemplate: currentTemplate, // ✅ sends correct file + name
          resumeTitle,
          jobDescription,
        },
      });
    } catch (err) {
      console.error("❌ Error loading profile data:", err);
      setMessage("Failed to load data from profile.");
    } finally {
      setLoadingDraft(false);
    }
  }

  // 📤 Upload & parse existing resume
  async function handleImportResume(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await ensureJobDescriptionSaved();

      const formData = new FormData();
      formData.append("file", file); // ✅ Fixed: Changed from "resume" to "file"
      formData.append("title", resumeTitle);
      formData.append("template_id", currentTemplate.id);

      setUploading(true);
      setMessage("");

      const res = await api.post("/api/resumes/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("✅ Imported Resume:", res.data);

      navigate("/resume/editor", {
        state: {
          sections: res.data.sections || {},
          selectedTemplate: currentTemplate, // ✅ consistent
          resumeTitle,
          preview: res.data.preview || "",
          jobDescription,
        },
      });
    } catch (err) {
      console.error("❌ Error importing resume:", err);
      setMessage("Failed to import and parse your resume.");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow reselect
    }
  }

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="resume-setup-container">
      <h1>Build Your Resume</h1>
      <p>Import a resume or use your saved profile to get started.</p>

      {/* 🟢 Resume Options */}
      <div className="resume-options">
        <button
          type="button"
          className="resume-option-btn"
          onClick={handleUseExistingInfo}
          disabled={loadingDraft}
        >
          {loadingDraft ? "Loading..." : "Use Existing Information"}
        </button>

        <label className="resume-option-btn upload-btn">
          {uploading ? "Uploading..." : "Import Resume"}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleImportResume}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* 🟡 Status messages */}
      {uploading && (
        <p className="status-message">⏳ Uploading and parsing resume...</p>
      )}
      {message && <p className="status-message">{message}</p>}

      {/* 🔙 Back Button */}
      <button className="btn-back" onClick={() => navigate("/resume")}>
        ← Back to Resume Builder
      </button>
    </div>
  );
}
