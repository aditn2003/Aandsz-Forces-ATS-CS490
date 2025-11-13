import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.get("/", async (req, res) => {
  const company = req.query.company;
  if (!company) return res.status(400).json({ error: "Missing company." });

  try {
    const prompt = `
Provide detailed interview insights for the company "${company}".

Return JSON:
{
  "company": "...",
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
`;

    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Interview preparation expert." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const parsed = JSON.parse(data.choices[0].message.content);

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error("❌ Interview API error:", err.message);
    res.status(500).json({ success: false, message: "Failed to get interview insights." });
  }
});

export default router;
