import express from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Save new preset
router.post("/resume-presets", auth, async (req, res) => {
  const { name, section_order, visible_sections } = req.body;
  if (!name || !Array.isArray(section_order))
    return res.status(400).json({ error: "Invalid data" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO resume_presets (user_id, name, section_order, visible_sections)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, name, section_order, visible_sections]
    );
    res.json({ preset: rows[0], message: "✅ Preset saved successfully" });
  } catch (err) {
    console.error("❌ Preset save error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all presets
router.get("/resume-presets", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, section_order, visible_sections, created_at
       FROM resume_presets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ presets: rows });
  } catch (err) {
    console.error("❌ Fetch presets error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete a preset
router.delete("/resume-presets/:id", auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM resume_presets WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    res.json({ message: "🗑️ Preset deleted" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
