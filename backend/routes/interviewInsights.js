import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

const http = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent": "ATS-InterviewBot/1.0 (contact: team@ats.com)",
  },
});

/* -----------------------------------------------------
   Clean slug for Indeed URLs
----------------------------------------------------- */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* -----------------------------------------------------
   1. SERP — Google Search (now role-aware)
----------------------------------------------------- */
async function getSerpSnippets(company, role) {
  if (!SERP_API_KEY) {
    console.warn("⚠️ SERP_API_KEY missing. Returning fallback empty array.");
    return [];
  }

  const query = role
    ? `${company} ${role} interview questions process`
    : `${company} interview questions process`;

  try {
    const { data } = await http.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        api_key: SERP_API_KEY,
        num: 8,
      },
    });

    const arr = [];
    (data.organic_results || []).forEach((r) => {
      if (r.title || r.snippet)
        arr.push(`${r.title || ""} — ${r.snippet || ""}`.trim());
    });

    return arr;
  } catch (err) {
    console.error("❌ SERP API error:", err.message);
    return [];
  }
}

/* -----------------------------------------------------
   2. Indeed Scrape (still useful even without role)
----------------------------------------------------- */
async function scrapeIndeed(company) {
  const slug = slugify(company);
  const urls = [
    `https://www.indeed.com/cmp/${slug}/interviews`,
    `https://www.indeed.com/cmp/${slug}/interviews?from=tab`,
  ];

  for (const url of urls) {
    try {
      const { data } = await http.get(url);
      const $ = cheerio.load(data);

      const parts = [];
      $("h2, h3, p, li").each((i, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) parts.push(t);
      });

      if (parts.length > 0) return parts.slice(0, 60).join("\n");
    } catch {}
  }

  return "";
}

/* -----------------------------------------------------
   3. Reddit + Glassdoor (now also role-aware)
----------------------------------------------------- */
async function getCommunitySnippets(company, role) {
  if (!SERP_API_KEY) return [];

  const query = role
    ? `${company} ${role} interview experience reddit OR glassdoor`
    : `${company} interview experience reddit OR glassdoor`;

  try {
    const { data } = await http.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        api_key: SERP_API_KEY,
        num: 6,
      },
    });

    const arr = [];
    (data.organic_results || []).forEach((r) => {
      if (r.snippet) arr.push(r.snippet);
    });

    return arr;
  } catch (err) {
    console.error("❌ Community SERP error:", err.message);
    return [];
  }
}

/* -----------------------------------------------------
   4. OpenAI Role-Aware Enrichment
----------------------------------------------------- */
async function enrichInterviewInsights(company, role, serp, indeed, community) {
  const context = `
Company: ${company}
Role: ${role || "N/A"}

=== Google Results ===
${serp.join("\n\n")}

=== Indeed Snippets ===
${indeed}

=== Reddit / Glassdoor ===
${community.join("\n\n")}
`;

  const prompt = `
You are generating REALISTIC INTERVIEW INSIGHTS for a candidate applying to:

Company: "${company}"
Role: "${role || "General"}"

Using all provided data, produce JSON in EXACTLY this shape:

{
  "company": "...",
  "role": "...",
  "process": "...",
  "stages": ["..."],
  "questions": ["..."],
  "interviewers": ["..."],
  "format": "...",
  "recommendations": ["..."],
  "timeline": "...",
  "tips": ["..."],
  "checklist": ["..."]
}

STRICT RULES:
- Tailor EVERYTHING to BOTH the company AND the role.
- Questions must reflect the role (technical, behavioral, product, etc.).
- Stages must match what ${company} typically does for ${role}.
- Recommendations must be specific: tools, languages, systems, soft skills for that role.
- Timeline must be realistic for ${company} hiring this role.
- Checklist must contain high-value preparation tasks tailored to ${role}.
- No filler. No vague content.
- ALWAYS return valid JSON only.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You generate highly accurate, role-specific interview preparation content.",
          },
          { role: "user", content: context },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI Interview Insights Error:", err.message);
    return null;
  }
}

/* -----------------------------------------------------
   MAIN ROUTE — NOW ROLE AWARE
----------------------------------------------------- */
router.get("/", async (req, res) => {
  const company = req.query.company?.trim();
  const role = req.query.role?.trim() || ""; // 🔥 NEW

  if (!company)
    return res.status(400).json({ success: false, message: "Missing ?company=" });

  console.log(`🔍 Generating interview insights for: ${company} | Role: ${role}`);

  try {
    const [serp, indeed, community] = await Promise.all([
      getSerpSnippets(company, role),
      scrapeIndeed(company),
      getCommunitySnippets(company, role),
    ]);

    const ai = await enrichInterviewInsights(company, role, serp, indeed, community);

    if (!ai)
      return res.status(500).json({ success: false, message: "AI generation failed" });

    console.log(`✅ Completed interview insights for: ${company} (${role})`);
    return res.json({ success: true, data: ai });
  } catch (err) {
    console.error("❌ Interview endpoint error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate interview insights.",
    });
  }
});

export default router;
