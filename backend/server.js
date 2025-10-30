// =======================
// server.js — Auth + Database (UC-001 → UC-012)
// =======================

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";
import profileRoutes from "./routes/profile.js";
import uploadRoutes from "./routes/upload.js";
import employmentRoutes from "./routes/employment.js";
import skillsRouter from "./routes/skills.js";
import educationRoutes from "./routes/education.js";
import certifications from "./routes/certification.js";
import projectRoutes from "./routes/projects.js";
import path from "path";
import { fileURLToPath } from "url";

// ===== Initialize =====
dotenv.config();
const { Pool } = pkg;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middleware =====
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ✅ Serve uploaded images so React can access them
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== PostgreSQL Setup =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ DB connection error:", err.message));

// ===== Helpers =====
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
}

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// ===== In-memory password reset store (email -> { code, expires }) =====
const resetCodes = new Map(); // for demo; moves to DB later

// ========== UC-001: Register ==========
app.post("/register", async (req, res) => {
  const { email = "", password = "", confirmPassword = "", firstName = "", lastName = "" } = req.body;
  try {
    if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({ error: "Password must be 8+ chars incl. uppercase, lowercase, number" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (!firstName.trim() || !lastName.trim()) {
      return res.status(400).json({ error: "First and last name are required" });
    }

    const lower = email.toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [lower]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, provider) VALUES ($1,$2,$3,$4,'local') RETURNING id",
      [lower, passwordHash, firstName.trim(), lastName.trim()]
    );
    const token = makeToken({ id: result.rows[0].id, email: lower });
    return res.status(201).json({ message: "Registered", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-002: Login ==========
app.post("/login", async (req, res) => {
  const { email = "", password = "" } = req.body;
  try {
    const lower = email.toLowerCase();
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [lower]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = makeToken({ id: user.id, email: user.email });
    return res.json({ message: "Logged in", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-005: Logout ==========
app.post("/logout", (_req, res) => {
  return res.json({ message: "Logged out" });
});

// ========== UC-006: Password Reset Request ==========
app.post("/forgot", async (req, res) => {
  try {
    const { email = "" } = req.body;
    const lower = email.toLowerCase();
    const result = await pool.query("SELECT id FROM users WHERE email=$1", [lower]);

    if (result.rows.length > 0) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 60 * 60 * 1000;
      resetCodes.set(lower, { code, expires });
      return res.json({ message: "If that email exists, a reset code was sent.", demoCode: code });
    }
    return res.json({ message: "If that email exists, a reset code was sent." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-007: Password Reset Completion ==========
app.post("/reset", async (req, res) => {
  const { email = "", code = "", newPassword = "", confirmPassword = "" } = req.body;
  const lower = email.toLowerCase();

  try {
    const entry = resetCodes.get(lower);
    if (!entry || !entry.code || Date.now() > entry.expires || entry.code !== String(code).trim()) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    if (newPassword !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });
    if (!PASSWORD_RULE.test(newPassword))
      return res.status(400).json({ error: "Weak password" });

    const hash = await bcrypt.hash(newPassword, 10);
    const upd = await pool.query("UPDATE users SET password_hash=$1 WHERE email=$2 RETURNING id", [hash, lower]);
    if (upd.rows.length === 0) return res.status(404).json({ error: "User not found" });

    resetCodes.delete(lower);
    const token = makeToken({ id: upd.rows[0].id, email: lower });
    res.json({ message: "Password updated", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-008: Profile Access Control ==========
app.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, first_name AS firstName, last_name AS lastName FROM users WHERE id=$1",
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/me", auth, async (req, res) => {
  const { firstName = "", lastName = "" } = req.body;
  try {
    await pool.query(
      "UPDATE users SET first_name=$1, last_name=$2 WHERE id=$3",
      [firstName, lastName, req.userId]
    );
    res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-009: Account Deletion ==========
app.post("/delete", auth, async (req, res) => {
  try {
    const { password = "" } = req.body;
    const userRes = await pool.query("SELECT * FROM users WHERE id=$1", [req.userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const user = userRes.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    await pool.query("DELETE FROM users WHERE id=$1", [req.userId]);
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-003 & UC-004: OAuth (demo stubs) ==========
app.post("/google", async (req, res) => {
  const { email = "", firstName = "Google", lastName = "User" } = req.body;
  if (!email.includes("@")) return res.status(400).json({ error: "Bad google token/email" });

  const lower = email.toLowerCase();
  try {
    let result = await pool.query("SELECT id FROM users WHERE email=$1", [lower]);
    if (result.rows.length === 0) {
      result = await pool.query(
        "INSERT INTO users (email, first_name, last_name, provider) VALUES ($1,$2,$3,'google') RETURNING id",
        [lower, firstName, lastName]
      );
    }
    const token = makeToken({ id: result.rows[0].id, email: lower });
    res.json({ message: "Google login ok", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== Routes =====
app.use("/api", profileRoutes);
app.use("/api", uploadRoutes);
app.use("/api", employmentRoutes);
app.use("/skills", skillsRouter);
app.use("/api", educationRoutes);
app.use("/api", certifications);
app.use("/api", projectRoutes);

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// ===== Health Check =====
app.get("/", (_req, res) => res.json({ ok: true }));

// ===== Start Server =====
app.listen(4000, () => console.log("✅ API running at http://localhost:4000"));
