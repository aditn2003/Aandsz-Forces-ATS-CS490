import React, { useEffect, useState } from "react";
import { api } from "../api";
import CertificationForm from "./CertificationForm";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CertificationSection({ token }) {
  const [certifications, setCertifications] = useState([]);
  const [certForm, setCertForm] = useState(null);
  const [search, setSearch] = useState("");

  async function loadCertifications() {
    try {
      const { data } = await api.get("/api/certifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCertifications(data.certifications || []);
    } catch (err) {
      console.error("Error loading certifications:", err);
    }
  }

  async function deleteCert(id) {
    if (!window.confirm("Delete this certification?")) return;
    await api.delete(`/api/certifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loadCertifications();
  }

  useEffect(() => {
    if (token) loadCertifications();
  }, [token]);

  const filtered = certifications.filter((c) =>
    c.organization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="profile-box">
      {!certForm && (
        <button className="btn-success" onClick={() => setCertForm({})}>
          ➕ Add Certification
        </button>
      )}

      {certForm && (
        <CertificationForm
          token={token}
          cert={certForm}
          onCancel={() => setCertForm(null)}
          onSaved={() => {
            setCertForm(null);
            loadCertifications();
          }}
        />
      )}

      {!certForm && (
        <>
          <input
            type="text"
            placeholder="Search by organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginTop: "1rem", marginBottom: "1rem", width: "100%" }}
          />

          {filtered.length === 0 ? (
            <p>No certifications yet.</p>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="timeline-item">
                <div>
                <strong>{c.name}</strong> — {c.organization}
                </div>
                <small>
                  {formatDate(c.date_earned)} →{" "}
                  {c.does_not_expire
                    ? "Does not expire"
                    : formatDate(c.expiration_date)}
                </small>
                <p>
                  ID: {c.cert_number || "N/A"} <br />
                  Category: {c.category || "General"}
                </p>
                {c.document_url && (
                  <a
                    href={c.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📄 View Document
                  </a>
                )}
                <p>
                  Status:{" "}
                  {c.verified ? (
                    <span style={{ color: "green" }}>✅ Verified</span>
                  ) : (
                    <span style={{ color: "orange" }}>⏳ Pending Verification</span>
                  )}
                </p>
                {c.renewal_reminder && (
                  <p>🔔 Renewal Reminder: {formatDate(c.renewal_reminder)}</p>
                )}
                <div className="employment-actions">
                  <button className="btn-edit" onClick={() => setCertForm(c)}>
                    ✏️ Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => deleteCert(c.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
