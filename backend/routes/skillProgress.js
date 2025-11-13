import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

/* AUTH */
function auth(req, res, next) {
    const header = req.headers.authorization;
  
    if (!header) {
      return res.status(401).json({ error: "No token" });
    }
  
    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }
  

/* =========================================
   GET all progress for the logged-in user
   GET /api/skill-progress
========================================= */
router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, status, updated_at
       FROM skill_progress
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.userId]
    );
    res.json({ progress: rows });
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.status(500).json({ error: "Failed to load progress" });
  }
});

/* =========================================
   UPDATE or INSERT progress for a skill
   PUT /api/skill-progress/:skill
========================================= */
router.put("/:skill", auth, async (req, res) => {
  let { skill } = req.params;
  const { status } = req.body;

  // Normalize skill name to lowercase
  skill = skill.trim().toLowerCase();

  if (!["not started", "in progress", "completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO skill_progress (user_id, skill, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, skill)
       DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
       RETURNING *`,
      [req.userId, skill, status]
    );

    res.json({ message: "Progress updated", entry: result.rows[0] });
  } catch (err) {
    console.error("Progress update error:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

export default router;
