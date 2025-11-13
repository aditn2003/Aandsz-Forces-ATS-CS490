// routes/company.js
import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// 🟢 Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// 🟣 Multer setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// 🛡 Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

//
// ==================================================================
//               NEW COMPANY RESEARCH ROUTE (AC #3)
// ==================================================================
//
// ⚠️ Note: This must be placed BEFORE the '/:name' route
//

// Initialize Google AI
// --- THIS IS THE FIX ---
// Force the client to use the v1 API endpoint, not the old v1beta
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY, {
  apiEndpoint: "https://generativelanguage.googleapis.com/v1",
}); 
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 
// ---------------------


router.post("/research", auth, async (req, res) => {
  const { companyName } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: "Company name is required" });
  }

  try {
    // 1. Check if company already exists
    const existing = await pool.query(
      "SELECT * FROM companies WHERE LOWER(name)=LOWER($1)",
      [companyName.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      // If it exists, just return it
      return res.status(200).json({ company: existing.rows[0] });
    }

    // 2. Fetch news (for context)
    const newsResponse = await axios.get(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        companyName
      )}&apiKey=${process.env.NEWS_API_KEY}&pageSize=5`
    );
    const articles = newsResponse.data.articles.map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
    }));

    // 3. Call Generative AI for research
    const prompt = `Research the company "${companyName}". Give me a JSON object with these keys: "basics" (one-sentence description), "mission_values_culture" (a short paragraph), "executives" (an array of strings with "Name - Title"), "products_services" (an array of 2-3 main products/services), "competitive_landscape" (a short paragraph). Here are some recent news articles for context: ${JSON.stringify(
      articles
    )}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    // Clean up markdown formatting from the AI response
    const aiText = response.text().replace(/```json|```/g, "").trim(); 

    let aiData;
    try {
      aiData = JSON.parse(aiText);
    } catch (e) {
      console.error("AI JSON parse error:", aiText);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    // 4. Save to database
    const newCompany = await pool.query(
      `INSERT INTO companies (
        name, basics, mission_values_culture, executives, 
        products_services, competitive_landscape, news, description, industry
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        companyName,
        JSON.stringify(aiData.basics || {}),
        JSON.stringify(aiData.mission_values_culture || {}),
        JSON.stringify(aiData.executives || []),
        JSON.stringify(aiData.products_services || []),
        JSON.stringify(aiData.competitive_landscape || {}),
        JSON.stringify(articles),
        aiData.basics, // Use the 'basics' as the default description
        aiData.industry || ''
      ]
    );

    res.status(200).json({ company: newCompany.rows[0] });
  } catch (err) {
    console.error("❌ Company research error:", err);
    res.status(500).json({ error: "Server error during company research" });
  }
});


// ✅ Get company by name (returns full consistent object)
router.get("/:name", auth, async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query(
      `SELECT
          id,
          name,
          COALESCE(size, '') AS size,
          COALESCE(industry, '') AS industry,
          COALESCE(location, '') AS location,
          COALESCE(website, '') AS website,
          COALESCE(description, 'No description yet.') AS description,
          COALESCE(mission, '') AS mission,
          COALESCE(news, '') AS news,
          COALESCE(glassdoor_rating, 0) AS glassdoor_rating,
          COALESCE(contact_email, '') AS contact_email,
          COALESCE(contact_phone, '') AS contact_phone,
          COALESCE(logo_url, '') AS logo_url
        FROM companies
        WHERE LOWER(name)=LOWER($1)`,
      [name]
    );

    if (result.rows.length === 0) {
      // Auto-create placeholder
      const insert = await pool.query(
        `INSERT INTO companies (name, description)
         VALUES ($1, 'No description yet.')
         RETURNING *`,
        [name]
      );
      return res.json(insert.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Fetch company error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Create or update (POST /api/companies)
router.post("/", auth, async (req, res) => {
  const {
    name,
    size,
    industry,
    location,
    website,
    description,
    mission,
    news,
    glassdoor_rating,
    contact_email,
    contact_phone,
    logo_url,
  } = req.body;

  if (!name) return res.status(400).json({ error: "Company name required" });

  try {
    const existing = await pool.query(
      "SELECT id FROM companies WHERE LOWER(name)=LOWER($1)",
      [name]
    );

    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE companies
         SET size=$1, industry=$2, location=$3, website=$4, description=$5,
             mission=$6, news=$7, glassdoor_rating=$8, contact_email=$9,
             contact_phone=$10, logo_url=$11, updated_at=NOW()
         WHERE LOWER(name)=LOWER($12)
         RETURNING *`,
        [
          size,
          industry,
          location,
          website,
          description,
          mission,
          news,
          glassdoor_rating,
          contact_email,
          contact_phone,
          logo_url,
          name,
        ]
      );
      res.json({ message: "Company updated", company: result.rows[0] });
    } else {
      const result = await pool.query(
        `INSERT INTO companies
         (name, size, industry, location, website, description, mission, news, glassdoor_rating, contact_email, contact_phone, logo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          name,
          size,
          industry,
          location,
          website,
          description,
          mission,
          news,
          glassdoor_rating,
          contact_email,
          contact_phone,
          logo_url,
        ]
      );
      res.json({ message: "Company created", company: result.rows[0] });
    }
  } catch (err) {
    console.error("❌ Company save error:", err);
    res.status(500).json({ error: "Database error while saving company" });
  }
});

// ✅ PUT update company (auto-create if missing)
router.put("/:name", auth, async (req, res) => {
  try {
    const { name } = req.params;
    const fields = req.body || {};

    const existing = await pool.query(
      "SELECT id FROM companies WHERE LOWER(name)=LOWER($1)",
      [name]
    );

    if (existing.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO companies (name, description)
         VALUES ($1, $2)
         RETURNING *`,
        [name, fields.description || "No description yet."]
      );
      return res.json({ company: insert.rows[0] });
    }

    const keys = Object.keys(fields);
    if (keys.length === 0)
      return res.json({ message: "No update fields provided" });

    const updates = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
    const values = Object.values(fields);

    const result = await pool.query(
      `UPDATE companies
       SET ${updates}, updated_at=NOW()
       WHERE LOWER(name)=LOWER($${values.length + 1})
       RETURNING *`,
      [...values, name]
    );

    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error("❌ Company PUT error:", err);
    res.status(500).json({ error: "Error updating company" });
  }
});

// ✅ Upload / update logo (auto-create company if missing)
router.post("/:name/logo", auth, upload.single("logo"), async (req, res) => {
  try {
    const { name } = req.params;
    if (!req.file)
      return res.status(400).json({ error: "No logo file provided" });

    const logoUrl = `/uploads/${req.file.filename}`;
    const existing = await pool.query(
      "SELECT id FROM companies WHERE LOWER(name)=LOWER($1)",
      [name]
    );

    if (existing.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO companies (name, description, logo_url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, "No description yet.", logoUrl]
      );
      return res.json({
        message: "✅ Company created and logo uploaded",
        company: insert.rows[0],
      });
    }

    const update = await pool.query(
      `UPDATE companies
       SET logo_url=$1, updated_at=NOW()
       WHERE LOWER(name)=LOWER($2)
       RETURNING *`,
      [logoUrl, name]
    );

    res.json({
      message: "✅ Logo uploaded successfully",
      company: update.rows[0],
    });
  } catch (err) {
    console.error("❌ Logo upload error:", err);
    res.status(500).json({ error: "Error uploading logo" });
  }
});

export default router;