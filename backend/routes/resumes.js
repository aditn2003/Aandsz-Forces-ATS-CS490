// backend/routes/resumes.js
import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js"; // uses same auth as the rest of your app
import multer from "multer";
import { createRequire } from "module";
import { readFileSync } from "fs";

dotenv.config();

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ===========================
// 🔹 BASIC ROUTES
// ===========================

router.get("/test", (_req, res) => {
  res.json({ ok: true, message: "Resume routes reachable ✅" });
});

// ===========================
// 🔹 TEMPLATE ROUTES
// ===========================

router.get("/templates", auth, async (req, res) => {
  try {
    const q = `
      SELECT * FROM resume_templates
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY is_default DESC, name;
    `;
    const { rows } = await pool.query(q, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading templates:", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/templates", auth, async (req, res) => {
  const { name, layout_type, font, color_scheme } = req.body;
  try {
    const q = `
      INSERT INTO resume_templates (user_id, name, layout_type, font, color_scheme)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await pool.query(q, [
      req.userId,
      name,
      layout_type,
      font,
      color_scheme,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating template:", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.patch("/templates/:id/default", auth, async (req, res) => {
  const templateId = req.params.id;
  try {
    await pool.query(
      `UPDATE resume_templates SET is_default = false WHERE user_id = $1`,
      [req.userId]
    );

    const { rows } = await pool.query(
      `UPDATE resume_templates
         SET is_default = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [templateId, req.userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error setting default template:", err);
    res.status(500).json({ error: "Failed to set default template" });
  }
});

// ===========================
// 🔹 CREATE FINALIZED RESUME
// ===========================

router.post("/", auth, async (req, res) => {
  const { title, template_id, sections } = req.body;

  try {
    const insertQuery = `
      INSERT INTO resumes (user_id, title, template_id, sections, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [
      req.userId,
      title,
      template_id,
      sections || {},
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating resume:", err);
    res.status(500).json({ error: "Failed to create resume" });
  }
});

// ===========================
// 🔹 AUTOFILL FROM PROFILE (no DB insert)
// ===========================

router.get("/from-profile", auth, async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch all user sections in parallel
    const q = (text, params) => pool.query(text, params);
    const [profile, employment, education, skills, projects, certs] =
      await Promise.all([
        q("SELECT * FROM profiles WHERE user_id=$1", [userId]),
        q(
          "SELECT * FROM employment WHERE user_id=$1 ORDER BY start_date DESC",
          [userId]
        ),
        q(
          "SELECT * FROM education WHERE user_id=$1 ORDER BY graduation_date DESC NULLS LAST",
          [userId]
        ),
        q("SELECT * FROM skills WHERE user_id=$1 ORDER BY category, name", [
          userId,
        ]),
        q("SELECT * FROM projects WHERE user_id=$1 ORDER BY start_date DESC", [
          userId,
        ]),
        q(
          "SELECT * FROM certifications WHERE user_id=$1 ORDER BY date_earned DESC NULLS LAST",
          [userId]
        ),
      ]);

    const p = profile.rows[0] || {};

    // Construct sections JSON (used to prefill form)
    const sections = {
      summary: {
        full_name: p.full_name || "",
        title: p.title || "",
        contact: {
          email: p.email || "",
          phone: p.phone || "",
          location: p.location || "",
        },
        bio: p.bio || "",
      },
      experience: employment.rows.map((e) => ({
        title: e.title,
        company: e.company,
        location: e.location,
        start_date: e.start_date,
        end_date: e.end_date,
        current: e.current,
        description: e.description,
      })),
      education: education.rows.map((ed) => ({
        institution: ed.institution,
        degree: ed.degree_type,
        field: ed.field_of_study,
        graduation_date: ed.graduation_date,
        honors: ed.honors,
        gpa: ed.gpa,
      })),
      skills: skills.rows.map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
      })),
      projects: projects.rows.map((p) => ({
        name: p.name,
        description: p.description,
        role: p.role,
        technologies: p.technologies,
        start_date: p.start_date,
        end_date: p.end_date,
      })),
      certifications: certs.rows.map((c) => ({
        name: c.name,
        organization: c.organization,
        date_earned: c.date_earned,
        expiration_date: c.expiration_date,
      })),
    };

    // ✅ Return the JSON — frontend will prefill an editable form
    res.json({
      message: "✅ Draft resume sections generated successfully.",
      sections,
    });
  } catch (err) {
    console.error("❌ Error building draft resume:", err);
    res.status(500).json({ error: "Failed to build resume draft" });
  }
});

// ===========================
// 🔹 IMPORT (PDF/DOCX PARSING)
// ===========================

const upload = multer({ dest: "uploads/" });

router.post("/import", auth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = readFileSync(req.file.path);
    const data = await pdfParse(buffer);

    // In future: use NLP or LLM to segment text into structured fields
    res.json({
      message: "File parsed successfully (preview snippet).",
      text: data.text.slice(0, 1000),
    });
  } catch (err) {
    console.error("❌ Error parsing resume:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  }
});

export default router;
