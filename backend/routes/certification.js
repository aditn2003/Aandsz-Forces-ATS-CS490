import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";


dotenv.config();
const { Pool } = pkg;
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ✅ Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ✅ Add Certification
router.post("/certifications", auth, async (req, res) => {
  try {
    const {
      name,
      organization,
      category,
      cert_number,
      date_earned,
      expiration_date,
      does_not_expire,
      document_url,
      renewal_reminder,
      verified,
    } = req.body;

    if (!name || !organization) {
      return res
        .status(400)
        .json({ error: "Certification name and organization are required" });
    }

    const safeDateEarned = date_earned || null;
    const safeExpiration = does_not_expire ? null : expiration_date || null;
    const safeReminder =
      renewal_reminder && renewal_reminder.trim() !== ""
        ? renewal_reminder
        : null;

    const { rows } = await pool.query(
      `INSERT INTO certifications
        (user_id, name, organization, category, cert_number, date_earned, expiration_date,
         does_not_expire, document_url, renewal_reminder, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.userId,
        name,
        organization,
        category || null,
        cert_number || null,
        safeDateEarned,
        safeExpiration,
        does_not_expire || false,
        document_url || null,
        safeReminder,
        verified || false,
      ]
    );

    res.json({ message: "Certification added", certification: rows[0] });
  } catch (e) {
    console.error("Add certification error:", e);
    res.status(500).json({ error: "Database error while adding certification" });
  }
});

// ✅ Get all certifications
router.get("/certifications", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM certifications WHERE user_id=$1 ORDER BY date_earned DESC",
      [req.userId]
    );
    res.json({ certifications: rows });
  } catch (e) {
    console.error("Error loading certifications:", e);
    res.status(500).json({ error: "Failed to load certifications" });
  }
});

// ✅ Update Certification (with null-safe date handling)
router.put("/certifications/:id", auth, async (req, res) => {
  const fields = [
    "name",
    "organization",
    "category",
    "cert_number",
    "date_earned",
    "expiration_date",
    "does_not_expire",
    "document_url",
    "renewal_reminder",
    "verified",
  ];

  const updates = [];
  const values = [];
  let i = 1;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      let value = req.body[field];

      // 🩵 Fix: Convert empty string dates to null
      if (
        ["date_earned", "expiration_date", "renewal_reminder"].includes(field)
      ) {
        value = value && value.trim() !== "" ? value : null;
      }

      updates.push(`${field}=$${i++}`);
      values.push(value);
    }
  }

  if (updates.length === 0)
    return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id, req.userId);

  const query = `
    UPDATE certifications
    SET ${updates.join(", ")}
    WHERE id=$${i++} AND user_id=$${i}
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, values);
    if (!rows.length) return res.status(404).json({ error: "Certification not found" });
    res.json({ message: "Certification updated", certification: rows[0] });
  } catch (e) {
    console.error("Error updating certification:", e);
    res.status(500).json({ error: "Update failed" });
  }
});

// ✅ Delete Certification
router.delete("/certifications/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM certifications WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Certification not found" });
    res.json({ message: "Certification deleted successfully" });
  } catch (e) {
    console.error("Error deleting certification:", e);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
