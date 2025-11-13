import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { useParams } from "react-router-dom";

export default function SkillsGapAnalysis() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");

  /* Load skills gap results */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // 🟢 CORRECT ENDPOINT
        const res = await api.get(`/api/skills-gap/${jobId}`);
        setData(res.data);

        // 🟢 CORRECT ENDPOINT
        const prog = await api.get("/api/skill-progress");

        const map = {};
        (prog.data.progress || []).forEach((p) => {
          map[p.skill.toLowerCase()] = p.status;
        });

        setProgress(map);

      } catch (e) {
        console.error(e);
        setError("Failed to load skill analysis.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  /* UPDATE progress */
  async function updateProgress(skill, status) {
    skill = skill.toLowerCase().trim();   // ← 🔥 CRITICAL FIX
  
    try {
      setSaving(skill);
  
      const res = await api.put(`/api/skill-progress/${skill}`, { status });
  
      setProgress((prev) => ({
        ...prev,
        [skill]: res.data.entry.status
      }));
    } catch (e) {
      console.error(e);
      alert("Failed to update progress");
    } finally {
      setSaving(null);
    }
  }
  
  

  // LOADING STATES
  if (loading) return <div className="p-4">Loading skill gap analysis…</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!data) return <div className="p-4">No data found.</div>;

  const {
    matchedSkills = [],
    weakSkills = [],
    missingSkills = [],
    learningResources = {},
    priorityList = []
  } = data;

  return (
    <div className="max-w-4xl mx-auto p-6">

      <h2 className="text-3xl font-bold mb-6">Skills Gap Analysis</h2>

      {/* PRIORITY SKILLS */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-2">Priority Skills</h3>

        {priorityList.length === 0 && (
          <p className="text-gray-500">No priority skills.</p>
        )}

        <div className="space-y-3">
          {priorityList.map((item, index) => (
            <div key={index} className="border rounded p-3 bg-gray-50 shadow-sm">

              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-medium">{item.skill}</p>
                  <p className="text-sm text-gray-600">
                    Status:{" "}
                    <span
                      className={
                        item.status === "missing"
                          ? "text-red-600"
                          : item.status === "weak"
                          ? "text-yellow-600"
                          : "text-green-700"
                      }
                    >
                      {item.status}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-blue-600">
                    Priority: {item.priority}/5
                  </p>
                </div>
              </div>

              {/* PROGRESS BUTTONS */}
              <div className="mt-3 flex gap-2">
                {["not started", "in progress", "completed"].map((st) => (
                  <button
                  key={st}
                  disabled={saving === item.skill.toLowerCase()}
                  onClick={() => updateProgress(item.skill.toLowerCase(), st)}
                  style={{
                    backgroundColor:
                      progress[item.skill.toLowerCase()] === st ? "#2563eb" : "white",
                    color:
                      progress[item.skill.toLowerCase()] === st ? "white" : "black",
                    border: "1px solid #ccc",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  {st}
                </button>
                
                
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* MISSING SKILLS */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2 text-red-600">Missing Skills</h3>
        <ul className="list-disc ml-6">
          {missingSkills.length === 0 && <li>None 🎉</li>}
          {missingSkills.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {/* WEAK SKILLS */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2 text-yellow-600">Weak Skills</h3>
        <ul className="list-disc ml-6">
          {weakSkills.length === 0 && <li>None 🎉</li>}
          {weakSkills.map((s, i) => (
            <li key={i}>{s.skill} — level {s.level}/5</li>
          ))}
        </ul>
      </div>

      {/* MATCHED SKILLS */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2 text-green-600">Matched Skills</h3>
        <ul className="list-disc ml-6">
          {matchedSkills.length === 0 && <li>No strong matches yet</li>}
          {matchedSkills.map((s, i) => (
            <li key={i}>{s.skill} — level {s.level}/5</li>
          ))}
        </ul>
      </div>

      {/* LEARNING RESOURCES */}
      <div>
        <h3 className="text-2xl font-semibold mb-3">Learning Resources</h3>

        {Object.keys(learningResources).length === 0 && (
          <p className="text-gray-500">No learning resources available.</p>
        )}

        {Object.keys(learningResources).map((skill, idx) => (
          <div key={idx} className="mb-6">
            <h4 className="font-medium text-lg">{skill}</h4>
            <ul className="ml-6 list-disc">
              {learningResources[skill].map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    {r.title}
                  </a>{" "}
                  — {r.platform}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </div>
  );
}
