import React from "react";

export default function Logo({ size = 100 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/logo.png"
        alt="ATS Logo"
        width={size}
        height={size}
        style={{ borderRadius: 8, objectFit: "contain" }}
      />
    </div>
  );
}
