import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./Interviews.css";

export default function Interviews() {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState("");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!activeCompany) return;
    fetchInsights(activeCompany);
  }, [activeCompany]);

  async function fetchInsights(company) {
    try {
      setLoading(true);
      const res = await api.get(`/api/interview-insights?company=${company}`);
      setInsights(res.data.data);
    } catch (err) {
      console.error("Error fetching interview insights:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="interviews-container">
      <div className="companies-list">
        <h2>Companies</h2>
        {companies.map((c) => (
          <div
            key={c}
            className={`company-item ${c === activeCompany ? "active" : ""}`}
            onClick={() => setActiveCompany(c)}
          >
            {c}
          </div>
        ))}
      </div>

      <div className="insights-panel">
        {!activeCompany && <p>No companies found.</p>}

        {loading && <p>Loading interview insights…</p>}

        {!loading && insights && (
          <div className="interview-content">
            <h1>{activeCompany} — Interview Insights</h1>

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

            <section>
              <h2>Interview Preparation Checklist</h2>
              <ul>
                {insights.checklist.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
