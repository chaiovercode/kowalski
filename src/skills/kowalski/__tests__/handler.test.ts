// Tests for Kowalski Handler
import { describe, test, expect } from "bun:test";
import { parseArgs } from "../handler";

describe("handler", () => {
  describe("parseArgs", () => {
    test("empty args returns recon command", () => {
      const result = parseArgs([]);
      expect(result.command).toBe("recon");
    });

    test("analyze command parses correctly", () => {
      const result = parseArgs(["analyze", "test.csv"]);
      expect(result.command).toBe("analyze");
      expect(result.files).toContain("test.csv");
    });

    test("compare command parses two files", () => {
      const result = parseArgs(["compare", "file1.csv", "file2.csv"]);
      expect(result.command).toBe("compare");
      expect(result.files).toEqual(["file1.csv", "file2.csv"]);
    });

    test("help command is recognized", () => {
      const result = parseArgs(["help"]);
      expect(result.command).toBe("help");
    });

    test("memory command is recognized", () => {
      const result = parseArgs(["memory"]);
      expect(result.command).toBe("memory");
    });

    test("dashboard command is recognized", () => {
      const result = parseArgs(["dashboard"]);
      expect(result.command).toBe("dashboard");
    });

    test("query command is recognized", () => {
      const result = parseArgs(["query"]);
      expect(result.command).toBe("query");
    });

    test("csv file as first arg triggers analyze", () => {
      const result = parseArgs(["data.csv"]);
      expect(result.command).toBe("analyze");
      expect(result.files).toContain("data.csv");
    });

    test("json file as first arg triggers analyze", () => {
      const result = parseArgs(["data.json"]);
      expect(result.command).toBe("analyze");
      expect(result.files).toContain("data.json");
    });

    test("tsv file as first arg triggers analyze", () => {
      const result = parseArgs(["data.tsv"]);
      expect(result.command).toBe("analyze");
      expect(result.files).toContain("data.tsv");
    });

    test("unknown command shows help", () => {
      const result = parseArgs(["unknowncommand"]);
      expect(result.command).toBe("help");
    });

    test("parses --option flags", () => {
      const result = parseArgs(["analyze", "test.csv", "--no-canvas"]);
      expect(result.options?.["no-canvas"]).toBe(true);
    });

    test("parses --option=value flags", () => {
      const result = parseArgs(["analyze", "test.csv", "--format", "json"]);
      expect(result.options?.["format"]).toBe("json");
    });

    test("parses -short flags", () => {
      const result = parseArgs(["analyze", "test.csv", "-v"]);
      expect(result.options?.["v"]).toBe(true);
    });

    test("case insensitive command parsing", () => {
      const result1 = parseArgs(["ANALYZE", "test.csv"]);
      const result2 = parseArgs(["Analyze", "test.csv"]);
      const result3 = parseArgs(["analyze", "test.csv"]);

      expect(result1.command).toBe("analyze");
      expect(result2.command).toBe("analyze");
      expect(result3.command).toBe("analyze");
    });
  });
});
