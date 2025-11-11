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

dotenv.config();

/* ------------------------------------------------------------------
   ⚙️ Setup
------------------------------------------------------------------ */
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: "uploads/" });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure export folder exists
const EXPORT_DIR = path.join(__dirname, "..", "exports");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

/* ------------------------------------------------------------------
   🧩 DOCX fallback loader (lazy import)
------------------------------------------------------------------ */
let mammoth;
try {
  const mod = await import("mammoth");
  mammoth = mod.default || mod;
} catch {
  mammoth = null;
  console.warn("⚠️ DOCX parsing disabled (mammoth not available)");
}

/* ------------------------------------------------------------------
   📄 PDF extraction (pdfjs-dist) — Buffer → Uint8Array
------------------------------------------------------------------ */
async function extractPdfText(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  let textContent = "";

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((i) => i.str).join(" ");
    textContent += pageText + "\n";
  }

  return textContent.trim();
}

/* ------------------------------------------------------------------
   🧠 Simple text parser fallback (if Gemini fails)
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
    const userId = req.user.id;
    const { rows } = await pool.query(
      `
      SELECT *
      FROM resume_templates
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY is_default DESC, name;
      `,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading templates:", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/templates", auth, async (req, res) => {
  const userId = req.user.id;
  const { name, layout_type, font, color_scheme } = req.body;
  try {
    const { rows } = await pool.query(
      `
      INSERT INTO resume_templates (user_id, name, layout_type, font, color_scheme)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [userId, name, layout_type, font, color_scheme]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating template:", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.patch("/templates/:id/default", auth, async (req, res) => {
  const userId = req.user.id;
  const templateId = req.params.id;
  try {
    await pool.query(
      `UPDATE resume_templates SET is_default = false WHERE user_id = $1`,
      [userId]
    );
    const { rows } = await pool.query(
      `
      UPDATE resume_templates
      SET is_default = true
      WHERE id = $1 AND user_id = $2
      RETURNING *;
      `,
      [templateId, userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error setting default template:", err);
    res.status(500).json({ error: "Failed to set default template" });
  }
});

/* ------------------------------------------------------------------
   🔹 CREATE / SAVE FINALIZED RESUME
   (used by ResumeEditor "Save as PDF/DOCX/TXT/HTML")
------------------------------------------------------------------ */
// backend/routes/resumes.js
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, template_id = 1, sections, format = "pdf" } = req.body;

    if (!title || !sections)
      return res.status(400).json({ error: "Title and sections are required" });

    // 🟢 If resume with same title already exists, update it instead of inserting duplicate
    const { rows: existing } = await pool.query(
      `SELECT id FROM resumes WHERE user_id=$1 AND title=$2`,
      [userId, title]
    );

    let resume;
    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE resumes
         SET sections=$1, template_id=$2, format=$3, updated_at=NOW()
         WHERE id=$4
         RETURNING id, title, format, updated_at`,
        [sections, template_id, format, existing[0].id]
      );
      resume = rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO resumes (user_id, title, template_id, sections, format, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, title, format, created_at`,
        [userId, title, template_id, sections, format]
      );
      resume = rows[0];
    }

    res.json({ message: "✅ Resume saved", resume });
  } catch (err) {
    console.error("❌ Save resume error:", err);
    res.status(500).json({ error: "Failed to save resume" });
  }
});
router.get("/:id/download", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const format = req.query.format || "pdf";

    const { rows } = await pool.query(
      "SELECT * FROM resumes WHERE id=$1 AND user_id=$2",
      [id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const resume = rows[0];
    const filename = `${resume.title || "resume"}.${format}`;

    // send a simple test file first
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/plain");
    res.send(`This is a ${format.toUpperCase()} export for ${resume.title}`);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Failed to download" });
  }
});

/* ------------------------------------------------------------------
   🔹 AUTOFILL FROM PROFILE
------------------------------------------------------------------ */
router.get("/from-profile", auth, async (req, res) => {
  try {
    const userId = req.user.id;
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
      projects: projects.rows.map((pRow) => ({
        name: pRow.name,
        description: pRow.description,
        role: pRow.role,
        technologies: pRow.technologies,
        start_date: pRow.start_date,
        end_date: pRow.end_date,
      })),
      certifications: certs.rows.map((c) => ({
        name: c.name,
        organization: c.organization,
        date_earned: c.date_earned,
        expiration_date: c.expiration_date,
      })),
    };

    res.json({
      message: "✅ Draft resume sections generated successfully.",
      sections,
      title: "Profile-based Resume",
    });
  } catch (err) {
    console.error("❌ Error building draft resume:", err);
    res.status(500).json({ error: "Failed to build resume draft" });
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

    // STEP 1: Extract text
    try {
      if (ext === ".pdf") {
        console.log("🔹 Parsing PDF (pdfjs-dist)...");
        text = await extractPdfText(buffer);
      } else if (ext === ".docx" && mammoth) {
        console.log("🔹 Parsing DOCX (mammoth)...");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } else {
        return res.status(400).json({
          error: "Unsupported file type. Upload PDF or DOCX.",
        });
      }
    } catch (parseErr) {
      console.error("❌ PDF/DOCX parsing failed:", parseErr);
      return res.status(500).json({
        error: "Failed to extract text",
        details: parseErr.message,
      });
    }

    if (!text.trim()) {
      console.warn("⚠️ No readable text extracted.");
      return res.status(400).json({
        error: "File text could not be read (possibly scanned).",
      });
    }

    console.log("🧾 Extracted resume length:", text.length);

    // STEP 2: Gemini parsing
    const prompt = `
You are an ATS resume parser. Convert the resume text below into structured JSON strictly matching this schema:
{
  "summary": { "full_name": string, "title": string, "contact": { "email": string, "phone": string, "location": string }, "bio": string },
  "experience": [{ "title": string, "company": string, "location": string, "start_date": string, "end_date": string, "current": boolean, "description": string }],
  "education": [{ "institution": string, "degree": string, "field": string, "graduation_date": string, "honors": string, "gpa": string }],
  "skills": [{ "name": string, "category": string, "proficiency": string }],
  "projects": [{ "name": string, "description": string, "role": string, "technologies": string, "start_date": string, "end_date": string }],
  "certifications": [{ "name": string, "organization": string, "date_earned": string, "expiration_date": string }]
}
Return ONLY valid JSON.

Resume text:
${text.slice(0, 15000)}
`;

    console.log("🚀 Sending to Gemini...");
    let structured = {};

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();
      structured = JSON.parse(aiResponse);
      console.log("✅ Gemini returned structured JSON");
    } catch (err) {
      console.error("⚠️ Gemini failed:", err.message);
      structured = basicSectionParser(text);
    }

    res.json({
      message: "✅ Resume parsed successfully",
      sections: structured,
      preview: text.slice(0, 800),
    });
  } catch (err) {
    console.error("❌ Fatal error:", err);
    res.status(500).json({
      error: "Failed to parse resume",
      details: err.message,
    });
  }
});

