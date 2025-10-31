import { jest } from "@jest/globals";

// ✅ Create mock query + async-safe Pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(true), // ✅ Return a resolved Promise
  end: jest.fn().mockResolvedValue(true), // ✅ Also mock async .end()
};

// ✅ ESM-safe pg mock for Jest (covers both import styles)
jest.unstable_mockModule("pg", () => ({
  __esModule: true,
  default: { Pool: jest.fn(() => mockPool) }, // handles "import pkg from 'pg'"
  Pool: jest.fn(() => mockPool), // handles "import { Pool } from 'pg'"
}));

export { mockQuery, mockPool };
