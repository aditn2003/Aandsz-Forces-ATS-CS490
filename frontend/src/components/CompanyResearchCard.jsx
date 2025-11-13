import React from "react";
import "./CompanyDetails.css"; // reuses your styling if available

export default function CompanyResearchCard({ data, loading, error }) {
  if (loading) return <p>Loading company research...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!data) return null;

  const {
    company,
    basics,
    missionValuesCulture,
    executives,
    productsServices,
    competitiveLandscape,
    social,
    news,
    summary,
  } = data;

  return (
    <div className="cdl-card">
      <h2>{company}</h2>

      <section>
        <h3>Basics</h3>
        <ul>
          <li><strong>Industry:</strong> {basics?.industry || "N/A"}</li>
          <li><strong>Size:</strong> {basics?.size || "N/A"}</li>
          <li><strong>Headquarters:</strong> {basics?.headquarters || "N/A"}</li>
        </ul>
      </section>

      <section>
        <h3>Mission, Values, and Culture</h3>
        <p><strong>Mission:</strong> {missionValuesCulture?.mission || "—"}</p>
        <p><strong>Culture:</strong> {missionValuesCulture?.culture || "—"}</p>
        <p><strong>Values:</strong> {(missionValuesCulture?.values || []).join(", ") || "—"}</p>
      </section>

      <section>
        <h3>Executives</h3>
        {executives?.length ? (
          <ul>
            {executives.map((e, i) => (
              <li key={i}>{e.name} — {e.title}</li>
            ))}
          </ul>
        ) : <p>—</p>}
      </section>

      <section>
        <h3>Products & Services</h3>
        {productsServices?.length ? (
          <ul>{productsServices.map((p, i) => <li key={i}>{p}</li>)}</ul>
        ) : <p>—</p>}
      </section>

      <section>
        <h3>Competitive Landscape</h3>
        {competitiveLandscape?.length ? (
          <ul>{competitiveLandscape.map((c, i) => <li key={i}>{c}</li>)}</ul>
        ) : <p>—</p>}
      </section>

      <section>
        <h3>Social Media</h3>
        <ul>
          {social?.website && <li><a href={social.website} target="_blank">Website</a></li>}
          {social?.linkedin && <li><a href={social.linkedin} target="_blank">LinkedIn</a></li>}
          {social?.twitter && <li><a href={social.twitter} target="_blank">Twitter</a></li>}
          {social?.youtube && <li><a href={social.youtube} target="_blank">YouTube</a></li>}
        </ul>
      </section>

      <section>
        <h3>Summary</h3>
        <p>{summary || "—"}</p>
      </section>

      
    </div>
  );
}
