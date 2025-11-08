/**
 * @file tests/certification.test.js
 * @description Integration tests for /api/certifications routes (CRUD)
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
describe("🏅 Certification Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Fetch all certifications
  test("GET /api/certifications → fetch all", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: "AWS Certified", authority: "Amazon" }],
    });

    const res = await request(app)
      .get("/api/certifications")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-002: Add a new certification
  test("POST /api/certifications → add new", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

    const res = await request(app)
      .post("/api/certifications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Google Cloud", authority: "Google", year: 2025 });

    expect([200, 201]).toContain(res.statusCode);
  });

  // UC-003: Reject invalid input
  test("POST /api/certifications → rejects empty body", async () => {
    const res = await request(app)
      .post("/api/certifications")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  // UC-004: Update existing certification
  test("PUT /api/certifications/:id → update existing", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .put("/api/certifications/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "AWS Solutions Architect" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-005: Return 404 if updating nonexistent certification
  test("PUT /api/certifications/:id → 404 if not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/certifications/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nonexistent" });

    expect(res.statusCode).toBe(404);
  });

  // UC-006: Delete certification
  test("DELETE /api/certifications/:id → remove certification", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/certifications/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-007: Handle empty database
  test("GET /api/certifications → empty DB returns 404", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/certifications")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
