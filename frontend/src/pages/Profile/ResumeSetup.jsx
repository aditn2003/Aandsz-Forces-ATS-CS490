import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";
import "./ResumeSetup.css";

export default function ResumeSetup() {
  const navigate = useNavigate();
  const location = useLocation();

  // Props passed from previous screen
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
        <button
          className="btn-primary"
          onClick={() => navigate("/profile/resume")}
        >
          ← Back to Templates
        </button>
      </div>
    );
  }

  // // ✅ Load last saved job description (if any)
  // useEffect(() => {
  //   const fetchLastDescription = async () => {
  //     try {
  //       const token = localStorage.getItem("token");
  //       if (!token) return;

  //       const res = await api.get("/api/job-descriptions", {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });

  //       if (res.data.jobDescriptions?.length > 0) {
  //         setJobDescription(res.data.jobDescriptions[0].content);
  //       }
  //     } catch (err) {
  //       console.warn("⚠️ Could not load previous job descriptions:", err);
  //     }
  //   };
  //   fetchLastDescription();
  // }, []);

  // // ✅ Auto-save job description with debounce
  // useEffect(() => {
  //   const delay = setTimeout(() => {
  //     if (jobDescription.trim() !== "") ensureJobDescriptionSaved();
  //   }, 1500);
  //   return () => clearTimeout(delay);
  // }, [jobDescription]);

  // // 🧠 Save job description to backend
  // async function ensureJobDescriptionSaved() {
  //   if (!jobDescription.trim()) return;

  //   const token = localStorage.getItem("token");
  //   if (!token) {
  //     alert("⚠️ Please log in to continue.");
  //     navigate("/login");
  //     return;
  //   }

  //   try {
  //     setSaving(true);
  //     const res = await api.post(
  //       "/api/job-descriptions",
  //       { content: jobDescription },
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  //     console.log("✅ Auto-saved job description:", res.data);
  //   } catch (err) {
  //     console.error("❌ Failed to save job description:", err);
  //     if (err.response?.status === 401) {
  //       alert("Session expired. Please log in again.");
  //       localStorage.removeItem("token");
  //       navigate("/login");
  //     }
  //   } finally {
  //     setSaving(false);
  //   }
  // }

  // 🧠 Generate resume draft from existing profile data
  async function handleUseExistingInfo() {
    try {
      setLoadingDraft(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await api.get("/api/resumes/from-profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/profile/resume/editor", {
        state: {
          sections: res.data.sections || {},
          selectedTemplate,
          resumeTitle,
        },
      });
    } catch (err) {
      console.error("❌ Error loading profile data:", err);
      setMessage("Failed to load data from profile.");
    } finally {
      setLoadingDraft(false);
    }
  }

  // 📤 Upload and parse an existing resume (PDF/DOCX)
  async function handleImportResume(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await ensureJobDescriptionSaved();

      const formData = new FormData();
      formData.append("resume", file);
      formData.append("title", resumeTitle);
      formData.append("template_id", selectedTemplate.id);

      setUploading(true);
      setMessage("");

      const res = await api.post("/api/resumes/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("✅ Imported Resume:", res.data);

      // ✅ FIX: send structured sections JSON, not text_snippet
      navigate("/profile/resume/editor", {
        state: {
          sections: res.data.sections || {},
          selectedTemplate,
          resumeTitle,
          preview: res.data.preview || "",
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
      <p>How would you like to start?</p>

      {/* Job Description Box
      <div className="job-desc-section">
        <h3>Paste Job Description</h3>
        <textarea
          className="job-desc-textarea"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
        {saving && <p className="saving-note">💾 Auto-saving...</p>}
      </div> */}

      {/* Resume Options */}
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

      {/* Status messages */}
      {uploading && (
        <p className="status-message">⏳ Uploading and parsing resume...</p>
      )}
      {message && <p className="status-message">{message}</p>}

      <button className="btn-back" onClick={() => navigate("/profile/resume")}>
        ← Back to Resume Builder
      </button>
    </div>
  );
}
