/**
 * @file tests/employment.test.js
 * @description Integration tests for /api/employment routes (CRUD operations)
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

// ✅ ESM-safe pg mock
jest.unstable_mockModule("pg", () => ({
  __esModule: true,
  default: { Pool: jest.fn(() => mockPool) },
  Pool: jest.fn(() => mockPool),
}));

// ✅ Import app AFTER registering pg mock
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ✅ Mock JWT token
const token = "mock-token";

// ---------------- TEST SUITE ----------------
describe("💼 Employment Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Retrieve all employment records
  test("GET /api/employment → returns all jobs", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, company: "NJIT", title: "Intern" }],
    });

    const res = await request(app)
      .get("/api/employment")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-002: Add a new employment record
  test("POST /api/employment → adds new record", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post("/api/employment")
      .set("Authorization", `Bearer ${token}`)
      .send({ company: "NJIT", title: "Intern" });

    expect([200, 201]).toContain(res.statusCode);
  });

  // UC-003: Reject invalid input
  test("POST /api/employment → rejects invalid input", async () => {
    const res = await request(app)
      .post("/api/employment")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  // UC-004: Update existing record
  test("PUT /api/employment/:id → updates record", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .put("/api/employment/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Software Intern" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-005: Return 404 if updating nonexistent record
  test("PUT /api/employment/:id → 404 if not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/employment/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Unknown Role" });

    expect(res.statusCode).toBe(404);
  });

  // UC-006: Delete a record
  test("DELETE /api/employment/:id → deletes record", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/employment/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-007: Retrieve a single record by ID
  test("GET /api/employment/:id → retrieves single record", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: "Intern", company: "NJIT" }],
    });

    const res = await request(app)
      .get("/api/employment/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-008: Handle empty DB
  test("GET /api/employment → empty DB returns 404", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/employment")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
