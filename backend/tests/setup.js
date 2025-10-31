import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

// Silence dotenv logs
jest.unstable_mockModule("dotenv", () => ({
  config: jest.fn(() => ({})),
  default: { config: jest.fn(() => ({})) },
}));

// Global pg mock
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(true),
  end: jest.fn().mockResolvedValue(true),
};
jest.unstable_mockModule("pg", () => ({
  Pool: jest.fn(() => mockPool),
  default: { Pool: jest.fn(() => mockPool) },
}));

// JWT verify mock
jest.spyOn(jwt, "verify").mockImplementation((token) => jwt.decode(token));

export { mockQuery, mockPool };
