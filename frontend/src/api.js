import axios from "axios";

// 👇 works both locally and inside docker
const baseURL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "http://backend:4000"); // 'backend' = service name in docker-compose

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});
