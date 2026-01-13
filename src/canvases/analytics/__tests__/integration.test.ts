// Integration Tests for Kowalski Analytics - Phase 10
// "All systems operational, Skipper. Running full diagnostic." - Kowalski

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

// Import all modules to test integration
import { parseCSV, parseJSON, parseData } from "../data-loader";
import { analyzeDataSet } from "../index";
import { generateEDAReport, type EDAReport } from "../insights";
import { inferSchema, analyzeUnderstanding } from "../understanding";
import { generateHypotheses, validateHypothesis } from "../hypotheses";
import { findRelationships } from "../relationships";
import { exportToCSV, exportToJSON } from "../export";
import { MemoryManager } from "../memory";
import { prepareForAnalysis, PerformanceTimer } from "../performance";
import { parseFromMCPResult } from "../api-loader";
import type { DataSet, AnalysisResult } from "../types";

// Test directory
const TEST_DIR = join(process.cwd(), "test-integration-tmp");

// Sample CSV data
const SAMPLE_CSV = `id,name,age,salary,department,hire_date,active
1,Alice,32,75000,Engineering,2020-01-15,true
2,Bob,45,95000,Management,2018-06-20,true
3,Charlie,28,65000,Engineering,2021-03-10,true
4,Diana,38,85000,Sales,2019-08-05,true
5,Eve,52,120000,Management,2015-02-28,false
6,Frank,29,70000,Engineering,2022-01-03,true
7,Grace,41,88000,Sales,2017-11-12,true
8,Henry,35,78000,Engineering,2019-05-20,true
9,Ivy,33,72000,Marketing,2020-09-15,true
10,Jack,47,105000,Management,2016-04-01,true`;

// Sample JSON data
const SAMPLE_JSON = JSON.stringify({
  users: [
    { id: 1, name: "Alice", score: 85.5, level: "senior" },
    { id: 2, name: "Bob", score: 72.3, level: "junior" },
    { id: 3, name: "Charlie", score: 91.0, level: "senior" },
    { id: 4, name: "Diana", score: 68.7, level: "junior" },
    { id: 5, name: "Eve", score: 88.2, level: "mid" },
  ],
});

