import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js";
import multer from "multer";
import fs, { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph } from "docx";
import { renderTemplate } from "../utils/renderTemplate.js"; // ✅ Handlebars -> PDF
import puppeteer from "puppeteer"; // (kept to preserve your environment; not used directly here)

dotenv.config();

/* ------------------------------------------------------------------
   ⚙️ Setup
------------------------------------------------------------------ */
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: "uploads/" });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = path.join(__dirname, "..", "exports");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const UPLOAD_PREVIEW_DIR = path.resolve("uploads/resumes");
if (!fs.existsSync(UPLOAD_PREVIEW_DIR))
  fs.mkdirSync(UPLOAD_PREVIEW_DIR, { recursive: true });

/* ------------------------------------------------------------------
   🧩 DOCX fallback loader (lazy import)
------------------------------------------------------------------ */
let mammoth;
try {
  const mod = await import("mammoth");
  mammoth = mod.default || mod;
} catch {
  console.warn("⚠️ DOCX parsing disabled (mammoth not available)");
}

/* ------------------------------------------------------------------
   📄 PDF extraction
------------------------------------------------------------------ */
async function extractPdfText(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  let textContent = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    textContent += content.items.map((t) => t.str).join(" ") + "\n";
  }
  return textContent.trim();
}

/* ------------------------------------------------------------------
   🧠 Simple fallback parser (if Gemini fails)
------------------------------------------------------------------ */
function basicSectionParser(text = "") {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    summary: {
      full_name: lines[0] || "",
      title: "",
      contact: { email: "", phone: "", location: "" },
      bio: lines.slice(1, 5).join(" "),
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

/* ------------------------------------------------------------------
   🧩 Normalize Sections (Fix .map() errors & remove extra fields)
------------------------------------------------------------------ */
function normalizeSections(sections = {}) {
  const normalized = { ...sections };
  const arrayKeys = [
    "experience",
    "education",
    "projects",
    "certifications",
    "skills",
  ];

  for (const key of arrayKeys) {
    let val = normalized[key];
    if (!val) {
      normalized[key] = [];
      continue;
    }

    if (!Array.isArray(val)) {
      if (typeof val === "object") val = [val];
      else if (typeof val === "string")
        val = val
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      else val = [];
    }

    normalized[key] = val.map((item) => {
      if (typeof item !== "object") return item;
      const clean = { ...item };
      delete clean.id;
      delete clean.user_id;
      delete clean.created_at;
      delete clean.updated_at;
      return clean;
    });
  }

  // Summary is an object; make sure it's there
  normalized.summary =
    normalized.summary && typeof normalized.summary === "object"
      ? normalized.summary
      : {
          full_name: "",
          title: "",
          contact: { email: "", phone: "", location: "" },
          bio: "",
        };

  return normalized;
}

/* ------------------------------------------------------------------
   🧰 Helpers for templates
------------------------------------------------------------------ */

// Map UI names to file basenames (just in case)
function toTemplateFileBase(name = "") {
  const n = (name || "").toLowerCase().trim();
  // normalize spaces to dashes
  const dashed = n.replace(/\s+/g, "-");
  // explicit mapping if you ever change UI labels
  const map = {
    "ats optimized": "ats-optimized",
    "two column": "two-column",
    professional: "professional",
    creative: "creative",
  };
  return map[n] || dashed;
}

// Flatten `{sections}` into top-level fields expected by .hbs
function flattenForTemplate(sections) {
  return {
    summary: sections.summary || {},
    experience: sections.experience || [],
    education: sections.education || [],
    skills: sections.skills || [],
    projects: sections.projects || [],
    certifications: sections.certifications || [],
  };
}

/* ------------------------------------------------------------------
   ✅ ROUTE: Quick test
------------------------------------------------------------------ */
router.get("/test", (_req, res) =>
  res.json({ ok: true, message: "Resume routes reachable ✅" })
);

/* ------------------------------------------------------------------
   🔹 TEMPLATE ROUTES
------------------------------------------------------------------ */
router.get("/templates", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM resume_templates WHERE user_id=$1 OR user_id IS NULL ORDER BY is_default DESC, name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading templates:", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

/* ------------------------------------------------------------------
   🔹 CREATE / SAVE FINALIZED RESUME + PREVIEW
------------------------------------------------------------------ */
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      title,
      template_id = 1,
      template_name = "Professional",
      sections,
      format = "pdf",
    } = req.body;

    if (!title || !sections)
      return res.status(400).json({ error: "Missing title or sections" });

    // 🔹 Normalize structure
    sections = normalizeSections(sections);

    // 🔹 Save or update DB entry
    const { rows: existing } = await pool.query(
      "SELECT id FROM resumes WHERE user_id=$1 AND title=$2",
      [userId, title]
    );

    let resumeId;
    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE resumes
         SET sections=$1, template_id=$2, template_name=$3, format=$4, updated_at=NOW()
         WHERE id=$5 RETURNING id`,
        [sections, template_id, template_name, format, existing[0].id]
      );
      resumeId = rows[0].id;
    } else {
      const { rows } = await pool.query(
        `INSERT INTO resumes (user_id, title, template_id, template_name, sections, format, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
        [userId, title, template_id, template_name, sections, format]
      );
      resumeId = rows[0].id;
    }

    // ✅ Generate Handlebars template-based preview PDF
    const outputPath = path.join(
      UPLOAD_PREVIEW_DIR,
      `${userId}_${resumeId}.pdf`
    );
    const safeBase = toTemplateFileBase(template_name);
    // IMPORTANT: templates expect flattened fields, not { sections }
    await renderTemplate(safeBase, flattenForTemplate(sections), outputPath);

    const previewUrl = `/uploads/resumes/${userId}_${resumeId}.pdf`;
    await pool.query(`UPDATE resumes SET preview_url=$1 WHERE id=$2`, [
      previewUrl,
      resumeId,
    ]);

    res.json({
      message: "✅ Resume saved successfully",
      resume: {
        id: resumeId,
        title,
        template_name,
        preview_url: previewUrl,
      },
    });
  } catch (err) {
    console.error("❌ Save resume error:", err);
    res.status(500).json({ error: err.message || "Failed to save resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 FROM PROFILE
------------------------------------------------------------------ */
router.get("/from-profile", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (t, p) => pool.query(t, p);

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

    const sections = normalizeSections({
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
      experience: employment.rows,
      education: education.rows,
      skills: skills.rows,
      projects: projects.rows,
      certifications: certs.rows,
    });

    res.json({
      message: "✅ Draft resume sections generated successfully",
      sections,
      title: "Profile-based Resume",
    });
  } catch (err) {
    console.error("❌ Error building draft resume:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to build resume draft" });
  }
});

