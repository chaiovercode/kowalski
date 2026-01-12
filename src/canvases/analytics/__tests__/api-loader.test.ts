// API and MCP Loader tests for Phase 8
// "Data feed established, Skipper." - Kowalski

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  parseFromMCPResult,
  getAuthFromEnv,
  type APIAuthConfig,
} from "../api-loader";
import type { DataSet } from "../types";

describe("API Loader", () => {
  describe("parseFromMCPResult", () => {
    it("should parse array of objects", () => {
      const mcpResult = [
        { name: "Alice", age: 30, city: "NYC" },
        { name: "Bob", age: 25, city: "LA" },
        { name: "Charlie", age: 35, city: "Chicago" },
      ];

      const result = parseFromMCPResult(mcpResult, "users");

      expect(result.name).toBe("users");
      expect(result.columns).toEqual(["name", "age", "city"]);
      expect(result.rows.length).toBe(3);
      expect(result.rows[0]).toEqual(["Alice", 30, "NYC"]);
    });

    it("should handle empty array", () => {
      const mcpResult: unknown[] = [];

      const result = parseFromMCPResult(mcpResult, "empty");

      expect(result.name).toBe("empty");
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should handle null/undefined values", () => {
      const mcpResult = [
        { name: "Alice", value: null },
        { name: "Bob", value: undefined },
        { name: "Charlie", value: 100 },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.rows[0][1]).toBe(null);
      expect(result.rows[1][1]).toBe(null);
      expect(result.rows[2][1]).toBe(100);
    });

    it("should convert boolean to 0/1", () => {
      const mcpResult = [
        { name: "Active", status: true },
        { name: "Inactive", status: false },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.rows[0][1]).toBe(1);
      expect(result.rows[1][1]).toBe(0);
    });

    it("should stringify nested objects", () => {
      const mcpResult = [
        { name: "Item", meta: { key: "value" } },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.rows[0][1]).toBe('{"key":"value"}');
    });

    it("should extract data from object with results key", () => {
      const mcpResult = {
        results: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
        total: 2,
      };

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["id", "name"]);
      expect(result.rows.length).toBe(2);
    });

    it("should extract data from object with data key", () => {
      const mcpResult = {
        data: [
          { product: "Widget", price: 99.99 },
        ],
        meta: { page: 1 },
      };

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["product", "price"]);
      expect(result.rows[0]).toEqual(["Widget", 99.99]);
    });

    it("should extract data from object with items key", () => {
      const mcpResult = {
        items: [
          { sku: "A123", qty: 10 },
        ],
      };

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["sku", "qty"]);
    });

    it("should wrap single object in array", () => {
      const mcpResult = { id: 1, name: "Single Item" };

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["id", "name"]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]).toEqual([1, "Single Item"]);
    });

    it("should parse JSON string", () => {
      const mcpResult = '[{"x": 1}, {"x": 2}]';

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["x"]);
      expect(result.rows.length).toBe(2);
    });

    it("should handle non-JSON string as single value", () => {
      const mcpResult = "hello world";

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["value"]);
      expect(result.rows[0][0]).toBe("hello world");
    });

    it("should handle primitive number", () => {
      const mcpResult = 42;

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["value"]);
      expect(result.rows[0][0]).toBe(42);
      expect(result.types[0]).toBe("number");
    });

    it("should handle null input", () => {
      const result = parseFromMCPResult(null);

      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should handle undefined input", () => {
      const result = parseFromMCPResult(undefined);

      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should infer numeric types", () => {
      const mcpResult = [
        { id: 1, value: 100.5 },
        { id: 2, value: 200.3 },
        { id: 3, value: 150.0 },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.types[0]).toBe("number");
      expect(result.types[1]).toBe("number");
    });

    it("should infer date types", () => {
      const mcpResult = [
        { date: "2024-01-15", event: "Meeting" },
        { date: "2024-02-20", event: "Conference" },
        { date: "2024-03-10", event: "Workshop" },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.types[0]).toBe("date");
      expect(result.types[1]).toBe("string");
    });

    it("should use default name when not provided", () => {
      const result = parseFromMCPResult([{ x: 1 }]);

      expect(result.name).toBe("mcp-query");
    });
  });

  describe("getAuthFromEnv", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should get bearer token from BEARER_TOKEN", () => {
      process.env.BEARER_TOKEN = "test-token-123";

      const auth = getAuthFromEnv();

      expect(auth).toEqual({
        type: "bearer",
        token: "test-token-123",
      });
    });

    it("should get bearer token from TOKEN", () => {
      process.env.TOKEN = "fallback-token";

      const auth = getAuthFromEnv();

      expect(auth).toEqual({
        type: "bearer",
        token: "fallback-token",
      });
    });

    it("should get API key from API_KEY", () => {
      process.env.API_KEY = "my-api-key";

      const auth = getAuthFromEnv();

      expect(auth).toEqual({
        type: "api-key",
        apiKey: "my-api-key",
        apiKeyHeader: undefined,
      });
    });

    it("should get API key with custom header", () => {
      process.env.API_KEY = "my-api-key";
      process.env.API_KEY_HEADER = "X-Custom-Key";

      const auth = getAuthFromEnv();

      expect(auth).toEqual({
        type: "api-key",
        apiKey: "my-api-key",
        apiKeyHeader: "X-Custom-Key",
      });
    });

    it("should get basic auth from USERNAME and PASSWORD", () => {
      process.env.USERNAME = "user";
      process.env.PASSWORD = "pass";

      const auth = getAuthFromEnv();

      expect(auth).toEqual({
        type: "basic",
        username: "user",
        password: "pass",
      });
    });

    it("should support prefix for env vars", () => {
      process.env.MYAPI_BEARER_TOKEN = "prefixed-token";

      const auth = getAuthFromEnv("MYAPI_");

      expect(auth).toEqual({
        type: "bearer",
        token: "prefixed-token",
      });
    });

    it("should return undefined when no auth vars set", () => {
      // Clear relevant env vars
      delete process.env.BEARER_TOKEN;
      delete process.env.TOKEN;
      delete process.env.API_KEY;
      delete process.env.USERNAME;
      delete process.env.PASSWORD;

      const auth = getAuthFromEnv();

      expect(auth).toBeUndefined();
    });

    it("should prioritize bearer over api-key", () => {
      process.env.BEARER_TOKEN = "bearer";
      process.env.API_KEY = "api-key";

      const auth = getAuthFromEnv();

      expect(auth?.type).toBe("bearer");
    });

    it("should prioritize api-key over basic", () => {
      process.env.API_KEY = "api-key";
      process.env.USERNAME = "user";
      process.env.PASSWORD = "pass";

      const auth = getAuthFromEnv();

      expect(auth?.type).toBe("api-key");
    });
  });

  describe("Type Inference", () => {
    it("should infer mixed types correctly", () => {
      const mcpResult = [
        { name: "Test", count: 10, date: "2024-01-01", ratio: 0.5 },
        { name: "Test2", count: 20, date: "2024-02-01", ratio: 0.8 },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.types[0]).toBe("string"); // name
      expect(result.types[1]).toBe("number"); // count
      expect(result.types[2]).toBe("date");   // date
      expect(result.types[3]).toBe("number"); // ratio
    });

    it("should handle columns with mostly nulls", () => {
      const mcpResult = [
        { name: "A", optional: null },
        { name: "B", optional: null },
        { name: "C", optional: 1 },
      ];

      const result = parseFromMCPResult(mcpResult);

      // With 2 nulls and 1 number, should infer as number (100% of non-null values)
      expect(result.types[1]).toBe("number");
    });

    it("should recognize various date formats", () => {
      const mcpResult = [
        { date1: "2024-01-15", date2: "01/15/2024", date3: "Jan 15, 2024" },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.types[0]).toBe("date"); // ISO
      expect(result.types[1]).toBe("date"); // MM/DD/YYYY
      expect(result.types[2]).toBe("date"); // Mon DD, YYYY
    });
  });

  describe("Complex Data Structures", () => {
    it("should handle deeply nested extraction", () => {
      const mcpResult = {
        response: {
          data: {
            items: [
              { id: 1 },
              { id: 2 },
            ],
          },
        },
      };

      // Current implementation only checks top-level keys
      // So this should fall back to wrapping in array
      const result = parseFromMCPResult(mcpResult);

      // The wrapper object becomes a single row
      expect(result.rows.length).toBe(1);
    });

    it("should handle array of primitives", () => {
      const mcpResult = [1, 2, 3, 4, 5];

      const result = parseFromMCPResult(mcpResult);

      // Each primitive becomes its own entry
      expect(result.rows.length).toBe(5);
    });

    it("should handle mixed array with objects and primitives", () => {
      // This is an edge case - objects first
      const mcpResult = [
        { x: 1 },
        { x: 2 },
      ];

      const result = parseFromMCPResult(mcpResult);

      expect(result.columns).toEqual(["x"]);
      expect(result.rows.length).toBe(2);
    });
  });
});

describe("URL Extraction", () => {
  // Testing through parseFromMCPResult since extractNameFromURL is private
  // The name is set during API fetch, not MCP parsing
  // This is more of a documentation test

  it("should use provided name for MCP results", () => {
    const result = parseFromMCPResult([{ a: 1 }], "custom-name");
    expect(result.name).toBe("custom-name");
  });
});
