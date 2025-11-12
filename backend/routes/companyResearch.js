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

/* ------------------------- 🗞️ News Fetcher ------------------------- */
async function getNews(company) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  try {
    const { data } = await http.get("https://newsapi.org/v2/everything", {
        params: { qInTitle: company, language: "en", pageSize: 6, sortBy: "relevancy", apiKey },
    });
    return data.articles.map(a => ({
      title: a.title,
      url: a.url,
      source: a.source.name,
      publishedAt: a.publishedAt,
    }));
  } catch {
    return [];
  }
}

/* ------------------------- 🤖 OpenAI Summarizer ------------------------- */
async function generateInsights(company, text, newsHeadlines) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a corporate analyst that extracts verified details about companies from Wikipedia and recent news. Return structured, factual JSON.",
          },
          {
            role: "user",
            content: `
Company: ${company}

TEXT (Wikipedia full article + summary):
${text?.slice(0, 15000)}

RECENT NEWS:
${newsHeadlines.join("; ")}

Return valid JSON:
{
 "industry": string|null,
 "headquarters": string|null,
 "mission": string|null,
 "values": string[]|null,
 "culture": string|null,
 "executives": [{"name": string, "title": string}]|[],
 "productsServices": string[]|null,
 "competitiveLandscape": string[]|null,
 "summary": string
}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      },
      { headers: { Authorization: `Bearer ${key}` } }
    );

    const content = data?.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (err) {
    console.error("❌ OpenAI summary error:", err.message);
    return null;
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
      news.map(n => n.title)
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
        news,
        social: buildSocialLinks(company), // 👈 added here
      };
      

    console.log(`✅ Completed fresh analysis for ${company}`);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Research Error:", err.message);
    res.status(500).json({ success: false, message: "Error generating company research." });
  }
});

export default router;
