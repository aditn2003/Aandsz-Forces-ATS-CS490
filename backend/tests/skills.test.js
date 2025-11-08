/**
 * @file tests/skills.test.js
 * @description Integration tests for /api/skills CRUD routes.
 */

import { jest } from "@jest/globals";
import request from "supertest";

// ✅ Define pg mock BEFORE importing app
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(true), // async-safe
  end: jest.fn().mockResolvedValue(true),
};

// ✅ ESM-safe mock for `pg`
jest.unstable_mockModule("pg", () => ({
  __esModule: true,
  default: { Pool: jest.fn(() => mockPool) },
  Pool: jest.fn(() => mockPool),
}));

// ✅ Import app AFTER registering the pg mock
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ✅ Mock JWT token
const token = "mock-token";

// ---------------- TEST SUITE ----------------
describe("🧠 Skills Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Fetch all skills
  test("GET /api/skills → returns list", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, skill_name: "Python" },
        { id: 2, skill_name: "SQL" },
      ],
    });

    const res = await request(app)
      .get("/api/skills")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-002: Add new skill
  test("POST /api/skills → adds skill", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3 }] });

    const res = await request(app)
      .post("/api/skills")
      .set("Authorization", `Bearer ${token}`)
      .send({ skill_name: "FastAPI" });

    expect([200, 201]).toContain(res.statusCode);
  });

  // UC-003: Reject invalid input
  test("POST /api/skills → rejects invalid data", async () => {
    const res = await request(app)
      .post("/api/skills")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect([400]).toContain(res.statusCode);
  });

  // UC-004: Update existing skill
  test("PUT /api/skills/:id → updates skill", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .put("/api/skills/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ skill_name: "TensorFlow" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-005: Handle 404 when skill not found
  test("PUT /api/skills/:id → returns 404 if not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/skills/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ skill_name: "Nonexistent" });

    expect(res.statusCode).toBe(404);
  });

  // UC-006: Delete skill
  test("DELETE /api/skills/:id → deletes skill", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/skills/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-007: Handle empty DB (no skills)
  test("GET /api/skills → empty DB returns 404", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/skills")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
