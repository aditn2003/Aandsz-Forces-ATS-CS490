import express from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// 🔐 Auth middleware
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "No token" });
  try {
    const token = h.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// 📝 Save job description
router.post("/job-descriptions", auth, async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === "")
    return res.status(400).json({ error: "Job description cannot be empty" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO job_descriptions (user_id, content) VALUES ($1, $2) RETURNING *`,
      [req.userId, content]
    );
    res.json({ message: "✅ Job description saved", jobDescription: rows[0] });
  } catch (err) {
    console.error("❌ Save job description error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📋 Fetch all saved descriptions
router.get("/job-descriptions", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, content, created_at FROM job_descriptions WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ jobDescriptions: rows });
  } catch (err) {
    console.error("❌ Fetch job descriptions error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
