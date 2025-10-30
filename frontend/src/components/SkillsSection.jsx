import React, { useEffect, useState } from "react";
import { api } from "../api";
import SkillsForm from "./SkillsForm";

/**
 * SkillsSection.jsx
 * Covers UC-026 & UC-027
 */
export default function SkillsSection({ token }) {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(null);

  // Load all skills
  async function loadSkills() {
    try {
      const { data } = await api.get("/skills", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSkills(data.skills || []);
    } catch (e) {
      console.error("Error loading skills:", e);
    }
  }

  // Update skill proficiency or category
  async function updateSkill(id, updates) {
    try {
      await api.put(`/skills/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSkills();
    } catch (e) {
      console.error("Error updating skill:", e);
    }
  }

  // Delete a skill
  async function deleteSkill(id) {
    if (!window.confirm("Delete this skill permanently?")) return;
    try {
      await api.delete(`/skills/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSkills();
    } catch (e) {
      console.error("Error deleting skill:", e);
    }
  }

  // Drag handlers
  function handleDragStart(e, skill) {
    setDragging(skill);
  }

  async function handleDrop(e, targetCategory) {
    e.preventDefault();
    if (!dragging || dragging.category === targetCategory) return;
    await updateSkill(dragging.id, { category: targetCategory });
    setDragging(null);
  }

  useEffect(() => {
    if (token) loadSkills();
  }, [token]);

  // Group by category
  const grouped = skills.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {});

  // Search filter
  const filteredGrouped = Object.entries(grouped)
    .map(([cat, arr]) => [
      cat,
      arr.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      ),
    ])
    .filter(([_, arr]) => arr.length);

  // CSV Export
  function exportCSV() {
    const csvRows = [["Category", "Skill", "Proficiency"]];
    skills.forEach((s) => {
      csvRows.push([s.category, s.name, s.proficiency]);
    });
    const blob = new Blob([csvRows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "skills_export.csv";
    link.click();
  }

  return (
    <section>
      <SkillsForm token={token} onAdded={loadSkills} />

      <input
        type="text"
        placeholder="Search skills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "0.5rem",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      />

      <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
        <button className="btn-secondary" onClick={exportCSV}>
          ⬇️ Export Skills (CSV)
        </button>
      </div>

      {filteredGrouped.length === 0 ? (
        <p>No skills yet.</p>
      ) : (
        filteredGrouped.map(([cat, arr]) => (
          <div
            key={cat}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, cat)}
            style={{
              marginTop: "1.5rem",
              background: "#f9f9ff",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 3px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{
                color: "#5a2cd1",
                borderBottom: "2px solid #ddd",
                paddingBottom: "0.4rem",
                marginBottom: "1rem",
              }}
            >
              {cat} ({arr.length})
            </h3>
            <ul className="employment-list">
              {arr.map((s) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  className="employment-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "0.8rem 1rem",
                    marginBottom: "0.6rem",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    cursor: "grab",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{s.name}</strong>
                    <span
                      className="badge"
                      style={{
                        background:
                          s.proficiency === "Expert"
                            ? "#8a2be2"
                            : s.proficiency === "Advanced"
                            ? "#6f42c1"
                            : s.proficiency === "Intermediate"
                            ? "#9370db"
                            : "#c7a0ff",
                        color: "#fff",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        marginLeft: "8px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {s.proficiency}
                    </span>
                  </div>

                  <div className="employment-actions" style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={s.proficiency}
                      onChange={(e) =>
                        updateSkill(s.id, { proficiency: e.target.value })
                      }
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Expert</option>
                    </select>

                    <select
                      value={s.category}
                      onChange={(e) =>
                        updateSkill(s.id, { category: e.target.value })
                      }
                    >
                      <option>Technical</option>
                      <option>Soft Skills</option>
                      <option>Languages</option>
                      <option>Industry-Specific</option>
                    </select>

                    <button
                      className="btn-delete"
                      onClick={() => deleteSkill(s.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
