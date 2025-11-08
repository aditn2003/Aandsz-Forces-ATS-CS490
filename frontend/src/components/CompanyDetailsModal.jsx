import React, { useEffect, useState } from "react";
import "./CompanyDetails.css";

export default function CompanyDetailsModal({ token, companyName, onClose }) {
  const [company, setCompany] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [previewLogo, setPreviewLogo] = useState(null);

  // 🔄 Fetch company info
  async function fetchCompany() {
    try {
      const res = await fetch(
        `http://localhost:4000/api/companies/${companyName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 404) {
        setCompany({
          name: companyName,
          description: "No description yet.",
          industry: "",
          size: "",
          location: "",
          website: "",
          mission: "",
          glassdoor_rating: "N/A",
          contact_email: "",
          contact_phone: "",
          logo_url: "",
        });
        return;
      }
      const data = await res.json();
      setCompany(data);
      setForm(data);
    } catch (err) {
      console.error("❌ Failed to fetch company:", err);
    }
  }

  useEffect(() => {
    fetchCompany();
  }, [companyName]);

  // 💾 Save edits
  async function saveEdits() {
    try {
      const res = await fetch(
        `http://localhost:4000/api/companies/${companyName}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        const data = await res.json();
        alert("✅ Company updated!");
        setCompany(data.company || form);
        setEditMode(false);
      } else alert("❌ Failed to save changes");
    } catch (err) {
      console.error("❌ Save error:", err);
    }
  }

  // 🏙 Upload logo
  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewLogo(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch(
        `http://localhost:4000/api/companies/${companyName}/logo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert("✅ Logo updated!");
        // Immediately display new logo
        setCompany((prev) => ({
          ...prev,
          logo_url: data.company?.logo_url || data.logo_url,
        }));
        // Re-fetch to get latest DB state (and clear cache)
        await fetchCompany();
        setPreviewLogo(null);
      } else alert(data.error || "❌ Logo upload failed");
    } catch (err) {
      console.error("❌ Upload error:", err);
    }
  }

  if (!company)
    return (
      <div className="modal-overlay">
        <div className="company-modal">Loading company info...</div>
      </div>
    );

  // ✅ Resolve final image path (local backend or placeholder)
  const resolvedLogo =
    previewLogo ||
    (company.logo_url
      ? `http://localhost:4000${company.logo_url}?t=${Date.now()}`
      : "/company-placeholder.png");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="company-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2 className="company-title">{companyName}</h2>

        {/* 🏢 Logo + Upload */}
        <div className="company-logo-section">
          <img
            src={resolvedLogo}
            alt={`${companyName} logo`}
            className="company-logo-large"
          />
          <label htmlFor="logoUpload" className="upload-btn">
            Change Logo
            <input
              id="logoUpload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoUpload}
            />
          </label>
        </div>

        {/* 📋 Editable Info */}
        {!editMode ? (
          <div className="company-info">
            <p>
              <strong>Industry:</strong> {company.industry || "—"}
            </p>
            <p>
              <strong>Size:</strong> {company.size || "—"}
            </p>
            <p>
              <strong>Location:</strong> {company.location || "—"}
            </p>
            <p>
              <strong>Website:</strong>{" "}
              {company.website ? (
                <a
                  href={
                    company.website.startsWith("http")
                      ? company.website
                      : `https://${company.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  {company.website}
                </a>
              ) : (
                "—"
              )}
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {company.description || "No description yet."}
            </p>
            <p>
              <strong>Mission:</strong> {company.mission || "—"}
            </p>
            <p>
              <strong>Glassdoor Rating:</strong>{" "}
              {company.glassdoor_rating || "N/A"}
            </p>
            <p>
              <strong>Contact:</strong> {company.contact_email || "—"} /{" "}
              {company.contact_phone || "—"}
            </p>
            <button className="edit-btn" onClick={() => setEditMode(true)}>
              ✏️ Edit
            </button>
          </div>
        ) : (
          <div className="company-edit-form">
            {[
              "industry",
              "size",
              "location",
              "website",
              "description",
              "mission",
              "glassdoor_rating",
              "contact_email",
              "contact_phone",
            ].map((field) => (
              <label key={field}>
                {field
                  .replace("_", " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                <input
                  value={form[field] || ""}
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              </label>
            ))}
            <div className="button-group">
              <button className="save-btn" onClick={saveEdits}>
                💾 Save
              </button>
              <button
                className="btn-secondary"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
