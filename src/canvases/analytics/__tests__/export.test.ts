// Export tests for Phase 6
// "The extraction is complete, Skipper."

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, existsSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import {
  exportToCSV,
  exportToJSON,
  getDefaultExportPath,
  exportFilteredData,
} from "../export";
import type { DataSet, AnalysisResult } from "../types";
import type { EDAReport } from "../insights";

// Test directory
const TEST_DIR = join(process.cwd(), "test-export-tmp");

// Sample data
const createTestData = (): DataSet => ({
  name: "test-data.csv",
  columns: ["id", "name", "value", "category"],
  rows: [
    [1, "Alpha", 100.5, "A"],
    [2, "Beta", 200.3, "B"],
    [3, "Gamma", 150.0, "A"],
    [4, "Delta", 300.7, "C"],
    [5, "Epsilon", 175.2, "B"],
  ],
  types: ["number", "string", "number", "string"],
});

const createTestAnalysis = (): AnalysisResult => ({
  summary: {
    totalRows: 5,
    totalColumns: 4,
    numericColumns: 2,
    categoricalColumns: 2,
    missingPercent: 0,
  },
  statistics: {
    id: { type: "numeric", mean: 3, std: 1.58, min: 1, max: 5 },
    value: { type: "numeric", mean: 185.34, std: 73.5, min: 100.5, max: 300.7 },
    name: { type: "categorical", uniqueCount: 5, topValues: [] },
    category: { type: "categorical", uniqueCount: 3, topValues: [{ value: "A", count: 2 }] },
  },
  correlations: [{ column1: "id", column2: "value", value: 0.85, strength: "strong" }],
  trends: [],
  outliers: [],
});

const createTestReport = (): EDAReport => ({
  overview: {
    rows: 5,
    columns: 4,
    numericCols: 2,
    categoricalCols: 2,
    suspiciouslyClean: false,
  },
  variables: [
    { name: "id", type: "numeric", uniqueCount: 5, description: "Primary key" },
    { name: "value", type: "numeric", uniqueCount: 5, description: "Metric values" },
  ],
  findings: [
    { category: "finding", title: "Strong Correlation", description: "id and value correlate", severity: "success" },
  ],
  interpretation: "This is test data with normal distribution.",
  bottomLine: "Data quality looks good.",
  isSynthetic: false,
  syntheticReasons: [],
});

describe("Export Module", () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("exportToCSV", () => {
    it("should export data to CSV format", () => {
      const data = createTestData();
      const outputPath = join(TEST_DIR, "output.csv");

      const result = exportToCSV(data, outputPath);

      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
      expect(result.rowCount).toBe(5);
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, "utf-8");
      const lines = content.split("\n");
      expect(lines[0]).toBe("id,name,value,category");
      expect(lines[1]).toBe("1,Alpha,100.5,A");
    });

    it("should escape special characters in CSV", () => {
      const data: DataSet = {
        name: "special.csv",
        columns: ["text"],
        rows: [['Hello, "World"'], ["Line1\nLine2"]],
        types: ["string"],
      };
      const outputPath = join(TEST_DIR, "special.csv");

      const result = exportToCSV(data, outputPath);
      expect(result.success).toBe(true);

      const content = readFileSync(outputPath, "utf-8");
      expect(content).toContain('"Hello, ""World"""');
    });

    it("should handle empty data", () => {
      const data: DataSet = {
        name: "empty.csv",
        columns: ["a", "b"],
        rows: [],
        types: ["string", "string"],
      };
      const outputPath = join(TEST_DIR, "empty.csv");

      const result = exportToCSV(data, outputPath);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);

      const content = readFileSync(outputPath, "utf-8");
      expect(content).toBe("a,b");
    });

    it("should return error for invalid path", () => {
      const data = createTestData();
      const invalidPath = "/nonexistent/directory/output.csv";

      const result = exportToCSV(data, invalidPath);

      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });
  });

  describe("exportToJSON", () => {
    it("should export data with analysis to JSON", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();
      const report = createTestReport();
      const outputPath = join(TEST_DIR, "output.json");

      const result = exportToJSON(data, analysis, report, outputPath);

      expect(result.success).toBe(true);
      expect(result.format).toBe("json");
      expect(existsSync(outputPath)).toBe(true);

      const content = JSON.parse(readFileSync(outputPath, "utf-8"));
      expect(content.metadata.name).toBe("test-data.csv");
      expect(content.metadata.rowCount).toBe(5);
      expect(content.schema.columns).toEqual(["id", "name", "value", "category"]);
      expect(content.data.length).toBe(5);
      expect(content.report.findings.length).toBe(1);
    });

    it("should truncate large datasets in JSON export", () => {
      const data: DataSet = {
        name: "large.csv",
        columns: ["id", "value"],
        rows: Array.from({ length: 1500 }, (_, i) => [i, i * 10]),
        types: ["number", "number"],
      };
      const analysis = createTestAnalysis();
      const report = createTestReport();
      const outputPath = join(TEST_DIR, "large.json");

      const result = exportToJSON(data, analysis, report, outputPath);

      expect(result.success).toBe(true);

      const content = JSON.parse(readFileSync(outputPath, "utf-8"));
      expect(content.data.length).toBe(1000);
      expect(content.truncated).toBe(true);
      expect(content.metadata.rowCount).toBe(1500);
    });

    it("should include analysis summary in JSON", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();
      const report = createTestReport();
      const outputPath = join(TEST_DIR, "with-analysis.json");

      exportToJSON(data, analysis, report, outputPath);

      const content = JSON.parse(readFileSync(outputPath, "utf-8"));
      expect(content.analysis.summary.totalRows).toBe(5);
      expect(content.analysis.correlations.length).toBe(1);
    });
  });

  describe("getDefaultExportPath", () => {
    it("should generate path with timestamp", () => {
      const path = getDefaultExportPath("sales.csv", "csv");

      expect(path).toContain("sales_export_");
      expect(path).toEndWith(".csv");
    });

    it("should strip existing extension", () => {
      const path = getDefaultExportPath("data.xlsx", "json");

      expect(path).not.toContain(".xlsx");
      expect(path).toContain("data_export_");
      expect(path).toEndWith(".json");
    });
  });

  describe("exportFilteredData", () => {
    it("should export as CSV when format is csv", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();
      const report = createTestReport();
      const outputPath = join(TEST_DIR, "filtered.csv");

      const result = exportFilteredData(data, analysis, report, "csv", outputPath);

      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
    });

    it("should export as JSON when format is json", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();
      const report = createTestReport();
      const outputPath = join(TEST_DIR, "filtered.json");

      const result = exportFilteredData(data, analysis, report, "json", outputPath);

      expect(result.success).toBe(true);
      expect(result.format).toBe("json");
    });

    it("should use default path when not provided", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();
      const report = createTestReport();

      const result = exportFilteredData(data, analysis, report, "csv");

      expect(result.path).toContain("test-data_export_");
      expect(result.path).toEndWith(".csv");

      // Clean up the generated file
      if (existsSync(result.path)) {
        unlinkSync(result.path);
      }
    });
  });
});
