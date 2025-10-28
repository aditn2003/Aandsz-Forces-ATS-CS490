// src/components/Spinner.jsx
import React from "react";
import "../design/base.css";

export default function Spinner() {
  return (
    <div className="spinner" style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100px"
    }}>
      <img
        src="/logo.png"
        alt="Loading..."
        width="60"
        height="60"
        style={{
          animation: "spin 1.2s linear infinite",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}

