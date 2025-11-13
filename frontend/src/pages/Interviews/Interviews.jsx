import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./Interviews.css";

export default function Interviews() {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState("");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  // Local checklist progress
  const [checked, setChecked] = useState({});

  /* ===============================
     Load unique company names
  =============================== */
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get("/api/jobs");
        const unique = [...new Set(res.data.jobs.map((j) => j.company))];

        setCompanies(unique);
        if (unique.length > 0) setActiveCompany(unique[0]);
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }
    loadJobs();
  }, []);

  /* ===============================
     Load insights for selected company
  =============================== */
  useEffect(() => {
    if (!activeCompany) return;
    fetchInsights(activeCompany);
  }, [activeCompany]);

  async function fetchInsights(company) {
    try {
      setLoading(true);
      const res = await api.get(`/api/interview-insights?company=${company}`);
      setInsights(res.data.data);

      // restore saved checklist progress
      const saved = JSON.parse(localStorage.getItem(`checklist_${company}`) || "{}");
      setChecked(saved);

    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ===============================
     Handle checklist updates
  =============================== */
  function toggleChecklist(i, text) {
    const updated = {
      ...checked,
      [i]: !checked[i]
    };
    setChecked(updated);

    // persist per-company
    localStorage.setItem(`checklist_${activeCompany}`, JSON.stringify(updated));
  }

  /* ===============================
     REFRESH
  =============================== */
  function refresh() {
    if (activeCompany) fetchInsights(activeCompany);
  }

  return (
    <div className="interviews-container">

      {/* === Page Header === */}
      <h1 className="interview-title">Interview Insights</h1>

      {/* === Company Buttons (Matching Research UI) === */}
      <div className="company-buttons">
        {companies.map((c) => (
          <button
            key={c}
            className={`company-btn ${c === activeCompany ? "active" : ""}`}
            onClick={() => setActiveCompany(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* === Refresh Button === */}
      <button className="refresh-btn" onClick={refresh}>
        🔄 Refresh Insights
      </button>

      {/* === Main Content Card === */}
      <div className="insights-panel">
        {loading && <p className="loading-text">⏳ Loading interview insights…</p>}

        {!loading && insights && (
          <div className="interview-content">
            {/* ============================================= */}
            {/* Title */}
            {/* ============================================= */}
            <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "20px" }}>
              {activeCompany} — Interview Overview
            </h2>

            {/* ============================================= */}
            {/* Sections */}
            {/* ============================================= */}

            <section>
              <h2>Interview Process Overview</h2>
              <p>{insights.process}</p>
            </section>

            <section>
              <h2>Typical Stages</h2>
              <ul>
                {insights.stages.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Common Interview Questions</h2>
              <ul>
                {insights.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Interviewer Backgrounds</h2>
              <ul>
                {insights.interviewers.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Company-Specific Interview Format</h2>
              <p>{insights.format}</p>
            </section>

            <section>
              <h2>Preparation Recommendations</h2>
              <ul>
                {insights.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Timeline & Expectations</h2>
              <p>{insights.timeline}</p>
            </section>

            <section>
              <h2>Success Tips</h2>
              <ul>
                {insights.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </section>

            {/* ============================================= */}
            {/* Checklist (NOW INTERACTIVE + SAVES PROGRESS) */}
            {/* ============================================= */}
            <section>
              <h2>Interview Preparation Checklist</h2>

              {insights.checklist.map((item, i) => (
                <label key={i} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={checked[i] || false}
                    onChange={() => toggleChecklist(i, item)}
                  />
                  {item}
                </label>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