describe("Full Analysis Pipeline Integration", () => {
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

  describe("CSV to Analysis Flow", () => {
    it("should parse CSV and run complete analysis", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });

      // Verify parsing
      expect(data.columns).toContain("name");
      expect(data.columns).toContain("salary");
      expect(data.rows.length).toBe(10);

      // Run analysis
      const analysis = analyzeDataSet(data);

      // Verify analysis results
      expect(analysis.summary.totalRows).toBe(10);
      expect(analysis.summary.totalColumns).toBe(7);
      expect(analysis.statistics).toBeDefined();
      expect(analysis.correlations).toBeDefined();
    });

    it("should generate EDA report from analysis", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      const analysis = analyzeDataSet(data);
      const report = generateEDAReport(data, analysis);

      // Verify report structure
      expect(report.overview).toBeDefined();
      expect(report.variables).toBeDefined();
      expect(report.findings).toBeDefined();
      expect(report.interpretation).toBeDefined();
      expect(report.bottomLine).toBeDefined();

      // Should detect real data (not synthetic)
      expect(report.isSynthetic).toBe(false);
    });

    it("should infer schema with confidence scores", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      const schema = inferSchema(data);

      // Should have inference for each column
      expect(schema.columns.length).toBe(7);

      // Should detect specific types
      const salaryCol = schema.columns.find((s) => s.column === "salary");
      expect(salaryCol?.semanticType).toBeDefined();
      expect(salaryCol?.semanticTypeConfidence.value).toBeGreaterThan(0);

      const dateCol = schema.columns.find((s) => s.column === "hire_date");
      expect(dateCol).toBeDefined();
    });

    it("should generate hypotheses from analysis", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      // Should generate at least some hypotheses
      expect(hypotheses.length).toBeGreaterThan(0);

      // Each hypothesis should have required fields
      for (const h of hypotheses) {
        expect(h.id).toBeDefined();
        expect(h.type).toBeDefined();
        expect(h.description).toBeDefined();
        expect(h.confidence).toBeGreaterThanOrEqual(0);
        expect(h.confidence).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("JSON Processing Flow", () => {
    it("should parse JSON and analyze", () => {
      const data = parseJSON(SAMPLE_JSON, { name: "users.json", arrayPath: "users" });

      expect(data.columns).toContain("score");
      expect(data.rows.length).toBe(5);

      const analysis = analyzeDataSet(data);
      expect(analysis.summary.totalRows).toBe(5);
    });

    it("should auto-detect format in parseData", () => {
      const csvData = parseData(SAMPLE_CSV, "data.csv");
      expect(csvData.rows.length).toBe(10);

      const jsonData = parseData(SAMPLE_JSON, "data.json");
      expect(jsonData.rows.length).toBeGreaterThan(0);
    });
  });

  describe("Export Flow", () => {
    it("should export filtered data to CSV", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      const outputPath = join(TEST_DIR, "exported.csv");

      const result = exportToCSV(data, outputPath);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(10);
      expect(existsSync(outputPath)).toBe(true);
    });

    it("should export with analysis to JSON", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      const analysis = analyzeDataSet(data);
      const report = generateEDAReport(data, analysis);
      const outputPath = join(TEST_DIR, "exported.json");

      const result = exportToJSON(data, analysis, report, outputPath);

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe("Performance Optimization Flow", () => {
    it("should prepare small datasets without sampling", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "small.csv" });

      const { processedData, strategy, warning } = prepareForAnalysis(data);

      expect(processedData.rows.length).toBe(10);
      expect(strategy.tier).toBe("small");
      expect(warning).toBeNull();
    });

    it("should track performance timing", () => {
      const timer = new PerformanceTimer();
      const data = parseCSV(SAMPLE_CSV, { name: "test.csv" });

      timer.mark("parse");

      const analysis = analyzeDataSet(data);
      timer.mark("analysis");

      const report = generateEDAReport(data, analysis);
      timer.mark("report");

      const marks = timer.getMarks();
      expect(marks.parse).toBeDefined();
      expect(marks.analysis).toBeDefined();
      expect(marks.report).toBeDefined();
      // Elapsed time should be 0 or greater (may be 0 if very fast)
      expect(timer.elapsed()).toBeGreaterThanOrEqual(0);
    });
  });

  describe("MCP/API Integration Flow", () => {
    it("should parse MCP tool results into datasets", () => {
      const mcpResult = [
        { product: "Widget A", sales: 1500, region: "North" },
        { product: "Widget B", sales: 2300, region: "South" },
        { product: "Widget C", sales: 1800, region: "East" },
      ];

      const data = parseFromMCPResult(mcpResult, "mcp-sales");

      expect(data.name).toBe("mcp-sales");
      expect(data.columns).toContain("product");
      expect(data.columns).toContain("sales");
      expect(data.rows.length).toBe(3);

      // Should be analyzable
      const analysis = analyzeDataSet(data);
      expect(analysis.summary.totalRows).toBe(3);
    });

    it("should handle nested MCP results", () => {
      const mcpResult = {
        data: [
          { id: 1, value: 100 },
          { id: 2, value: 200 },
        ],
        meta: { total: 2 },
      };

      const data = parseFromMCPResult(mcpResult, "nested-data");

      expect(data.columns).toContain("id");
      expect(data.rows.length).toBe(2);
    });
  });

  describe("Memory System Integration", () => {
    it("should persist and recall dataset analysis", () => {
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      const analysis = analyzeDataSet(data);
      const report = generateEDAReport(data, analysis);

      // MemoryManager takes a project root directory, not a file path
      // It will append "CLAUDE.md" to the path

      // Save to memory
      const memory = new MemoryManager(TEST_DIR);
      memory.load(); // Load first to initialize
      memory.rememberDataset(data);
      if (report.findings.length > 0) {
        memory.recordFinding("employees.csv", { title: report.findings[0].title, confidence: 80 });
      }
      memory.save();

      // Load from memory in a new manager
      const memory2 = new MemoryManager(TEST_DIR);
      memory2.load();

      // recallDataset takes a string name, not DataSet
      const recalled = memory2.recallDataset("employees.csv");
      expect(recalled).not.toBeNull();
      expect(recalled?.fingerprint.name).toBe("employees.csv");
    });
  });

  describe("Relationship Discovery Integration", () => {
    it("should detect relationships between related datasets", () => {
      const customers: DataSet = {
        name: "customers.csv",
        columns: ["customer_id", "name", "city"],
        rows: [
          [1, "Alice", "NYC"],
          [2, "Bob", "LA"],
          [3, "Charlie", "Chicago"],
        ],
        types: ["number", "string", "string"],
      };

      const orders: DataSet = {
        name: "orders.csv",
        columns: ["order_id", "customer_id", "amount"],
        rows: [
          [101, 1, 500],
          [102, 2, 300],
          [103, 1, 750],
          [104, 3, 200],
        ],
        types: ["number", "number", "number"],
      };

      const result = findRelationships([customers, orders]);

      // Should find customer_id relationship
      expect(result.relationships.length).toBeGreaterThan(0);

      const custRelation = result.relationships.find(
        (r) =>
          (r.sourceColumn === "customer_id" && r.targetColumn === "customer_id")
      );
      expect(custRelation).toBeDefined();
    });
  });

  describe("End-to-End Workflow", () => {
    it("should complete full analysis workflow", () => {
      const timer = new PerformanceTimer();

      // Step 1: Parse data
      const data = parseCSV(SAMPLE_CSV, { name: "employees.csv" });
      timer.mark("1_parse");

      // Step 2: Prepare for analysis
      const { processedData, strategy } = prepareForAnalysis(data);
      timer.mark("2_prepare");

      // Step 3: Run analysis
      const analysis = analyzeDataSet(processedData);
      timer.mark("3_analyze");

      // Step 4: Infer schema
      const schema = inferSchema(processedData);
      timer.mark("4_schema");

      // Step 5: Generate hypotheses
      const hypotheses = generateHypotheses(processedData, analysis);
      timer.mark("5_hypotheses");

      // Step 6: Generate report
      const report = generateEDAReport(processedData, analysis);
      timer.mark("6_report");

      // Step 7: Export
      const exportPath = join(TEST_DIR, "final.json");
      const exportResult = exportToJSON(processedData, analysis, report, exportPath);
      timer.mark("7_export");

      // Verify all steps completed successfully
      expect(data.rows.length).toBe(10);
      expect(analysis.summary.totalRows).toBe(10);
      expect(schema.columns.length).toBe(7);
      expect(hypotheses.length).toBeGreaterThan(0);
      expect(report.findings.length).toBeGreaterThan(0);
      expect(exportResult.success).toBe(true);

      // Verify performance
      const totalTime = timer.elapsed();
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5s
    });
  });
});

describe("Error Handling Integration", () => {
  it("should handle malformed CSV gracefully", () => {
    const malformedCSV = "a,b,c\n1,2\n3,4,5,6"; // Inconsistent columns

    const data = parseCSV(malformedCSV, { name: "malformed.csv" });

    // Should still parse
    expect(data.columns.length).toBe(3);
    expect(data.rows.length).toBeGreaterThan(0);
  });

  it("should handle empty datasets", () => {
    const emptyCSV = "a,b,c";

    const data = parseCSV(emptyCSV, { name: "empty.csv" });
    const analysis = analyzeDataSet(data);

    expect(data.rows.length).toBe(0);
    expect(analysis.summary.totalRows).toBe(0);
  });

  it("should handle datasets with all nulls", () => {
    const nullCSV = "a,b,c\nnull,null,null\n,NA,";

    const data = parseCSV(nullCSV, { name: "nulls.csv" });
    const analysis = analyzeDataSet(data);

    expect(data.rows.length).toBe(2);
    expect(analysis).toBeDefined();
  });
});
