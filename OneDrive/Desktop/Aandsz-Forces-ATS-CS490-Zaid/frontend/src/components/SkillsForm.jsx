import React, { useState } from "react";
import { api } from "../api";

export default function SkillsForm({ token, onAdded }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [proficiency, setProficiency] = useState("Beginner");
  const [commonSkills] = useState([
    "JavaScript",
    "Python",
    "React",
    "SQL",
    "C++",
    "Communication",
    "Leadership",
    "Problem Solving",
    "Machine Learning",
    "Project Management",
    "Docker",
    "Kubernetes",
    "HTML",
    "CSS",
    "Teamwork",
  ]);

  // Add new skill
  async function addSkill() {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Please enter a skill name.");
      return;
    }

    try {
      await api.post(
        "/skills",
        { name: trimmed, category, proficiency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setName("");
      setCategory("Technical");
      setProficiency("Beginner");
      if (onAdded) onAdded(); // refresh list in SkillsSection
    } catch (err) {
      const msg =
        err.response?.data?.error || "Failed to add skill. Try again.";
      alert(msg);
    }
  }

  return (
    <div className="card-container" style={{ marginBottom: "1.5rem" }}>
      <h3>Add Skill</h3>

      {/* Skill Name */}
      <input
        list="common-skills"
        placeholder="Enter skill name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <datalist id="common-skills">
        {commonSkills.map((s, i) => (
          <option key={i} value={s} />
        ))}
      </datalist>

      {/* Skill Category */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ marginTop: "0.8rem", width: "100%" }}
      >
        <option>Technical</option>
        <option>Soft Skills</option>
        <option>Languages</option>
        <option>Industry-Specific</option>
      </select>

      {/* Skill Proficiency */}
      <select
        value={proficiency}
        onChange={(e) => setProficiency(e.target.value)}
        style={{ marginTop: "0.8rem", width: "100%" }}
      >
        <option>Beginner</option>
        <option>Intermediate</option>
        <option>Advanced</option>
        <option>Expert</option>
      </select>

      <button
        className="btn-success"
        style={{ marginTop: "1rem" }}
        onClick={addSkill}
      >
        ➕ Add Skill
      </button>
    </div>
  );
}
