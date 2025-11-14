import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { useParams } from "react-router-dom";
import "./SkillsGapAnalysis.css";



export default function SkillsGapAnalysis() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");

  /* Load skills gap results */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // 🟢 CORRECT ENDPOINT
        const res = await api.get(`/api/skills-gap/${jobId}`);
        setData(res.data);

        // 🟢 CORRECT ENDPOINT
        const prog = await api.get("/api/skill-progress");

        const map = {};
        (prog.data.progress || []).forEach((p) => {
          map[p.skill.toLowerCase()] = p.status;
        });

        setProgress(map);

      } catch (e) {
        console.error(e);
        setError("Failed to load skill analysis.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  /* UPDATE progress */
  async function updateProgress(skill, status) {
    skill = skill.toLowerCase().trim();   // ← 🔥 CRITICAL FIX
  
    try {
      setSaving(skill);
  
      const res = await api.put(`/api/skill-progress/${skill}`, { status });
  
      setProgress((prev) => ({
        ...prev,
        [skill]: res.data.entry.status
      }));
    } catch (e) {
      console.error(e);
      alert("Failed to update progress");
    } finally {
      setSaving(null);
    }
  }
  
  

  // LOADING STATES
  if (loading) return <div className="p-4">Loading skill gap analysis…</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!data) return <div className="p-4">No data found.</div>;

  const {
    matchedSkills = [],
    weakSkills = [],
    missingSkills = [],
    learningResources = {},
    priorityList = []
  } = data;

  const levelMap = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4
  };

  return (
    <div className="skills-container">
  
      {/* HEADER */}
      <div className="skills-header">
        <h2>Skills Gap Analysis</h2>
        <p className="subtext">Personalized gap report based on this job posting</p>
      </div>
  
      {/* =======================
          PRIORITY SKILLS
      ======================= */}
      <div className="section">
        <h3 className="section-title">Priority Skills</h3>
  
        {priorityList.length === 0 && (
          <p className="empty-text">No priority skills assigned.</p>
        )}
  
        <div className="priority-grid">
          {priorityList.map((item, index) => (
            <div key={index} className="priority-card">
  
              {/* Header */}
              <div className="priority-card-header">
                <div className="skill-title">{item.skill}</div>
                <div
                  className={`skill-status status-${item.status.toLowerCase()}`}
                >
                  {item.status}
                </div>
              </div>
  
              {/* Priority bar */}
              <div className="priority-bar">
                <div
                  className="priority-bar-fill"
                  style={{ width: `${(item.priority / 5) * 100}%` }}
                />
              </div>
              <p className="priority-label">Priority: {item.priority}/5</p>
  
              {/* Progress buttons */}
              <div className="progress-buttons">
                {["not started", "in progress", "completed"].map((st) => {
                  const active = progress[item.skill.toLowerCase()] === st;
                  return (
                    <button
                      key={st}
                      className={`progress-btn ${active ? "active" : ""}`}
                      disabled={saving === item.skill.toLowerCase()}
                      onClick={() =>
                        updateProgress(item.skill.toLowerCase(), st)
                      }
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
  
      {/* =======================
          SUMMARY BLOCKS
      ======================= */}
      <div className="summary-cards">
        <div className="summary-card summary-missing">
          <h4>Missing Skills</h4>
          <ul>
            {missingSkills.length === 0 && <li>None 🎉</li>}
            {missingSkills.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
  
        <div className="summary-card summary-weak">
          <h4>Weak Skills</h4>
          <ul>
            {weakSkills.length === 0 && <li>None 🎉</li>}
            {weakSkills.map((s, i) => (
              <li key={i}>{s.skill} — level {s.level}/5</li>
            ))}
          </ul>
        </div>
  
        <div className="summary-card summary-matched">
          <h4>Matched Skills</h4>
          <ul>
            {matchedSkills.length === 0 && <li>No strong matches yet</li>}
            {matchedSkills.map((s, i) => {
  const clean = s.level?.toLowerCase();
  const lvl = levelMap[clean] ?? 1; // fallback to 1 if missing

  return (
    <li key={i}>
      {s.skill} — level {lvl}/4
    </li>
  );
})}


          </ul>
        </div>
      </div>
  
      {/* =======================
          LEARNING RESOURCES
      ======================= */}
      <div className="section">
        <h3 className="section-title">Learning Resources</h3>
  
        {Object.keys(learningResources).length === 0 && (
          <p className="empty-text">No learning resources available.</p>
        )}
  
        {Object.keys(learningResources).map((skill, idx) => (
          <div key={idx} className="resource-card">
            <h4 className="resource-skill-title">{skill}</h4>
  
            <ul>
              {learningResources[skill].map((r, i) => (
                <li key={i} className="resource-item">
                  <a href={r.url} target="_blank" className="resource-link">
                    {r.title}
                  </a>
                  <span className="resource-platform">{r.platform}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
  
    </div>
  );
  
}
