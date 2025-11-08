// src/pages/Profile/CertificationsTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import CertificationSection from "../../components/CertificationSection";

export default function CertificationsTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box">
      <h3>Certifications</h3>
      <p>
        Add certifications and credentials that validate your expertise. Include
        details like issuing organization, category, and expiration date.
      </p>

      <CertificationSection token={token} />
    </div>
  );
}
