import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

// ✅ Resolve __dirname safely for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Templates directory (auto-detect)
const TEMPLATE_DIR = path.join(__dirname, "..", "templates");

// ============================================================
// 🔧 Handlebars Helpers
// ============================================================

// ✅ Split multiline text into bullet points
Handlebars.registerHelper("splitLines", function (text) {
  if (!text) return [];
  return text
    .split(/\r?\n|•|-/)
    .map((t) => t.trim())
    .filter(Boolean);
});

// ✅ Format a single date like “Sep 2025”
Handlebars.registerHelper("formatDate", function (date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return ""; // invalid date
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
});

// ✅ Format date range like “Jul 2025 – Aug 2025” or “Jul 2025 – Present”
Handlebars.registerHelper("formatDateRange", function (start, end, current) {
  const startStr = Handlebars.helpers.formatDate(start);
  if (current) return `${startStr} – Present`;
  const endStr = end ? Handlebars.helpers.formatDate(end) : "";
  return endStr ? `${startStr} – ${endStr}` : startStr;
});

// ✅ Render safe HTML (avoid escaping)
Handlebars.registerHelper("safe", function (text) {
  return new Handlebars.SafeString(text || "");
});

// ✅ Conditional helper (for comparing values)
Handlebars.registerHelper("ifEquals", function (a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});

// ✅ Capitalize words
Handlebars.registerHelper("capitalize", function (text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
});

// ============================================================
// 🧠 Skill Categorization Helper
// ============================================================
function categorizeSkills(skills = []) {
  const lowerSkills = skills.map((s) =>
    typeof s === "string" ? s.trim().toLowerCase() : s.name?.toLowerCase() || ""
  );

  const categories = {
    programming: [],
    libraries: [],
    tools: [],
    soft: [],
    languages: [],
    certifications: [],
    other: [],
  };

  const programmingList = [
    "python",
    "java",
    "c",
    "c++",
    "c#",
    "typescript",
    "javascript",
    "bash",
    "sql",
    "kotlin",
    "swift",
    "r",
    "go",
    "matlab",
  ];

  const libraryList = [
    "react",
    "node.js",
    "express",
    "flask",
    "django",
    "pandas",
    "numpy",
    "matplotlib",
    "seaborn",
    "scikit-learn",
    "tensorflow",
    "keras",
    "pytorch",
    "plotly",
    "dash",
    "tailwind",
    "next.js",
  ];

  const toolList = [
    "git",
    "github",
    "tableau",
    "power bi",
    "hadoop",
    "spark",
    "mongo",
    "mongodb",
    "postgresql",
    "aws",
    "azure",
    "gcp",
    "rest",
    "rest api",
    "nosql",
    "docker",
  ];

  const softList = [
    "leadership",
    "communication",
    "teamwork",
    "problem-solving",
    "critical thinking",
    "creativity",
    "collaboration",
    "adaptability",
    "organization",
    "time management",
    "attention to detail",
  ];

  const languageList = [
    "english",
    "spanish",
    "french",
    "hindi",
    "german",
    "mandarin",
    "korean",
  ];

  const certList = [
    "certified",
    "certificate",
    "certification",
    "associate",
    "professional",
    "exam",
    "foundation",
  ];

  for (const skill of lowerSkills) {
    if (!skill) continue;
    if (programmingList.some((kw) => skill.includes(kw)))
      categories.programming.push(skill);
    else if (libraryList.some((kw) => skill.includes(kw)))
      categories.libraries.push(skill);
    else if (toolList.some((kw) => skill.includes(kw)))
      categories.tools.push(skill);
    else if (softList.some((kw) => skill.includes(kw)))
      categories.soft.push(skill);
    else if (languageList.some((kw) => skill.includes(kw)))
      categories.languages.push(skill);
    else if (certList.some((kw) => skill.includes(kw)))
      categories.certifications.push(skill);
    else categories.other.push(skill);
  }

  return categories;
}

// ============================================================
// 📄 Render Template to PDF
// ============================================================
/**
 * Renders a Handlebars resume template into a formatted PDF.
 *
 * @param {string} templateName - Base name of the .hbs template (e.g. 'ats-optimized')
 * @param {object} data - Resume JSON data (already flattened)
 * @param {string} outputPath - Output PDF absolute path
 * @returns {Promise<string>} - Returns outputPath when complete
 */
export async function renderTemplate(templateName, data, outputPath) {
  try {
    // ✅ Locate template file
    const templateFile = path.join(TEMPLATE_DIR, `${templateName}.hbs`);
    if (!fs.existsSync(templateFile)) {
      console.error(`❌ Template not found at: ${templateFile}`);
      throw new Error(`Template not found: ${templateName}.hbs`);
    }

    console.log(`🧩 Using template: ${templateFile}`);

    // ✅ Merge defaults to ensure all sections exist
    const safeData = {
      summary: { contact: {}, links: {} },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      ...data,
    };

    // ✅ Auto-categorize skills
    safeData.skillCategories = categorizeSkills(safeData.skills);
    console.log("🧠 Skill categories:", safeData.skillCategories);

    // ✅ Compile the Handlebars template
    const source = fs.readFileSync(templateFile, "utf8");
    const compiled = Handlebars.compile(source);
    const html = compiled(safeData);

    // ✅ Load CSS
    const cssFile = path.join(TEMPLATE_DIR, "resume.css");
    const css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";
    const fullHTML = `<style>${css}</style>${html}`;

    // ✅ Save debug HTML for inspection
    const debugHTMLPath = path.join(TEMPLATE_DIR, "debug.html");
    fs.writeFileSync(debugHTMLPath, fullHTML);
    console.log(`🧠 Debug HTML saved to: ${debugHTMLPath}`);

    // ✅ Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: "networkidle0" });

    // ✅ Generate A4 PDF (CSS handles visual margins)
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
    });

    await browser.close();
    console.log(`✅ PDF generated successfully: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ renderTemplate error:", err.message);
    throw err;
  }
}
