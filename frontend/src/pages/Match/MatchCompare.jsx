// src/pages/Match/MatchCompare.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link } from "react-router-dom";
import "./MatchCompare.css";

export default function MatchCompare() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get(`/api/match/history/${userId}`);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error("❌ Error loading match history:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [userId]);

  const sorted = [...history].sort(
    (a, b) => b.match_score - a.match_score
  );

  return (
    <div className="compare-wrapper">
      <h1 className="compare-header">Match Score Comparison</h1>

      {loading && <p className="compare-loading">Loading match data…</p>}

      {!loading && sorted.length === 0 && (
        <p className="compare-empty">
          No match history found. Run match analysis first.
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <table className="compare-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Match Score</th>
              <th>Skills</th>
              <th>Experience</th>
              <th>Education</th>
              <th>Date</th>
              <th>Open</th>
            </tr>
          </thead>

          <tbody>
  {sorted.map((row) => (
    <tr key={row.id} className="compare-row">
      <td>
        <strong>{row.job_id}</strong>
        <div className="job-subtitle">{row.title} — {row.company}</div>
      </td>

      <td className="match-score">{row.match_score}%</td>
      <td>{row.skills_score}%</td>
      <td>{row.experience_score}%</td>
      <td>{row.education_score}%</td>

      <td>{new Date(row.created_at).toLocaleDateString()}</td>

      <td>
        <a className="compare-btn" href={`/job-match?job=${row.job_id}`}>
          View
        </a>
      </td>
    </tr>
  ))}
</tbody>

        </table>
      )}
    </div>
  );
}
