import express from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

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

router.post("/section-presets", auth, async (req, res) => {
  const { section_name, preset_name, section_data } = req.body;
  if (!section_name || !preset_name || !section_data)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, section_name, preset_name, JSON.stringify(section_data)]
    );
    res.json({ message: "✅ Section preset saved", preset: rows[0] });
  } catch (err) {
    console.error("❌ Save preset error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Fetch all presets for a given section
router.get("/section-presets/:section_name", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, preset_name, section_data, created_at
       FROM section_presets
       WHERE user_id = $1 AND section_name = $2
       ORDER BY created_at DESC`,
      [req.userId, req.params.section_name]
    );
    res.json({ presets: rows });
  } catch (err) {
    console.error("❌ Fetch section presets error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Delete preset
router.delete("/section-presets/:id", auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM section_presets WHERE id=$1 AND user_id=$2`, [
      req.params.id,
      req.userId,
    ]);
    res.json({ message: "🗑️ Preset deleted" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
