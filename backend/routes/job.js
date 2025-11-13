// -----------------------------------------
// routes/job.js  (UPDATED WITH MATERIALS HISTORY)
// -----------------------------------------
import express from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const STAGES = ["Interested", "Applied", "Phone Screen", "Interview", "Offer", "Rejected"];

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --------------------------------------------------
// 🔥 CREATE JOB  +  MATERIALS HISTORY INSERT
// --------------------------------------------------
router.post("/", auth, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      salary_min,
      salary_max,
      url,
      deadline,
      description,
      industry,
      type,
      applied_on,
      resume_id,        // linked resume
      cover_letter_id,  // linked cover letter
    } = req.body;

    if (!title || !company) {
      return res.status(400).json({ error: "Title and company are required." });
    }

    if (!deadline) {
      return res.status(400).json({ error: "Deadline is required." });
    }

    const cleanNumber = (v) => {
      if (!v) return null;
      const num = parseInt(String(v).replace(/[^\d]/g, ""), 10);
      return isNaN(num) ? null : num;
    };

    const safeSalaryMin = cleanNumber(salary_min);
    const safeSalaryMax = cleanNumber(salary_max);

    const insertJobQuery = `
      INSERT INTO jobs (
        user_id, title, company, location, salary_min, salary_max,
        url, deadline, description, industry, type,
        applied_on, resume_id, cover_letter_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *;
    `;

    const jobValues = [
      req.userId,
      title,
      company,
      location || null,
      safeSalaryMin,
      safeSalaryMax,
      url || null,
      deadline,
      description || null,
      industry || null,
      type || null,
      applied_on || new Date().toISOString().split("T")[0],
      resume_id || null,
      cover_letter_id || null,
    ];

    const { rows } = await pool.query(insertJobQuery, jobValues);
    const newJob = rows[0];

    // 🧩 RECORD MATERIAL HISTORY
    if (resume_id || cover_letter_id) {
      await pool.query(
        `INSERT INTO application_materials_history (job_id, resume_id, cover_letter_id)
         VALUES ($1, $2, $3)`,
        [newJob.id, resume_id || null, cover_letter_id || null]
      );
    }

    res.status(201).json({
      status: "success",
      job: newJob,
      message: "Job created successfully + materials history recorded.",
    });

  } catch (err) {
    console.error("❌ Job insert error:", err);
    res.status(500).json({ error: "Failed to save job." });
  }
});

// --------------------------------------------------
// 🔥 GET ALL JOBS
// --------------------------------------------------
router.get("/", auth, async (req, res) => {
  try {
    const {
      search,
      status,
      industry,
      location,
      salaryMin,
      salaryMax,
      dateFrom,
      dateTo,
      sortBy = "date_added",
    } = req.query;

    const params = [req.userId];
    const where = ["user_id = $1"];
    let i = 2;

    if (search) {
      where.push(`(title ILIKE $${i} OR company ILIKE $${i} OR description ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    if (status && STAGES.includes(status)) {
      where.push(`LOWER(status) = LOWER($${i})`);
      params.push(status.trim());
      i++;
    }

    if (industry) {
      where.push(`industry ILIKE $${i}`);
      params.push(`%${industry}%`);
      i++;
    }

    if (location) {
      where.push(`location ILIKE $${i}`);
      params.push(`%${location}%`);
      i++;
    }

    if (salaryMin) {
      where.push(`salary_min >= $${i}`);
      params.push(salaryMin);
      i++;
    }

    if (salaryMax) {
      where.push(`salary_max <= $${i}`);
      params.push(salaryMax);
      i++;
    }

    if (dateFrom) {
      where.push(`deadline >= $${i}`);
      params.push(dateFrom);
      i++;
    }

    if (dateTo) {
      where.push(`deadline <= $${i}`);
      params.push(dateTo);
      i++;
    }

    let orderColumn = "created_at";
    switch (sortBy) {
      case "deadline":
        orderColumn = "deadline";
        break;
      case "salary":
        orderColumn = "salary_max";
        break;
      case "company":
        orderColumn = "company";
        break;
      default:
        orderColumn = "created_at";
    }

    const result = await pool.query(
      `
      SELECT *,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, created_at))) / 86400.0))::int AS days_in_stage
      FROM jobs
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderColumn} DESC
    `,
      params
    );

    res.json({ jobs: result.rows });
  } catch (err) {
    console.error("❌ Fetch jobs error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// --------------------------------------------------
// 🔥 GET SINGLE JOB
// --------------------------------------------------
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (jobResult.rows.length === 0)
      return res.status(404).json({ error: "Job not found" });

    const job = jobResult.rows[0];

    // Load application history
    const historyResult = await pool.query(
      `
      SELECT id, event, timestamp
      FROM application_history
      WHERE job_id = $1
      ORDER BY timestamp DESC
      `,
      [id]
    );

    job.history = historyResult.rows;

    res.json({ job });
  } catch (err) {
    console.error("❌ Get job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});


// --------------------------------------------------
// 🔥 UPDATE JOB + RECORD MATERIALS HISTORY
// --------------------------------------------------
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "title", "company", "location", "status",
      "salary_min", "salary_max", "deadline", "description",
      "industry", "type", "notes", "contact_name",
      "contact_email", "contact_phone", "salary_notes",
      "interview_feedback", "resume_id", "cover_letter_id"
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No valid fields to update" });

    // Dynamic SQL
    const setClause = Object.keys(updates)
      .map((k, i) => `${k} = $${i + 1}`)
      .join(", ");

    const values = Object.values(updates);

    const result = await pool.query(
      `
      UPDATE jobs
      SET ${setClause},
          status_updated_at = CASE
            WHEN $${values.length + 1} IS DISTINCT FROM status
            THEN NOW()
            ELSE status_updated_at
          END
      WHERE id = $${values.length + 2}
        AND user_id = $${values.length + 3}
      RETURNING *;
      `,
      [...values, updates.status || null, id, req.userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found" });

    const job = result.rows[0];

    // 🔥 If materials changed → ADD HISTORY ENTRY
    if (updates.resume_id || updates.cover_letter_id) {
      await pool.query(
        `
        INSERT INTO application_materials_history (job_id, resume_id, cover_letter_id)
        VALUES ($1, $2, $3)
      `,
        [id, updates.resume_id || null, updates.cover_letter_id || null]
      );
    }

    res.json({ job });

  } catch (err) {
    console.error("❌ Job update error:", err.message);
    res.status(500).json({ error: "Database update failed" });
  }
});

// --------------------------------------------------
// 🔥 MATERIALS HISTORY FOR THIS JOB
// --------------------------------------------------
// --------------------------------------------------
// 🔥 MATERIALS HISTORY FOR THIS JOB (FINAL VERSION)
// --------------------------------------------------
router.get("/:id/materials-history", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        h.id,
        h.changed_at,
        r.title AS resume_title,
        c.title AS cover_title
      FROM application_materials_history h
      LEFT JOIN resumes r ON r.id = h.resume_id
      LEFT JOIN cover_letters c ON c.id = h.cover_letter_id
      WHERE h.job_id = $1
      ORDER BY h.changed_at DESC;
      `,
      [id]
    );

    res.json({ history: result.rows });
  } catch (err) {
    console.error("❌ History fetch error:", err.message);
    res.status(500).json({ error: "Failed to load materials history" });
  }
});



