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
// ---------- PROFILE SUMMARY (for Dashboard) ----------
router.get("/profile/summary", auth, async (req, res) => {
  try {
    // TODO: adjust table names/columns if yours differ
    const q = (text, params) => pool.query(text, params);

    const [
      employment,
      skills,
      education,
      certifications,
      projects,
      info
    ] = await Promise.all([
      q("SELECT COUNT(*)::int AS c FROM employment WHERE user_id=$1", [req.userId]),
      q("SELECT COUNT(*)::int AS c FROM skills WHERE user_id=$1", [req.userId]),
      q("SELECT COUNT(*)::int AS c FROM education WHERE user_id=$1", [req.userId]),
      q("SELECT COUNT(*)::int AS c FROM certifications WHERE user_id=$1", [req.userId]),
      q("SELECT COUNT(*)::int AS c FROM projects WHERE user_id=$1", [req.userId]),
      q(
        `SELECT 
           (full_name IS NOT NULL AND full_name <> '') AS has_name,
           (email IS NOT NULL AND email <> '')         AS has_email,
           (phone IS NOT NULL AND phone <> '')         AS has_phone,
           (location IS NOT NULL AND location <> '')   AS has_location,
           (title IS NOT NULL AND title <> '')         AS has_title,
           (bio IS NOT NULL AND bio <> '')             AS has_bio,
           (picture_url IS NOT NULL AND picture_url <> '') AS has_picture
         FROM profiles WHERE user_id=$1`,
        [req.userId]
      )
    ]);

    const counts = {
      employment_count: employment.rows[0]?.c || 0,
      skills_count: skills.rows[0]?.c || 0,
      education_count: education.rows[0]?.c || 0,
      certifications_count: certifications.rows[0]?.c || 0,
      projects_count: projects.rows[0]?.c || 0,
    };

    const infoRow = info.rows[0] || {};
    const info_complete =
      !!infoRow.has_name &&
      !!infoRow.has_email &&
      !!infoRow.has_phone &&
      !!infoRow.has_location;

    // --- Simple completeness model (tweak weights as you like)
    const weights = {
      info: 25, employment: 25, skills: 20, education: 15, certifications: 10, projects: 5
    };

    let score = 0;
    if (info_complete) score += weights.info;
    if (counts.employment_count > 0) score += weights.employment;
    if (counts.skills_count >= 5) score += weights.skills;       // full points at >=5 skills
    else if (counts.skills_count > 0) score += Math.round(weights.skills / 2);

    if (counts.education_count > 0) score += weights.education;
    if (counts.certifications_count > 0) score += weights.certifications;
    if (counts.projects_count > 0) score += weights.projects;

    // --- Suggestions
    const suggestions = [];
    if (!info_complete) suggestions.push("Complete your basic profile info (name, email, phone, location).");
    if (counts.employment_count === 0) suggestions.push("Add at least one employment entry.");
    if (counts.skills_count < 5) suggestions.push("List 5+ skills to strengthen your profile.");
    if (counts.education_count === 0) suggestions.push("Add an education record.");
    if (counts.projects_count === 0) suggestions.push("Showcase a project you’re proud of.");
    if (!infoRow.has_picture) suggestions.push("Upload a professional profile picture.");
    if (!infoRow.has_title) suggestions.push("Add a headline (e.g., 'Software Engineer | ML Enthusiast').");

    // respond
    return res.json({
      info_complete,
      ...counts,
      completeness: { score: Math.max(0, Math.min(100, score)), suggestions }
    });
  } catch (err) {
    console.error("❌ Profile summary error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});


export default router;

