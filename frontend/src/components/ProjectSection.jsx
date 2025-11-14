import { useState, useEffect } from "react";
import { api } from "../api";
import ProjectForm from "./ProjectForm";

export default function ProjectSection({ token }) {
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(null);

  async function loadProjects() {
    try {
      const { data } = await api.get("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(data.projects);
    } catch (err) {
      console.error("❌ Error loading projects:", err);
    }
  }

  useEffect(() => {
    if (token) loadProjects();
  }, [token]);

  async function deleteProject(id) {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;
    try {
      await api.delete(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadProjects();
    } catch (err) {
      console.error("❌ Error deleting project:", err);
    }
  }

  return (
    <section className="profile-section">
      <button
        className="add-btn"
        onClick={() =>
          setProjectForm({
            name: "",
            description: "",
            role: "",
            start_date: "",
            end_date: "",
            technologies: "",
            repository_link: "",
            team_size: "",
            collaboration_details: "",
            outcomes: "",
            industry: "",
            project_type: "",
            media_url: "",
            status: "Planned",
          })
        }
      >
        ➕ Add Project
      </button>

      {projectForm && (
        <ProjectForm
          token={token}
          project={projectForm}
          onCancel={() => setProjectForm(null)}
          onSaved={() => {
            setProjectForm(null);
            loadProjects();
          }}
        />
      )}

      <div className="timeline">
        {projects.length === 0 ? (
          <p className="empty-text">No projects yet.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="timeline-item">
              <strong>{p.name}</strong> — {p.role}
              <small>
                {new Date(p.start_date).toLocaleDateString()} →{" "}
                {p.end_date
                  ? new Date(p.end_date).toLocaleDateString()
                  : "Present"}
              </small>
              <p>
                <b>Technologies:</b>{" "}
                {Array.isArray(p.technologies)
                  ? p.technologies.join(", ")
                  : p.technologies || "N/A"}{" "}
                <br />
                <b>Industry:</b> {p.industry || "N/A"} <br />
                <b>Status:</b> {p.status}
              </p>
              {p.repository_link && (
                <a
                  href={p.repository_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-link"
                >
                  View Repository
                </a>
              )}
              <div className="actions">
                <button onClick={() => setProjectForm(p)}>✏️ Edit</button>
                <button onClick={() => deleteProject(p.id)}>🗑️ Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
