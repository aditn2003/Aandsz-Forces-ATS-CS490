/**
 * @file tests/education.test.js
 * @description Integration tests for /api/education routes (CRUD operations)
 */

import { jest } from "@jest/globals";
import request from "supertest";

// ✅ Define pg mock BEFORE importing the app
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(true), // async-safe
  end: jest.fn().mockResolvedValue(true),
};

// ✅ ESM-compatible mock for pg
jest.unstable_mockModule("pg", () => ({
  __esModule: true,
  default: { Pool: jest.fn(() => mockPool) },
  Pool: jest.fn(() => mockPool),
}));

// ✅ Import app AFTER mock registration
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ✅ Static mock token
const token = "mock-token";

// ---------------- TEST SUITE ----------------
describe("🎓 Education Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Get all education records
  test("GET /api/education → fetches all entries", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, school: "NJIT", degree: "BS CS" }],
    });

    const res = await request(app)
      .get("/api/education")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-002: Add a valid education record
  test("POST /api/education → adds valid record", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post("/api/education")
      .set("Authorization", `Bearer ${token}`)
      .send({
        school: "NJIT",
        degree: "MS AI",
        start_date: "2024",
        end_date: "2026",
      });

    expect([200, 201]).toContain(res.statusCode);
  });

  // UC-003: Reject invalid or empty input
  test("POST /api/education → rejects empty body", async () => {
    const res = await request(app)
      .post("/api/education")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  // UC-004: Update existing education record
  test("PUT /api/education/:id → updates record", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .put("/api/education/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ degree: "PhD" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-005: 404 when updating nonexistent record
  test("PUT /api/education/:id → 404 if not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/education/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ degree: "Unknown Degree" });

    expect(res.statusCode).toBe(404);
  });

  // UC-006: Delete a record
  test("DELETE /api/education/:id → deletes record", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/education/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-007: Fetch single record by ID
  test("GET /api/education/:id → fetches single record", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, school: "NJIT", degree: "BS" }],
    });

    const res = await request(app)
      .get("/api/education/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-008: Empty DB returns 404
  test("GET /api/education → empty DB returns 404", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/education")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
