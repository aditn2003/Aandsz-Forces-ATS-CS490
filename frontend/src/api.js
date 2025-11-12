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

// === Company Research ===
export async function fetchCompanyResearch(company) {
  try {
    const res = await api.get(`/api/company-research`, {
      params: { company },
    });
    return res.data.data; // returns the research payload
  } catch (err) {
    console.error("❌ Error fetching company research:", err);
    throw new Error(
      err.response?.data?.message || "Failed to fetch company research"
    );
  }
}