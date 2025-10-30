import React, { useState } from "react";
import { api } from "../api";

export default function CertificationForm({ token, cert, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: cert?.name || "",
    organization: cert?.organization || "",
    category: cert?.category || "",
    cert_number: cert?.cert_number || "",
    date_earned: cert?.date_earned || "",
    expiration_date: cert?.expiration_date || "",
    does_not_expire: cert?.does_not_expire || false,
    document_url: cert?.document_url || "",
    renewal_reminder: cert?.renewal_reminder || "",
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (cert?.id) {
        await api.put(`/api/certifications/${cert.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/api/certifications", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
    } catch (err) {
      alert("Failed to save certification");
      console.error(err);
    }
  }

  return (
    <form className="profile-box" onSubmit={handleSubmit}>
      <h4>{cert?.id ? "Edit Certification" : "Add Certification"}</h4>

      <label>Certification Name *</label>
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />

      <label>Issuing Organization *</label>
      <input
        value={form.organization}
        onChange={(e) => setForm({ ...form, organization: e.target.value })}
        required
      />

      <label>Certification Number / ID</label>
      <input
        value={form.cert_number}
        onChange={(e) => setForm({ ...form, cert_number: e.target.value })}
      />

      <label>Category</label>
      <select
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        <option value="">Select category</option>
        <option value="Technical">Technical</option>
        <option value="Industry-Specific">Industry-Specific</option>
        <option value="Soft Skills">Soft Skills</option>
        <option value="Management">Management</option>
      </select>

      <label>Date Earned *</label>
      <input
        type="date"
        value={form.date_earned}
        onChange={(e) => setForm({ ...form, date_earned: e.target.value })}
        required
      />

      <label>
        <input
          type="checkbox"
          checked={form.does_not_expire}
          onChange={(e) =>
            setForm({
              ...form,
              does_not_expire: e.target.checked,
              expiration_date: e.target.checked ? "" : form.expiration_date,
            })
          }
        />
        Does not expire
      </label>

      {!form.does_not_expire && (
        <>
          <label>Expiration Date</label>
          <input
            type="date"
            value={form.expiration_date}
            onChange={(e) =>
              setForm({ ...form, expiration_date: e.target.value })
            }
          />
        </>
      )}

      <label>Renewal Reminder</label>
      <input
        type="date"
        value={form.renewal_reminder}
        onChange={(e) =>
          setForm({ ...form, renewal_reminder: e.target.value })
        }
      />

      <label>Upload Certification Document (optional)</label>
      <input
        type="url"
        placeholder="Enter document URL (or integrate upload later)"
        value={form.document_url}
        onChange={(e) => setForm({ ...form, document_url: e.target.value })}
      />

      <div className="button-group">
        <button type="submit">Save</button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onCancel()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