// UPDATE LINKED RESUME & COVER LETTER
// ---------- UPDATE MATERIALS (resume + cover letter) ----------
router.put("/:id/materials", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resume_id, cover_letter_id } = req.body;

    // Update the job with new resume + cover letter
    const updateQuery = `
      UPDATE jobs 
      SET resume_id = $1,
          cover_letter_id = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *;
    `;

    const updateValues = [
      resume_id || null,
      cover_letter_id || null,
      id,
      req.userId,
    ];

    const result = await pool.query(updateQuery, updateValues);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found or unauthorized" });

    const updatedJob = result.rows[0];

    // Insert a new materials history log
    await pool.query(
      `
      INSERT INTO application_materials_history (job_id, resume_id, cover_letter_id)
      VALUES ($1, $2, $3)
    `,
      [id, resume_id || null, cover_letter_id || null]
    );

    res.json({
      message: "Materials updated successfully",
      job: updatedJob,
    });
  } catch (err) {
    console.error("❌ Materials update error:", err.message);
    res.status(500).json({ error: "Failed to update materials" });
  }
});

// --------------------------------------------------
// 🔥 UPDATE ONLY JOB STATUS + LOG HISTORY
// --------------------------------------------------
router.put("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    // Update the job status
    const result = await pool.query(
      `
      UPDATE jobs
      SET status = $1,
          status_updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *;
      `,
      [status, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    // Log application history
    await pool.query(
      `
      INSERT INTO application_history (job_id, event)
      VALUES ($1, $2)
      `,
      [id, `Status changed to "${status}"`]
    );

    res.json({
      job: result.rows[0],
      message: "Status updated + history logged",
    });
  } catch (err) {
    console.error("❌ Status update error:", err.message);
    res.status(500).json({ error: "Failed to update status" });
  }
});



// --------------------------------------------------
// BULK DEADLINE UPDATE
// --------------------------------------------------
router.put("/bulk/deadline", auth, async (req, res) => {
  const { jobIds, daysToAdd } = req.body;

  if (!Array.isArray(jobIds) || jobIds.length === 0)
    return res.status(400).json({ error: "No job IDs provided" });

  const days = parseInt(daysToAdd, 10);
  if (isNaN(days) || days === 0)
    return res.status(400).json({ error: "Invalid daysToAdd" });

  try {
    const result = await pool.query(
      `
      UPDATE jobs
      SET deadline = deadline + INTERVAL '${days} days',
          status_updated_at = NOW()
      WHERE user_id = $1 AND id = ANY($2::int[])
      RETURNING id, title, deadline;
      `,
      [req.userId, jobIds]
    );

    res.json({ updated: result.rows });
  } catch (err) {
    console.error("❌ Bulk deadline update error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
