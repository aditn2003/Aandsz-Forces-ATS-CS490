import React, { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import "./SavedResumes.css";

export default function SavedResumes() {
  const [resumes, setResumes] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const token = localStorage.getItem("token");
  const dropdownRefs = useRef({});

  useEffect(() => {
    async function fetchResumes() {
      try {
        const { data } = await api.get("/api/resumes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const unique = Object.values(
          (data.resumes || []).reduce((acc, resume) => {
            const key = resume.title || "Untitled Resume";
            if (!acc[key]) acc[key] = { ...resume, formats: new Set() };
            acc[key].formats.add(resume.format || "pdf");
            return acc;
          }, {})
        ).map((r) => ({
          ...r,
          formats: Array.from(r.formats),
        }));

        setResumes(unique);
      } catch (err) {
        console.error("❌ Failed to load resumes:", err);
      }
    }
    fetchResumes();
  }, [token]);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      Object.keys(dropdownRefs.current).forEach((id) => {
        const ref = dropdownRefs.current[id];
        if (ref && !ref.contains(e.target)) {
          setOpenDropdown(null);
        }
      });
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDownload = (id, format) => {
    window.open(
      `http://localhost:4000/api/resumes/${id}/download?format=${format}`,
      "_blank"
    );
    setOpenDropdown(null);
  };

  return (
    <div className="profile-box saved-resumes-container">
      <h2>📁 Saved Resumes</h2>
      {resumes.length === 0 && <p>No saved resumes yet.</p>}

      <ul className="saved-resume-list">
        {resumes.map((r) => (
          <li key={r.id} className="saved-resume-item">
            <div className="resume-info">
              <strong>{r.title || "Untitled Resume"}</strong>
              <span className="date">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>

            <div
              className="sr-download-group"
              ref={(el) => (dropdownRefs.current[r.id] = el)}
            >
              <button
                className="sr-dropdown-btn"
                onClick={() =>
                  setOpenDropdown(openDropdown === r.id ? null : r.id)
                }
              >
                ⬇ Download ▾
              </button>

              <div
                className={`sr-dropdown-menu ${
                  openDropdown === r.id ? "show" : ""
                }`}
              >
                {["pdf", "docx", "txt", "html"].map((fmt) => (
                  <button
                    key={fmt}
                    className="sr-dropdown-item"
                    onClick={() => handleDownload(r.id, fmt)}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
