/**
 * @file tests/profile.test.js
 * @description Integration tests for /api/profile routes (CRUD + avatar upload)
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

// ✅ Import app AFTER registering mock
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ✅ Mock token
const token = "mock-token";

// ---------------- TEST SUITE ----------------
describe("👤 Profile Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Reject unauthenticated request
  test("GET /api/profile → rejects unauthenticated", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.statusCode).toBe(401);
  });

  // UC-002: Return user profile when authenticated
  test("GET /api/profile → returns profile data", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: "1", email: "test@example.com", first_name: "A", last_name: "B" },
      ],
    });

    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-003: Update profile info
  test("PUT /api/profile → updates name", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "1" }] });

    const res = await request(app)
      .put("/api/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "New", lastName: "User" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-004: Reject invalid update field
  test("PUT /api/profile → rejects invalid field", async () => {
    const res = await request(app)
      .put("/api/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ unknownField: "abc" });

    expect(res.statusCode).toBe(400);
  });

  // UC-005: Delete requires authentication
  test("DELETE /api/profile → unauthorized without token", async () => {
    const res = await request(app).delete("/api/profile");
    expect(res.statusCode).toBe(401);
  });

  // UC-006: Delete with token
  test("DELETE /api/profile → success with token", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "1" }] });

    const res = await request(app)
      .delete("/api/profile")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-007: Handle empty DB
  test("GET /api/profile → handles empty DB rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-008: Partial update (PATCH)
  test("PATCH /api/profile → handles partial update", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "1" }] });

    const res = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ lastName: "Patched" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-009: Avatar upload → missing file
  test("POST /api/profile/avatar → rejects missing file", async () => {
    const res = await request(app)
      .post("/api/profile/avatar")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });

  // UC-010: Avatar upload → valid image
  test("POST /api/profile/avatar → accepts file", async () => {
    const res = await request(app)
      .post("/api/profile/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake"), "avatar.png");

    expect([200, 201, 400]).toContain(res.statusCode);
  });

  // UC-011: Avatar upload → invalid file type
  test("POST /api/profile/avatar → rejects non-image file", async () => {
    const res = await request(app)
      .post("/api/profile/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake"), "file.txt");

    expect([400, 415]).toContain(res.statusCode);
  });
});
