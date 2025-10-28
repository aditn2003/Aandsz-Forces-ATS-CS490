import { useState, useEffect } from "react";
import { api } from "../api";
import EmploymentForm from "./EmploymentForm";

export default function EmploymentSection({ token }) {
  const [employment, setEmployment] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  async function loadEmployment() {
    try {
      const { data } = await api.get("/api/employment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployment(data.employment || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteEmployment(id) {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await api.delete(`/api/employment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Employment deleted!");
      loadEmployment();
    } catch (err) {
      alert("Failed to delete entry");
    }
  }

  useEffect(() => {
    loadEmployment();
  }, []);

  return (
    <div>
      <h3>Employment History</h3>

      {!adding && !editingJob && (
        <button onClick={() => setAdding(true)}>+ Add Employment</button>
      )}

      {adding && (
        <EmploymentForm
          token={token}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            loadEmployment();
          }}
        />
      )}

      {editingJob && (
        <EmploymentForm
          token={token}
          job={editingJob}
          onCancel={() => setEditingJob(null)}
          onSaved={() => {
            setEditingJob(null);
            loadEmployment();
          }}
        />
      )}

      {!adding && !editingJob && (
        <>
          {employment.length === 0 ? (
            <p>No employment history yet.</p>
          ) : (
            employment
              .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
              .map((job) => (
                <div
                  key={job.id}
                  style={{
                    border: "1px solid #ddd",
                    padding: "1rem",
                    borderRadius: "10px",
                    marginBottom: "1rem",
                    background: "#fafafa",
                  }}
                >
                  <strong>{job.title}</strong> @ {job.company}
                  <p>
                    {job.location} | {job.start_date} →{" "}
                    {job.current ? "Present" : job.end_date}
                  </p>
                  <p>{job.description}</p>
                  <button onClick={() => setEditingJob(job)}>Edit</button>
                  <button
                    onClick={() => deleteEmployment(job.id)}
                    style={{ background: "crimson", marginLeft: "0.5rem" }}
                  >
                    Delete
                  </button>
                </div>
              ))
          )}
        </>
      )}
    </div>
  );
}

