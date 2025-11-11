import React, { useEffect, useState } from "react";
import ProfileCompletenessMeter from "./ProfileCompleteness";
import SkillDistributionChart from "./SkillDist";
import "./ProfileDashboard.css";

export default function ProfileDashboard({ token, setActiveTab }) {
  // ✅ default to safe empty object to avoid null errors
  const [summary, setSummary] = useState({
    completeness: { score: 0, suggestions: [] },
    employment_count: 0,
    skills_count: 0,
    education_count: 0,
    projects_count: 0,
    skills_distribution: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:4000/api/profile/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        // ✅ merge defaults with backend data so nothing breaks
        setSummary((prev) => ({
          ...prev,
          ...data,
          completeness: {
            score: data?.completeness?.score ?? prev.completeness.score,
            suggestions:
              data?.completeness?.suggestions ?? prev.completeness.suggestions,
          },
          skills_distribution:
            data?.skills_distribution ?? prev.skills_distribution,
        }));
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [token]);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div className="dashboard">
      <h2>Profile Overview</h2>

      {/* ✅ Completion progress bar */}
      <ProfileCompletenessMeter data={summary.completeness} />

      {/* ✅ Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Employment</h3>
          <p>{summary.employment_count || 0} entries</p>
          <button onClick={() => setActiveTab("employment")}>➕ Add Job</button>
        </div>

        <div className="summary-card">
          <h3>Skills</h3>
          <p>{summary.skills_count || 0} listed</p>
          <button onClick={() => setActiveTab("skills")}>➕ Add Skill</button>
        </div>

        <div className="summary-card">
          <h3>Education</h3>
          <p>{summary.education_count || 0} records</p>
          <button onClick={() => setActiveTab("education")}>
            ➕ Add Education
          </button>
        </div>

        <div className="summary-card">
          <h3>Projects</h3>
          <p>{summary.projects_count || 0} entries</p>
          <button onClick={() => setActiveTab("projects")}>
            ➕ Add Project
          </button>
        </div>
      </div>

      {/* ✅ Skill chart */}
      <div className="charts-container">
        <SkillDistributionChart data={summary.skills_distribution || []} />
      </div>

      {/* ✅ Suggestions */}
      <div className="tips-section">
        <h3>Suggestions for Improvement</h3>
        <ul>
          {summary?.completeness?.suggestions?.length > 0 ? (
            summary.completeness.suggestions.map((tip, i) => (
              <li key={i}>💡 {tip}</li>
            ))
          ) : (
            <li>No suggestions available yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
