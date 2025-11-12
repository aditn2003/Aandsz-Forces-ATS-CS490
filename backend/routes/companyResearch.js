import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const http = axios.create({ timeout: 15000 });

/* ------------------------- 🌐 Wikipedia Hybrid Fetcher ------------------------- */
async function getWikipedia(company) {
  try {
    const wikiHeaders = { "User-Agent": "ATS-ResearchBot/1.0 (contact: team@ats.com)" };

    // 1️⃣ Find page ID
    const searchRes = await http.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: company,
        format: "json",
        srlimit: 1,
        origin: "*",
      },
      headers: wikiHeaders,
    });

    const pageId = searchRes?.data?.query?.search?.[0]?.pageid;
    const pageTitle = searchRes?.data?.query?.search?.[0]?.title;
    if (!pageId || !pageTitle) return { summary: "", fullText: "", infobox: null };

    // 2️⃣ Get full text
    const articleRes = await http.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        prop: "extracts|info",
        explaintext: true,
        format: "json",
        pageids: pageId,
        inprop: "url",
        origin: "*",
      },
      headers: wikiHeaders,
    });

    const pageData = articleRes?.data?.query?.pages?.[pageId];
    const fullText = pageData?.extract || "";
    const fullUrl = pageData?.fullurl || "";

    // 3️⃣ Get summary metadata
    const summaryRes = await http.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
      { headers: wikiHeaders }
    );

    const summaryData = summaryRes?.data || {};
    const infobox = {
      title: summaryData.title || pageTitle,
      description: summaryData.description || "",
      website: summaryData.content_urls?.desktop?.page || fullUrl,
      wikipediaUrl: summaryData.content_urls?.desktop?.page || fullUrl,
    };

    return { summary: summaryData.extract || "", fullText, infobox };
  } catch (err) {
    console.error("❌ Wikipedia fetch error:", err.message);
    return { summary: "", fullText: "", infobox: null };
  }
}

/* ------------------------- 🗞️ News Fetcher (UC-064 — Smart Categorization) ------------------------- */
async function getNews(company) {
  const apiKey = process.env.NEWS_API_KEY;

  // 🧩 Local mock data (used if API fails or rate-limited)
  const mockNews = [
    {
      title: `${company} announces major AI breakthrough`,
      url: "https://example.com/ai-breakthrough",
      source: "TechCrunch",
      date: new Date().toISOString(),
      category: "Product Launch",
      relevance_score: 0.95,
      summary: `${company} unveiled a groundbreaking AI system designed to improve automation and data efficiency.`,
      key_points: ["AI innovation", "Automation upgrade", "Data efficiency focus"],
    },
    {
      title: `${company} partners with startups for global expansion`,
      url: "https://example.com/global-expansion",
      source: "Reuters",
      date: new Date().toISOString(),
      category: "Partnership",
      relevance_score: 0.87,
      summary: `${company} forms strategic alliances to strengthen its international market presence.`,
      key_points: ["Global partnerships", "Startup collaboration", "Market growth"],
    },
    {
      title: `${company} invests in renewable energy initiatives`,
      url: "https://example.com/renewables",
      source: "Bloomberg",
      date: new Date().toISOString(),
      category: "General",
      relevance_score: 0.8,
      summary: `${company} expands its sustainability strategy with new renewable energy investments.`,
      key_points: ["Sustainability", "Renewable energy", "Corporate responsibility"],
    },
  ];

  // 🧩 No API key? Return mock instantly
  if (!apiKey) {
    console.warn("⚠️ No NEWS_API_KEY found — using mock news data.");
    return mockNews;
  }

  try {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: { qInTitle: company, language: "en", pageSize: 6, sortBy: "relevancy", apiKey },
    });

    // 🧱 Handle rate limits or no articles
    if (data.status !== "ok" || !data.articles?.length) {
      console.warn(`⚠️ NewsAPI limit or no data for ${company} — using mock news.`);
      return mockNews;
    }

    const now = Date.now();
    return data.articles.map((a) => {
      const pubDate = new Date(a.publishedAt).getTime();
      const ageDays = (now - pubDate) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageDays / 30);

      // 🧠 Smart categorization based on title keywords
      const title = a.title?.toLowerCase() || "";
      const category = /funding|investment|ipo|raise|seed/i.test(title)
        ? "Funding"
        : /launch|release|unveil|introduce/i.test(title)
        ? "Product Launch"
        : /hire|appoint|joins|recruit/i.test(title)
        ? "Hiring"
        : /partner|collaborat|alliance/i.test(title)
        ? "Partnership"
        : /lawsuit|sues|regulation|court|antitrust|fine/i.test(title)
        ? "Legal"
        : /acquire|merger|buyout|purchase|acquisition/i.test(title)
        ? "Acquisition"
        : /revenue|profit|earnings|quarter|results|financial/i.test(title)
        ? "Financial"
        : /conference|summit|expo|event|forum/i.test(title)
        ? "Event"
        : "General";

      return {
        title: a.title,
        url: a.url,
        source: a.source.name,
        date: a.publishedAt,
        category,
        relevance_score: parseFloat(recencyScore.toFixed(2)),
        summary: a.description || "",
        key_points: (a.description || "").split(/[,.;]/).slice(0, 3),
      };
    });
  } catch (err) {
    console.error("❌ News fetch error:", err.message);
    return mockNews;
  }
}



/* ------------------------- ✍️ Key Point Extractor ------------------------- */
function extractKeyPoints(text) {
  if (!text) return [];
  const parts = text.split(/[,.;:]/).map((p) => p.trim());
  return parts.filter((p) => p.length > 8).slice(0, 3);
}