/* ------------------------------------------------------------------
   🔹 LIST SAVED RESUMES (for sidebar)
------------------------------------------------------------------ */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `
      SELECT id, title, created_at, format
      FROM resumes
      WHERE user_id=$1
      ORDER BY created_at DESC;
      `,
      [userId]
    );
    res.json({ resumes: rows });
  } catch (err) {
    console.error("❌ Fetch resumes error:", err);
    res.status(500).json({ error: "Failed to load saved resumes" });
  }
});

/* ------------------------------------------------------------------
   🔹 DELETE SAVED RESUME
------------------------------------------------------------------ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(`DELETE FROM resumes WHERE id=$1 AND user_id=$2`, [
      req.params.id,
      userId,
    ]);
    res.json({ message: "Resume deleted" });
  } catch (err) {
    console.error("❌ Delete resume error:", err);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 DOWNLOAD SAVED RESUME (PDF / DOCX / TXT / HTML)
------------------------------------------------------------------ */
router.get("/:id/download", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT * FROM resumes WHERE id=$1 AND user_id=$2`,
      [req.params.id, userId]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Resume not found" });

    const resume = rows[0];

    const rawSections = resume.sections || {};
    const sections =
      typeof rawSections === "string" ? JSON.parse(rawSections) : rawSections;

    const format = (resume.format || "pdf").toLowerCase();
    const baseName = `${resume.title || "resume"}_${resume.id}`
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    const basePath = path.join(EXPORT_DIR, baseName);

    // Helper: build a readable text from sections
    const sectionsToText = () =>
      Object.entries(sections)
        .map(
          ([key, val]) =>
            `${key.toUpperCase()}\n${JSON.stringify(val, null, 2)}`
        )
        .join("\n\n");

    if (format === "pdf") {
      const pdfPath = `${basePath}.pdf`;
      const doc = new PDFDocument({ margin: 40 });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.fontSize(22).text(resume.title || "Resume", { align: "center" });
      doc.moveDown();

      for (const [key, val] of Object.entries(sections)) {
        doc
          .fontSize(14)
          .fillColor("#111827")
          .text(key.toUpperCase(), { underline: true });
        doc.moveDown(0.2);

        doc
          .fontSize(10)
          .fillColor("#111827")
          .text(JSON.stringify(val, null, 2), {
            align: "left",
          });
        doc.moveDown();
      }

      doc.end();
      stream.on("finish", () => res.download(pdfPath));
      return;
    }

    if (format === "docx") {
      const children = [
        new Paragraph({
          text: resume.title || "Resume",
          heading: "Heading1",
        }),
      ];

      for (const [key, val] of Object.entries(sections)) {
        children.push(
          new Paragraph({
            text: key.toUpperCase(),
            heading: "Heading2",
          })
        );
        children.push(
          new Paragraph({
            text: JSON.stringify(val, null, 2),
          })
        );
      }

      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      const docxPath = `${basePath}.docx`;
      fs.writeFileSync(docxPath, buffer);
      return res.download(docxPath);
    }

    if (format === "txt") {
      const txtPath = `${basePath}.txt`;
      fs.writeFileSync(txtPath, sectionsToText(), "utf8");
      return res.download(txtPath);
    }

    if (format === "html") {
      const htmlBody = Object.entries(sections)
        .map(
          ([key, val]) =>
            `<h2>${key.toUpperCase()}</h2><pre>${JSON.stringify(
              val,
              null,
              2
            )}</pre>`
        )
        .join("");
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${resume.title || "Resume"}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 40px;">
<h1>${resume.title || "Resume"}</h1>
${htmlBody}
</body>
</html>`;
      const htmlPath = `${basePath}.html`;
      fs.writeFileSync(htmlPath, html, "utf8");
      return res.download(htmlPath);
    }

    return res.status(400).json({ error: "Unsupported format" });
  } catch (err) {
    console.error("❌ Download resume error:", err);
    res.status(500).json({ error: "Failed to export resume" });
  }
});

export default router;
