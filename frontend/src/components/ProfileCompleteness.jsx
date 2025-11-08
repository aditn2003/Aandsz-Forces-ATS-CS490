import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function ProfileCompletenessMeter({ data }) {
  const score = data?.score || 0;
  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";

  return (
    <div style={{ width: "140px", margin: "1rem auto", textAlign: "center" }}>
      <CircularProgressbar
        value={score}
        text={`${score}%`}
        styles={buildStyles({
          textColor: color,
          pathColor: color,
          trailColor: "#e5e7eb",
        })}
      />
      <p style={{ marginTop: "0.5rem", color }}>{label}</p>
    </div>
  );
}
