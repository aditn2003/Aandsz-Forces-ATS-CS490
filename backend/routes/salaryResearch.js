// backend/routes/salaryResearch.js
import express from "express";
import { auth } from "../auth.js";
import pkg from "pg";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- Helpers ---------- */

// Infer experience level from job title text
function inferLevelFromTitle(title = "") {
  const t = title.toLowerCase();
  if (t.includes("intern") || t.includes("junior") || t.includes("associate"))
    return "Entry";
  if (t.includes("senior") || t.includes("sr")) return "Senior";
  if (t.includes("lead") || t.includes("principal")) return "Lead";
  return "Mid";
}

// Super simple heuristic for company size (you can improve later)
function inferCompanySize(company = "") {
  const bigNames = ["google", "meta", "amazon", "microsoft", "apple", "walmart"];
  const c = company.toLowerCase();
  if (bigNames.some((name) => c.includes(name))) return "Large";
  return "Medium";
}

// Compute salary ranges dynamically based on title, level, location & size
function computeSalary(jobTitle, level, location, companySize) {
  const roleBase = {
    "software engineer": { low: 80000, avg: 120000, high: 160000 },
    "data analyst": { low: 60000, avg: 85000, high: 110000 },
    "project manager": { low: 70000, avg: 100000, high: 130000 },
    "cybersecurity analyst": { low: 75000, avg: 110000, high: 145000 },
  };

  const base =
    roleBase[jobTitle.toLowerCase()] || // exact match
    { low: 60000, avg: 90000, high: 130000 }; // generic fallback

  const levelMultiplier = {
    Entry: 0.85,
    Mid: 1.0,
    Senior: 1.25,
    Lead: 1.55,
  };

  const sizeMultiplier = {
    Small: 0.9,
    Medium: 1.0,
    Large: 1.15,
  };

  const loc = (location || "").toLowerCase();
  const locationMultiplier =
    loc.includes("ny") ||
    loc.includes("new york") ||
    loc.includes("bay area") ||
    loc.includes("san francisco") ||
    loc.includes("sf")
      ? 1.25
      : 1.0;

  const mult =
    (levelMultiplier[level] || 1) *
    (sizeMultiplier[companySize] || 1) *
    locationMultiplier;

  return {
    low: Math.round(base.low * mult),
    avg: Math.round(base.avg * mult),
    high: Math.round(base.high * mult),
  };
}

/* ============================================================
   GET /api/salary-research/:jobId
============================================================ */
router.get("/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id || req.userId;

  try {
    // 1. Fetch job for this user
    const jobQuery = await pool.query(
      "SELECT id, title, company, location FROM jobs WHERE id=$1 AND user_id=$2",
      [jobId, userId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const job = jobQuery.rows[0];
    const title = job.title || "Unknown";
    const company = job.company || "Unknown";
    const location = job.location || "Not specified";

    const level = inferLevelFromTitle(title);
    const companySize = inferCompanySize(company);

    // 2. Get user's current compensation
    // User enters current salary on the frontend
    const userSalary = Number(req.query.userSalary) || 0;


    // 3. Compute salary ranges + total compensation
    const range = computeSalary(title, level, location, companySize);
    const comp = {
      base: range.avg,
      bonus: Math.round(range.avg * 0.12),
      stock: Math.round(range.avg * 0.15),
      total: Math.round(
        range.avg + range.avg * 0.12 + range.avg * 0.15
      ),
    };

    // 4. Compare across different companies
    const companies = [
      {
        company: `${company} (Target)`,
        low: range.low,
        avg: range.avg,
        high: range.high,
      },
      {
        company: "Google",
        low: range.low + 15000,
        avg: range.avg + 30000,
        high: range.high + 45000,
      },
      {
        company: "Amazon",
        low: range.low + 10000,
        avg: range.avg + 20000,
        high: range.high + 30000,
      },
      {
        company: "Deloitte",
        low: range.low - 15000,
        avg: range.avg - 10000,
        high: range.high - 5000,
      },
    ];

    // 5. Historical trend
    const trends = [
      { year: 2020, avg: Math.round(range.avg * 0.82) },
      { year: 2021, avg: Math.round(range.avg * 0.88) },
      { year: 2022, avg: Math.round(range.avg * 0.93) },
      { year: 2023, avg: Math.round(range.avg * 0.97) },
      { year: 2024, avg: range.avg },
    ];

    // 6. Negotiation recommendations (AI)
    const prompt = `
You are an expert salary negotiation coach.
Job title: ${title}
Company: ${company}
Location: ${location}
Level: ${level}
Company size: ${companySize}
Average market salary: ${range.avg}

Based on current market data, give 5 concise bullet-point salary negotiation recommendations.
`;
    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const recommendations =
      aiRes.choices[0]?.message?.content || "No recommendations available.";

    // 7. Compare user vs market
    const marketDiff = userSalary
      ? Math.round(((range.avg - userSalary) / userSalary) * 100)
      : 0;

    // 8. Final payload
    res.json({
      jobId: job.id,
      title,
      company,
      location,
      level,
      companySize,
      range,
      comp,
      companies,
      trends,
      recommendations,
      userSalary,
      marketDiff,
    });
  } catch (err) {
    console.error("❌ Salary research error:", err);
    res.status(500).json({ message: "Failed to generate salary research" });
  }
});

export default router;
