import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import jwt from "jsonwebtoken";

dotenv.config();
const { Pool } = pkg;

const router = express.Router();

// ✅ Use the same database as in server.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- SAVE OR UPDATE PROFILE ----------
router.post("/profile", auth, async (req, res) => {
  const { full_name, email, phone, location, title, bio, industry, experience } = req.body;
  try {
    const existing = await pool.query("SELECT id FROM profiles WHERE user_id=$1", [req.userId]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE profiles SET full_name=$1, email=$2, phone=$3, location=$4,
         title=$5, bio=$6, industry=$7, experience=$8 WHERE user_id=$9`,
        [full_name, email, phone, location, title, bio, industry, experience, req.userId]
      );
    } else {
      await pool.query(
        `INSERT INTO profiles (user_id, full_name, email, phone, location, title, bio, industry, experience)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [req.userId, full_name, email, phone, location, title, bio, industry, experience]
      );
    }
    res.json({ message: "Profile saved successfully" });
  } catch (err) {
    console.error("❌ Profile save error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- FETCH PROFILE ----------
router.get("/profile", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT full_name, email, phone, location, title, bio, industry, experience, picture_url 
       FROM profiles WHERE user_id=$1`,
      [req.userId]
    );

    const profile = result.rows[0] || {};
    res.json({ profile });
  } catch (err) {
    console.error("❌ Profile fetch error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- UPDATE PROFILE PICTURE ----------
router.post("/profile/picture", auth, async (req, res) => {
  const { url } = req.body;
  try {
    // Store the full backend URL
    const fullUrl = `http://localhost:4000${url}`;

    // Check if the profile already exists
    const check = await pool.query("SELECT id FROM profiles WHERE user_id=$1", [req.userId]);
    if (check.rows.length === 0) {
      await pool.query("INSERT INTO profiles (user_id, picture_url) VALUES ($1, $2)", [
        req.userId,
        fullUrl,
      ]);
    } else {
      await pool.query("UPDATE profiles SET picture_url=$1 WHERE user_id=$2", [fullUrl, req.userId]);
    }

    res.json({ message: "✅ Profile picture saved successfully", picture_url: fullUrl });
  } catch (err) {
    console.error("❌ Error updating profile picture:", err);
    res.status(500).json({ error: "Database error while saving picture" });
  }
});

export default router;

