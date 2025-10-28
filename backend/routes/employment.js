import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import jwt from "jsonwebtoken";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// --- Middleware ---
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const t = h.split(" ")[1];
    const d = jwt.verify(t, JWT_SECRET);
    req.userId = d.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- UC-023: Add Employment Entry ---
router.post("/", auth, async (req, res) => {
  const { title, company, location, start_date, end_date, is_current, description } = req.body;
  try {
    if (!title || !company || !start_date)
      return res.status(400).json({ error: "Title, company, and start date are required." });

    if (!is_current && end_date && new Date(start_date) > new Date(end_date))
      return res.status(400).json({ error: "Start date must be before end date." });

    await pool.query(
      `INSERT INTO employment_history (user_id, title, company, location, start_date, end_date, is_current, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.userId, title, company, location, start_date, is_current ? null : end_date, is_current, description]
    );
    res.json({ message: "Employment entry added successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- UC-024: View All ---
router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM employment_history WHERE user_id=$1 ORDER BY COALESCE(end_date, NOW()) DESC`,
      [req.userId]
    );
    res.json({ employment: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// --- UC-024: Edit Entry ---
router.put("/:id", auth, async (req, res) => {
  const { title, company, location, start_date, end_date, is_current, description } = req.body;
  try {
    await pool.query(
      `UPDATE employment_history SET title=$1, company=$2, location=$3,
       start_date=$4, end_date=$5, is_current=$6, description=$7
       WHERE id=$8 AND user_id=$9`,
      [title, company, location, start_date, is_current ? null : end_date, is_current, description, req.params.id, req.userId]
    );
    res.json({ message: "Employment entry updated." });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// --- UC-025: Delete Entry ---
router.delete("/:id", auth, async (req, res) => {
  try {
    const countRes = await pool.query(
      "SELECT COUNT(*) FROM employment_history WHERE user_id=$1",
      [req.userId]
    );
    if (Number(countRes.rows[0].count) <= 1)
      return res.status(400).json({ error: "Cannot delete last entry." });

    await pool.query("DELETE FROM employment_history WHERE id=$1 AND user_id=$2", [
      req.params.id,
      req.userId,
    ]);
    res.json({ message: "Employment entry deleted." });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;