/* ------------------------------------------------------------------
   🔹 IMPORT (PDF/DOCX + GEMINI AI)
------------------------------------------------------------------ */
router.post("/import", auth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    console.log("📥 File received:", req.file.originalname);
    const buffer = readFileSync(req.file.path);
    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = "";

    if (ext === ".pdf") text = await extractPdfText(buffer);
    else if (ext === ".docx" && mammoth) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else return res.status(400).json({ error: "Unsupported file type" });

    if (!text.trim())
      return res.status(400).json({ error: "No readable text extracted." });

    console.log("🧾 Extracted text length:", text.length);

    const prompt = `
You are an ATS resume parser. Convert the resume text below into structured JSON with fields for summary, experience, education, skills, projects, and certifications.
Return ONLY valid JSON.
Resume text:
${text.slice(0, 15000)}
`;

    let structured;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });
      const result = await model.generateContent(prompt);
      structured = JSON.parse(result.response.text());
      console.log("✅ Gemini returned structured JSON");
    } catch (err) {
      console.error("⚠️ Gemini failed:", err.message);
      structured = basicSectionParser(text);
    }

    structured = normalizeSections(structured);

    res.json({
      message: "✅ Resume parsed successfully",
      sections: structured,
      preview: text.slice(0, 800),
    });
  } catch (err) {
    console.error("❌ Fatal import error:", err);
    res.status(500).json({ error: err.message || "Failed to parse resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 LIST / DELETE
------------------------------------------------------------------ */
router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, template_name, preview_url, created_at, format
       FROM resumes WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ resumes: rows });
  } catch (err) {
    console.error("❌ Fetch resumes error:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to load saved resumes" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM resumes WHERE id=$1 AND user_id=$2`, [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "✅ Resume deleted" });
  } catch (err) {
    console.error("❌ Delete resume error:", err);
    res.status(500).json({ error: err.message || "Failed to delete resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 EXPORT (PDF/DOCX/TXT/HTML)
------------------------------------------------------------------ */
router.get("/:id/download", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM resumes WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Resume not found" });

    const resume = rows[0];
    const sections =
      typeof resume.sections === "string"
        ? normalizeSections(JSON.parse(resume.sections))
        : normalizeSections(resume.sections);

    const format = (resume.format || "pdf").toLowerCase();
    const base = path.join(
      EXPORT_DIR,
      `${resume.title}_${resume.id}`.replace(/[^\w\-]/g, "_")
    );

    if (format === "pdf") {
      const pdfPath = `${base}.pdf`;
      const baseName = toTemplateFileBase(resume.template_name);
      await renderTemplate(baseName, flattenForTemplate(sections), pdfPath);
      return res.download(pdfPath);
    }

    if (format === "docx") {
      const children = [
        new Paragraph({ text: resume.title, heading: "Heading1" }),
      ];
      for (const [k, v] of Object.entries(sections)) {
        children.push(
          new Paragraph({ text: k.toUpperCase(), heading: "Heading2" })
        );
        children.push(new Paragraph({ text: JSON.stringify(v, null, 2) }));
      }
      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      const docxPath = `${base}.docx`;
      fs.writeFileSync(docxPath, buffer);
      return res.download(docxPath);
    }

    if (format === "txt") {
      const txtPath = `${base}.txt`;
      const sectionsToText = () =>
        Object.entries(sections)
          .map(([k, v]) => `${k.toUpperCase()}\n${JSON.stringify(v, null, 2)}`)
          .join("\n\n");
      fs.writeFileSync(txtPath, sectionsToText());
      return res.download(txtPath);
    }

    if (format === "html") {
      const htmlPath = `${base}.html`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${
        resume.title
      }</title></head><body><h1>${resume.title}</h1>${Object.entries(sections)
        .map(
          ([k, v]) =>
            `<h2>${k.toUpperCase()}</h2><pre>${JSON.stringify(
              v,
              null,
              2
            )}</pre>`
        )
        .join("")}</body></html>`;
      fs.writeFileSync(htmlPath, html);
      return res.download(htmlPath);
    }

    return res.status(400).json({ error: "Unsupported format" });
  } catch (err) {
    console.error("❌ Download resume error:", err);
    res.status(500).json({ error: err.message || "Failed to export resume" });
  }
});

export default router;
