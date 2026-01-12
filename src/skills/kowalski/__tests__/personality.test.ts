// Tests for Kowalski Personality Module
import { describe, test, expect } from "bun:test";
import {
  kowalskiSay,
  verbalizeConfidence,
  formatStatusBox,
  formatReconSweep,
  formatConfidence,
  getIcon,
  KOWALSKI_BANNER,
  KOWALSKI_MINI,
} from "../personality";

describe("personality", () => {
  describe("kowalskiSay", () => {
    test("greeting returns non-empty string", () => {
      const result = kowalskiSay("greeting", "");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    test("finding with high confidence uses strong template", () => {
      const result = kowalskiSay("finding", "correlation", 90);
      expect(result.toLowerCase()).toContain("correlation");
    });

    test("finding with low confidence uses weak template", () => {
      const result = kowalskiSay("finding", "pattern", 30);
      expect(result.toLowerCase()).toContain("pattern");
    });

    test("question includes the question content", () => {
      const result = kowalskiSay("question", "What is this column?");
      expect(result).toContain("What is this column?");
    });

    test("warning includes the issue", () => {
      const result = kowalskiSay("warning", "Missing values detected");
      expect(result).toContain("Missing values detected");
    });

    test("success includes the details", () => {
      const result = kowalskiSay("success", "Analysis complete");
      expect(result).toContain("Analysis complete");
    });

    test("error includes the error message", () => {
      const result = kowalskiSay("error", "File not found");
      expect(result).toContain("File not found");
    });

    test("status returns formatted status", () => {
      const result = kowalskiSay("status", "Processing data");
      expect(result).toContain("Processing data");
      expect(result).toContain("[STATUS]");
    });

    test("hypothesis includes confidence level", () => {
      const result = kowalskiSay("hypothesis", "X causes Y", 75);
      expect(result).toContain("X causes Y");
    });
  });

  describe("verbalizeConfidence", () => {
    test("95%+ returns absolute certainty", () => {
      expect(verbalizeConfidence(95)).toBe("with absolute certainty");
      expect(verbalizeConfidence(100)).toBe("with absolute certainty");
    });

    test("90-94% returns high confidence", () => {
      expect(verbalizeConfidence(90)).toBe("with high confidence");
      expect(verbalizeConfidence(94)).toBe("with high confidence");
    });

    test("80-89% returns reasonable certainty", () => {
      expect(verbalizeConfidence(80)).toBe("with reasonable certainty");
      expect(verbalizeConfidence(89)).toBe("with reasonable certainty");
    });

    test("70-79% returns fairly confident", () => {
      expect(verbalizeConfidence(70)).toBe("fairly confident");
      expect(verbalizeConfidence(79)).toBe("fairly confident");
    });

    test("60-69% returns moderately confident", () => {
      expect(verbalizeConfidence(60)).toBe("moderately confident");
    });

    test("50-59% returns some uncertainty", () => {
      expect(verbalizeConfidence(50)).toBe("with some uncertainty");
    });

    test("40-49% returns significant uncertainty", () => {
      expect(verbalizeConfidence(40)).toBe("with significant uncertainty");
    });

    test("<40% returns low confidence", () => {
      expect(verbalizeConfidence(39)).toBe("with low confidence - this is speculative");
      expect(verbalizeConfidence(0)).toBe("with low confidence - this is speculative");
    });
  });

  describe("formatStatusBox", () => {
    test("creates box with correct structure", () => {
      const result = formatStatusBox("TEST", ["Line 1", "Line 2"]);
      expect(result).toContain("TEST");
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
      expect(result).toContain("┌");
      expect(result).toContain("└");
      expect(result).toContain("│");
    });

    test("respects custom width", () => {
      const result = formatStatusBox("TEST", ["Short"], 30);
      const lines = result.split("\n");
      // Each line should be close to the specified width
      expect(lines[0].length).toBeGreaterThan(20);
    });
  });

  describe("formatReconSweep", () => {
    test("formats empty file list", () => {
      const result = formatReconSweep([], "empty");
      expect(result).toContain("Memory banks: Empty");
    });

    test("formats file list with rows", () => {
      const files = [
        { name: "test.csv", rows: 100, status: "new" as const },
        { name: "data.json", rows: 50, status: "known" as const },
      ];
      const result = formatReconSweep(files, "loaded", 5);
      expect(result).toContain("test.csv");
      expect(result).toContain("100 rows");
      expect(result).toContain("data.json");
      expect(result).toContain("NEW");
      expect(result).toContain("KNOWN");
      expect(result).toContain("5 previous missions");
    });
  });

  describe("formatConfidence", () => {
    test("creates visual bar for 100%", () => {
      const result = formatConfidence(100);
      expect(result).toContain("100%");
      expect(result).toContain("█");
      expect(result).not.toContain("░");
    });

    test("creates visual bar for 50%", () => {
      const result = formatConfidence(50);
      expect(result).toContain("50%");
      expect(result).toContain("█");
      expect(result).toContain("░");
    });

    test("creates visual bar for 0%", () => {
      const result = formatConfidence(0);
      expect(result).toContain("0%");
      expect(result).not.toContain("█");
      expect(result).toContain("░");
    });
  });

  describe("getIcon", () => {
    test("returns correct icons for each type", () => {
      expect(getIcon("greeting")).toBe("🐧");
      expect(getIcon("finding")).toBe("🔍");
      expect(getIcon("question")).toBe("❓");
      expect(getIcon("warning")).toBe("⚠️");
      expect(getIcon("success")).toBe("✅");
      expect(getIcon("error")).toBe("❌");
      expect(getIcon("status")).toBe("📊");
      expect(getIcon("hypothesis")).toBe("💡");
    });
  });

  describe("exports", () => {
    test("KOWALSKI_BANNER is defined", () => {
      expect(KOWALSKI_BANNER).toBeTruthy();
      expect(typeof KOWALSKI_BANNER).toBe("string");
    });

    test("KOWALSKI_MINI is penguin emoji", () => {
      expect(KOWALSKI_MINI).toBe("🐧");
    });
  });
});
