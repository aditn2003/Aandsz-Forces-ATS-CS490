/**
 * @file tests/auth.test.js
 * @description Integration tests for authentication and user security routes
 */

import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ✅ Import shared pg mock BEFORE app
import { mockQuery } from "./setupPgMock.js";

// ✅ Import app AFTER pg mock registration
const appImport = await import("../server.js");
const app = appImport.default || appImport;

// ------------------ Helpers ------------------
const TEST_SECRET = process.env.JWT_SECRET || "testsecret";
const makeToken = (id, email) =>
  jwt.sign({ id, email }, TEST_SECRET, { expiresIn: "1h" });

// ✅ bcrypt.hash must run async
let user;
beforeAll(async () => {
  user = {
    id: "u-123",
    email: "test@example.com",
    password_hash: await bcrypt.hash("Password1", 10),
  };
});

// ------------------ TEST SUITE ------------------
describe("🔐 Auth Routes", () => {
  beforeEach(() => mockQuery.mockReset());

  // UC-001: Registration
  test("POST /register → missing email", async () => {
    const res = await request(app).post("/register").send({});
    expect(res.statusCode).toBe(400);
  });

  test("POST /register → invalid password", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: user.email, password: "weak", confirmPassword: "weak" });
    expect(res.statusCode).toBe(400);
  });

  test("POST /register → duplicate email", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "exists" }] });

    const res = await request(app).post("/register").send({
      email: user.email,
      password: "Password1",
      confirmPassword: "Password1",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.statusCode).toBe(409);
  });

  test("POST /register → success", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // no duplicate
      .mockResolvedValueOnce({ rows: [{ id: user.id }] });

    const res = await request(app).post("/register").send({
      email: user.email,
      password: "Password1",
      confirmPassword: "Password1",
      firstName: "Test",
      lastName: "User",
    });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.token).toBeDefined();
  });

  // UC-002: Login
  test("POST /login → invalid email", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/login")
      .send({ email: "bad@example.com", password: "Password1" });

    expect(res.statusCode).toBe(401);
  });

  test("POST /login → wrong password", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post("/login")
      .send({ email: user.email, password: "WrongPass" });

    expect(res.statusCode).toBe(401);
  });

  test("POST /login → success", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post("/login")
      .send({ email: user.email, password: "Password1" });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  // UC-003: Logout
  test("POST /logout → always success", async () => {
    const res = await request(app).post("/logout");
    expect(res.statusCode).toBe(200);
  });

  // UC-004: Profile Access (/me)
  test("GET /me → rejects no token", async () => {
    const res = await request(app).get("/me");
    expect(res.statusCode).toBe(401);
  });

  test("GET /me → returns profile when authed", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [user] });

    const token = makeToken(user.id, user.email);
    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  test("PUT /me → updates name", async () => {
    const token = makeToken(user.id, user.email);
    mockQuery.mockResolvedValueOnce({ rows: [{ id: user.id }] });

    const res = await request(app)
      .put("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "New", lastName: "User" });

    expect([200, 404]).toContain(res.statusCode);
  });

  // UC-005: Google OAuth
  test("POST /google → invalid credential handled gracefully", async () => {
    const res = await request(app)
      .post("/google")
      .send({ credential: "mock-google-jwt" });

    // Always fails validation due to mock, expect 500
    expect(res.statusCode).toBe(500);
  });

  // UC-006: Account Deletion
  test("POST /delete → invalid password", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [user] });
    const token = makeToken(user.id, user.email);

    const res = await request(app)
      .post("/delete")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "wrong" });

    expect(res.statusCode).toBe(401);
  });

  test("POST /delete → valid password", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [user] })
      .mockResolvedValueOnce({ rows: [] }); // deletion success

    const token = makeToken(user.id, user.email);
    const res = await request(app)
      .post("/delete")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "Password1" });

    expect([200, 204]).toContain(res.statusCode);
  });
});
