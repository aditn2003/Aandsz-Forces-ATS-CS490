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
import puppeteer from "puppeteer";

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
   🧩 DOCX fallback loader
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
   📄 PDF extraction
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
   🧠 Fallback simple parser
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
   🔹 TEST ROUTE
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
      `SELECT * FROM resume_templates
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY is_default DESC, name`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading templates:", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/templates", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, layout_type, font, color_scheme } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO resume_templates (user_id, name, layout_type, font, color_scheme)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [userId, name, layout_type, font, color_scheme]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating template:", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.patch("/templates/:id/default", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    await pool.query(
      `UPDATE resume_templates SET is_default=false WHERE user_id=$1`,
      [userId]
    );

    const { rows } = await pool.query(
      `UPDATE resume_templates
       SET is_default=true
       WHERE id=$1 AND user_id=$2
       RETURNING *`,
      [templateId, userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error setting default template:", err);
    res.status(500).json({ error: "Failed to set default template" });
  }
});

/* ------------------------------------------------------------------
   🔹 CREATE / UPDATE FINAL RESUME
------------------------------------------------------------------ */
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, template_id = 1, sections, format = "pdf" } = req.body;

    if (!title || !sections)
      return res.status(400).json({ error: "Title and sections are required" });

    const { rows: existing } = await pool.query(
      `SELECT id FROM resumes WHERE user_id=$1 AND title=$2`,
      [userId, title]
    );

    let resume;

    // Update
    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE resumes
         SET sections=$1, template_id=$2, format=$3, updated_at=NOW()
         WHERE id=$4
         RETURNING *`,
        [sections, template_id, format, existing[0].id]
      );
      resume = rows[0];
    }
    // Insert
    else {
      const { rows } = await pool.query(
        `INSERT INTO resumes (user_id, title, template_id, sections, format, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         RETURNING *`,
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

/* ------------------------------------------------------------------
   🔹 IMPORT (PDF / DOCX + AI)
------------------------------------------------------------------ */
router.post("/import", auth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const buffer = readFileSync(req.file.path);
    const ext = path.extname(req.file.originalname).toLowerCase();

    let text = "";

    try {
      if (ext === ".pdf") {
        text = await extractPdfText(buffer);
      } else if (ext === ".docx" && mammoth) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } else {
        return res.status(400).json({ error: "Unsupported file." });
      }
    } catch (err) {
      return res.status(500).json({ error: "Failed to extract text" });
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "Unreadable file" });
    }

    // AI parsing
    let structured = {};
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: text.slice(0, 15000) }] }],
      });

      structured = JSON.parse(result.response.text());
    } catch (err) {
      structured = basicSectionParser(text);
    }

    res.json({
      message: "✅ Resume parsed successfully",
      sections: structured,
      preview: text.slice(0, 800),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to parse resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 LIST ALL RESUMES (must come BEFORE /:id)
------------------------------------------------------------------ */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT id, title, created_at, updated_at, format
       FROM resumes
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ resumes: rows });
  } catch (err) {
    console.error("❌ Fetch resumes error:", err);
    res.status(500).json({ error: "Failed to load resumes" });
  }
});

/* ------------------------------------------------------------------
   🔹 GET SINGLE RESUME (must come AFTER "/")
------------------------------------------------------------------ */
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM resumes WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Resume not found" });

    const resume = rows[0];
    if (typeof resume.sections === "string")
      resume.sections = JSON.parse(resume.sections);

    res.json({ resume });
  } catch (err) {
    console.error("❌ Fetch resume error:", err);
    res.status(500).json({ error: "Failed to load resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 DOWNLOAD RESUME
------------------------------------------------------------------ */
// ===============================
// DOWNLOAD EXACT FORMATTED RESUME
// ===============================
router.get("/:id/download", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const resumeId = req.params.id;

    // Fetch resume row
    const { rows } = await pool.query(
      `SELECT * FROM resumes WHERE id=$1 AND user_id=$2`,
      [resumeId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resume = rows[0];
    const format = (resume.format || "pdf").toLowerCase();

    // --------------------------
    // 1) If we have saved HTML → Use Puppeteer for perfect export
    // --------------------------
    if (resume.rendered_html) {
      console.log("📄 Using HTML → PDF exporter");

      const puppeteer = await import("puppeteer");

      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox"],
      });

      const page = await browser.newPage();

      await page.setContent(resume.rendered_html, {
        waitUntil: "networkidle0",
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      });

      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${resume.title || "resume"}.pdf"`
      );
      return res.send(pdfBuffer);
    }

    // --------------------------
    // 2) FALLBACK — export from JSON sections if old resume
    // --------------------------

    console.log("⚠ Resume has NO HTML, falling back to old exporter.");

    const rawSections = resume.sections || {};
    const sections =
      typeof rawSections === "string" ? JSON.parse(rawSections) : rawSections;

    const baseName = `${resume.title || "resume"}_${resume.id}`
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    const basePath = path.join(EXPORT_DIR, baseName);

    const sectionsToText = () =>
      Object.entries(sections)
        .map(
          ([key, val]) => `${key.toUpperCase()}\n${JSON.stringify(val, null, 2)}`
        )
        .join("\n\n");

    // --------------------------
    // PDF fallback
    // --------------------------
    if (format === "pdf") {
      const pdfPath = `${basePath}.pdf`;
      const doc = new PDFDocument({ margin: 40 });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.fontSize(22).text(resume.title || "Resume", { align: "center" });
      doc.moveDown();

      for (const [key, val] of Object.entries(sections)) {
        doc.fontSize(14).text(key.toUpperCase(), { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(10).text(JSON.stringify(val, null, 2));
        doc.moveDown();
      }

      doc.end();
      stream.on("finish", () => res.download(pdfPath));
      return;
    }

    // --------------------------
    // DOCX fallback
    // --------------------------
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
        children.push(new Paragraph(JSON.stringify(val, null, 2)));
      }

      const docObj = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(docObj);

      const docxPath = `${basePath}.docx`;
      fs.writeFileSync(docxPath, buffer);
      return res.download(docxPath);
    }

    // --------------------------
    // TXT fallback
    // --------------------------
    if (format === "txt") {
      const txtPath = `${basePath}.txt`;
      fs.writeFileSync(txtPath, sectionsToText(), "utf8");
      return res.download(txtPath);
    }

    // --------------------------
    // HTML fallback
    // --------------------------
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
<body style="font-family: Arial; margin: 40px;">
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


/* ------------------------------------------------------------------
   🔹 DELETE RESUME
------------------------------------------------------------------ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `DELETE FROM resumes WHERE id=$1 AND user_id=$2`,
      [req.params.id, userId]
    );

    res.json({ message: "Resume deleted" });
  } catch (err) {
    console.error("❌ Delete resume error:", err);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});
/* ------------------------------------------------------------------
   🔹 RENDER FULL HTML → PDF (Puppeteer)
------------------------------------------------------------------ */
router.post("/:id/render", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { html } = req.body; // FULL HTML FROM FRONTEND

    if (!html) {
      return res.status(400).json({ error: "Missing HTML content" });
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"]
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=resume_${id}.pdf`
    );
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Render PDF error:", err);
    res.status(500).json({ error: "Failed to render PDF" });
  }
});


export default router;
