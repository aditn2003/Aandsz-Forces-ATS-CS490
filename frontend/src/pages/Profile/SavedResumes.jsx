import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import "./SavedResumes.css";

export default function SavedResumes() {
  const { token } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔹 Load all saved resumes
  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/api/resumes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResumes(data.resumes || []);
      } catch (err) {
        console.error("❌ Failed to load saved resumes:", err);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  // 🔹 Loading + empty states
  if (loading) return <p className="saved-loading">Loading saved resumes...</p>;

  if (!resumes.length)
    return (
      <div className="saved-empty">
        <h2>No saved resumes yet</h2>
        <p>Build or import one from the Resume Builder page.</p>
      </div>
    );

  // 🔹 UI
  return (
    <div className="saved-resumes-container">
      <h1>Saved Resumes</h1>

      <div className="saved-resume-grid">
        {resumes.map((resume) => (
          <div className="saved-resume-card" key={resume.id}>
            {/* ✅ PDF Preview or Placeholder */}
            {resume.preview_url ? (
              <iframe
                src={`http://localhost:4000${resume.preview_url}`}
                title={resume.title}
                className="saved-preview"
              />
            ) : (
              <div className="saved-preview placeholder">
                <p>Preview not available</p>
              </div>
            )}

            <div className="saved-info">
              <h3>{resume.title || "Untitled Resume"}</h3>
              <p>{resume.template_name || "Unknown Template"}</p>

              {/* ✅ Action Buttons */}
              <div className="saved-actions">
                <button
                  className="btn-tertiary"
                  onClick={() =>
                    navigate("/resume/editor", {
                      state: {
                        resumeId: resume.id,
                        resumeTitle: resume.title,
                        template_name: resume.template_name,
                      },
                    })
                  }
                >
                  ✏️ View in Editor
                </button>

                <a
                  href={`http://localhost:4000${resume.preview_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  🔽 Download PDF
                </a>

                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      await api.delete(`/api/resumes/${resume.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      setResumes((r) => r.filter((x) => x.id !== resume.id));
                    } catch (err) {
                      alert("❌ Failed to delete resume.");
                    }
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
