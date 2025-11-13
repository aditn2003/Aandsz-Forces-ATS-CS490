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

  // Split only on newlines or bullet symbols – not on hyphens inside words
  return text
    .split(/\r?\n|•/)
    .map((t) => t.trim())
    .filter(Boolean);
});

// ✅ Format a single date like "Sep 2025"
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

// ✅ Format date range like "Jul 2025 – Aug 2025" or "Jul 2025 – Present"
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

  const specialCases = {
    sql: "SQL",
    api: "API",
    apis: "APIs",
    rest: "REST",
    "rest api": "REST API",
    "rest apis": "REST APIs",
    javascript: "JavaScript",
    typescript: "TypeScript",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    xml: "XML",
    c: "C",
    "c++": "C++",
    "c#": "C#",
  };

  const lower = text.toLowerCase();
  if (specialCases[lower]) return specialCases[lower];

  return text.charAt(0).toUpperCase() + text.slice(1);
});

// ============================================================
// 🧠 Skill Categorization Helper
// ============================================================
function categorizeSkills(skills = []) {
  const categories = {
    programming: [],
    libraries: [],
    tools: [],
    soft: [],
    languages: [],
    certifications: [],
    other: [],
  };

  const specialCases = {
    sql: "SQL",
    api: "API",
    apis: "APIs",
    rest: "REST",
    "rest api": "REST API",
    "rest apis": "REST APIs",
    javascript: "JavaScript",
    typescript: "TypeScript",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    xml: "XML",
    python: "Python",
    java: "Java",
    c: "C",
    "c++": "C++",
    "c#": "C#",
    bash: "Bash",
    kotlin: "Kotlin",
    swift: "Swift",
    golang: "Go",
    go: "Go",
    r: "R",
    matlab: "MATLAB",
    react: "React",
    "node.js": "Node.js",
    nodejs: "Node.js",
    express: "Express",
    flask: "Flask",
    django: "Django",
    pandas: "Pandas",
    numpy: "NumPy",
    matplotlib: "Matplotlib",
    seaborn: "Seaborn",
    "scikit-learn": "Scikit-Learn",
    tensorflow: "TensorFlow",
    keras: "Keras",
    pytorch: "PyTorch",
    plotly: "Plotly",
    dash: "Dash",
    tailwind: "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "next.js": "Next.js",
    nextjs: "Next.js",
    git: "Git",
    github: "GitHub",
    tableau: "Tableau",
    "power bi": "Power BI",
    powerbi: "Power BI",
    hadoop: "Hadoop",
    spark: "Apache Spark",
    "apache spark": "Apache Spark",
    mongo: "MongoDB",
    mongodb: "MongoDB",
    postgresql: "PostgreSQL",
    postgres: "PostgreSQL",
    mysql: "MySQL",
    aws: "AWS",
    azure: "Azure",
    gcp: "GCP",
    docker: "Docker",
    kubernetes: "Kubernetes",
    nosql: "NoSQL",
    etl: "ETL",
    "big data": "Big Data",
    ai: "AI",
    ml: "ML",
    "machine learning": "Machine Learning",
    "artificial intelligence": "Artificial Intelligence",
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
    "golang",
    "matlab",
  ];

  const libraryList = [
    "react",
    "node.js",
    "nodejs",
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
    "tailwind css",
    "next.js",
    "nextjs",
  ];

  const toolList = [
    "git",
    "github",
    "tableau",
    "power bi",
    "powerbi",
    "hadoop",
    "spark",
    "apache spark",
    "mongo",
    "mongodb",
    "postgresql",
    "postgres",
    "mysql",
    "aws",
    "azure",
    "gcp",
    "rest",
    "rest api",
    "nosql",
    "docker",
    "kubernetes",
    "etl",
    "big data",
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

  for (const skillInput of skills) {
    const skill = (
      typeof skillInput === "string" ? skillInput.trim() : skillInput.name || ""
    ).toLowerCase();
    if (!skill) continue;

    // Get proper capitalization
    const capitalizedSkill =
      specialCases[skill] ||
      skill
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    // 🔹 Soft skills first (avoid false positives)
    if (softList.some((kw) => skill.includes(kw)))
      categories.soft.push(capitalizedSkill);
    else if (languageList.some((kw) => skill.includes(kw)))
      categories.languages.push(capitalizedSkill);
    else if (certList.some((kw) => skill.includes(kw)))
      categories.certifications.push(capitalizedSkill);
    else if (programmingList.some((kw) => skill.includes(kw)))
      categories.programming.push(capitalizedSkill);
    else if (libraryList.some((kw) => skill.includes(kw)))
      categories.libraries.push(capitalizedSkill);
    else if (toolList.some((kw) => skill.includes(kw)))
      categories.tools.push(capitalizedSkill);
    else categories.other.push(capitalizedSkill);
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
    console.log(`🧪 Debug HTML saved to: ${debugHTMLPath}`);

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
