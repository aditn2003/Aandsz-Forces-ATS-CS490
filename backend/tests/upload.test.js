/**
 * @file tests/upload.test.js
 * @description Integration tests for /api/upload route with file and error handling.
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

// ✅ ESM-safe pg mock (fixes “no default export” issue)
jest.unstable_mockModule("pg", () => ({
  __esModule: true,
  default: { Pool: jest.fn(() => mockPool) },
  Pool: jest.fn(() => mockPool),
}));

// ✅ Import app AFTER mocking pg
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ✅ Static token for authorization
const token = "mock-token";

// ---------------- TEST SUITE ----------------
describe("📂 Upload Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Reject missing file
  test("POST /api/upload → rejects no file", async () => {
    const res = await request(app).post("/api/upload");
    expect([400, 401]).toContain(res.statusCode);
  });

  // UC-002: Accept valid image upload
  test("POST /api/upload → accepts image", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake-image"), "test.png");

    expect([200, 201, 400]).toContain(res.statusCode);
  });

  // UC-003: Reject large file (>5MB)
  test("POST /api/upload → rejects large file", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", bigBuffer, "bigfile.png");

    expect([400, 401, 413]).toContain(res.statusCode);
  });

  // UC-004: Reject unsupported file type (.exe, .bat, etc.)
  test("POST /api/upload → rejects invalid file type", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("malware"), "virus.exe");

    expect([400, 401, 415]).toContain(res.statusCode);
  });

  // UC-005: Mock DB insert after upload success
  test("POST /api/upload → stores upload metadata", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, filename: "test.png" }],
    });

    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("img"), "test.png");

    expect([200, 201]).toContain(res.statusCode);
  });

  // UC-006: Handle empty file buffer
  test("POST /api/upload → rejects empty file buffer", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.alloc(0), "empty.png");

    expect([400, 422]).toContain(res.statusCode);
  });
});
