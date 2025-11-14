import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "http://backend:4000");

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});



/* ============================================================
   COVER LETTER TEMPLATES — Phase 2 Actions

// ✏️ Edit template
export const updateTemplate = (id, data) =>
  api.put(`/api/cover-letter/templates/${id}`, data);

// 🗑 Delete template
export const deleteTemplate = (id) =>
  api.delete(`/api/cover-letter/templates/${id}`);

// 📄 Duplicate template
export const duplicateTemplate = (id) =>
  api.post(`/api/cover-letter/templates/${id}/duplicate`);


/* ============================================================
   COVER LETTER EXPORT
    // === Cover Letter Export ===
    export function exportPDF(payload) {
      return api.post("/api/cover-letter/export/pdf", payload, {
        responseType: "blob",
      });
    }

    export function exportDOCX(payload) {
      return api.post("/api/cover-letter/export/docx", payload, {
        responseType: "blob",
      });
    }

    export function exportTXT(payload) {
      return api.post("/api/cover-letter/export/text", payload, {
        responseType: "blob",
      });
    }