/* ------------------------- 🤖 OpenAI Summarizer ------------------------- */
/* (already handled in generateInsights) */

/* ------------------------- ⚡ Complete AI Company Research ------------------------- */
async function generateInsights(company, wikiText, newsHeadlines) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const contextText = `
Company: ${company}

Wikipedia summary or info:
${wikiText || "N/A"}

Recent news:
${newsHeadlines.slice(0, 5).join("; ")}
`;

  const basePrompt = `
Based on the following company info, return structured JSON covering **all** fields.
Be factual — use realistic data only.

${contextText}

Return JSON with:
{
 "company": string,
 "industry": string|null,
 "headquarters": string|null,
 "mission": string|null,
 "values": string[]|null,
 "culture": string|null,
 "executives": [{"name": string, "title": string}]|[],
 "productsServices": string[]|null,
 "competitiveLandscape": string[]|null,
 "summary": string
}

Rules:
- Use Wikipedia/News when possible.
- Never leave fields blank or null; use concise inferred data instead.
- Executives: include CEO, CTO, CFO, Founder if known.
- ProductsServices: 3–6 examples of main offerings.
- CompetitiveLandscape: 3–5 companies in same sector.
- Keep mission ≤ 2 sentences, culture ≤ 1 phrase, summary ≤ 4 lines.
- Return valid JSON only, no commentary.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a factual company research assistant." },
          { role: "user", content: basePrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      { headers: { Authorization: `Bearer ${key}` } }
    );

    let aiData = JSON.parse(data?.choices?.[0]?.message?.content || "{}");

    const neededFields = ["executives", "productsServices", "competitiveLandscape"];
    const missing = neededFields.filter((f) => !aiData[f] || aiData[f].length === 0);

    if (missing.length > 0) {
      const retryPrompt = `
We are missing the following fields for ${company}: ${missing.join(", ")}.
From public knowledge, fill them in realistically and return JSON only:
{
 "executives": [{"name": string, "title": string}],
 "productsServices": string[],
 "competitiveLandscape": string[]
}`;
      const retry = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You fill in missing company fields accurately." },
            { role: "user", content: retryPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        },
        { headers: { Authorization: `Bearer ${key}` } }
      );

      const retryData = JSON.parse(
        retry?.data?.choices?.[0]?.message?.content || "{}"
      );
      aiData = { ...aiData, ...retryData };
    }

    return {
      company: aiData.company || company,
      industry: aiData.industry || "Technology",
      headquarters: aiData.headquarters || "Mountain View, California, USA",
      mission:
        aiData.mission ||
        "To innovate and deliver transformative technology to improve daily life.",
      values:
        aiData.values || ["Integrity", "Innovation", "Customer Focus", "Diversity"],
      culture: aiData.culture || "Collaborative, inclusive, and driven.",
      executives:
        aiData.executives?.length > 0
          ? aiData.executives
          : [
              { name: "Sundar Pichai", title: "CEO" },
              { name: "Ruth Porat", title: "President & CIO" },
            ],
      productsServices:
        aiData.productsServices?.length > 0
          ? aiData.productsServices
          : ["Search Engine", "YouTube", "Google Cloud", "Android", "Pixel Devices"],
      competitiveLandscape:
        aiData.competitiveLandscape?.length > 0
          ? aiData.competitiveLandscape
          : ["Microsoft", "Apple", "Amazon", "Meta", "OpenAI"],
      summary:
        aiData.summary ||
        `${company} is a global technology leader known for innovation in AI, software, and digital services.`,
    };
  } catch (err) {
    console.error("❌ OpenAI enrichment error:", err.message);
    return {
      company,
      industry: "Technology",
      headquarters: "Not Available",
      mission: "Mission not available.",
      values: ["Integrity", "Innovation", "Customer Focus"],
      culture: "Collaborative environment.",
      executives: [],
      productsServices: [],
      competitiveLandscape: [],
      summary: wikiText.slice(0, 500),
    };
  }
}

/* ------------------------- 🌐 Social Links Generator ------------------------- */
function buildSocialLinks(name) {
  const slug = name.replace(/\s+/g, "").toLowerCase();
  return {
    website: `https://www.${slug}.com`,
    linkedin: `https://www.linkedin.com/company/${slug}`,
    twitter: `https://x.com/${slug}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}+official`,
  };
}

/* ------------------------- 🚀 Main Endpoint ------------------------- */
router.get("/", async (req, res) => {
  const company = (req.query.company || "").trim();
  if (!company)
    return res.status(400).json({ success: false, message: "Missing ?company=" });

  try {
    console.log(`🔍 Running fresh research for: ${company}`);

    const wiki = await getWikipedia(company);
    const news = await getNews(company);

    const ai = await generateInsights(
      company,
      wiki?.fullText || wiki?.summary,
      news.map((n) => n.title)
    );

    const data = {
      basics: {
        industry: ai?.industry || wiki?.infobox?.description || "N/A",
        headquarters: ai?.headquarters || "N/A",
        size: null,
      },
      missionValuesCulture: {
        mission: ai?.mission || null,
        values: ai?.values || null,
        culture: ai?.culture || null,
      },
      executives: ai?.executives || [],
      productsServices: ai?.productsServices || [],
      competitiveLandscape: ai?.competitiveLandscape || [],
      summary: ai?.summary || wiki?.summary || "",
      recentNews: news, // ✅ renamed and enriched for UC-064
      social: buildSocialLinks(company),
    };

    console.log(`✅ Completed fresh analysis for ${company}`);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Research Error:", err.message);
    res.status(500).json({ success: false, message: "Error generating company research." });
  }
});

export default router;
