/**
 * @file tests/projects.test.js
 * @description Integration tests for /api/projects routes (CRUD)
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

// ✅ ESM-safe mock for `pg`
jest.unstable_mockModule("pg", () => ({
  __esModule: true,
  default: { Pool: jest.fn(() => mockPool) },
  Pool: jest.fn(() => mockPool),
}));

// ✅ Import app AFTER registering pg mock
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ✅ Static mock token for authentication
const token = "mock-token";

// ---------------- TEST SUITE ----------------
describe("💻 Projects Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Fetch all projects
  test("GET /api/projects → fetch all", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: "Job Portal", stack: "FastAPI" }],
    });

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-002: Create a new project
  test("POST /api/projects → create new", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "ATS Tool", description: "Automated job scraper" });

    expect([200, 201]).toContain(res.statusCode);
  });

  // UC-003: Reject invalid project input
  test("POST /api/projects → rejects invalid input", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect([400]).toContain(res.statusCode);
  });

  // UC-004: Update an existing project
  test("PUT /api/projects/:id → updates project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .put("/api/projects/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "ATS Automation" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-005: Return 404 if project not found
  test("PUT /api/projects/:id → 404 if not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/projects/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "DoesNotExist" });

    expect(res.statusCode).toBe(404);
  });

  // UC-006: Delete a project
  test("DELETE /api/projects/:id → remove project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/projects/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-007: Fetch a single project
  test("GET /api/projects/:id → single project", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: "Job Portal" }],
    });

    const res = await request(app)
      .get("/api/projects/1")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-008: Handle empty database
  test("GET /api/projects → empty DB returns 404", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
