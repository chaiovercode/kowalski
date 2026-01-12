// Browser Visualization tests for Phase 7
// "The visual reconnaissance is ready, Skipper."

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { generateBrowserViz } from "../browser-viz";
import type { DataSet, AnalysisResult } from "../types";

// Test data
const createTestData = (): DataSet => ({
  name: "test-sales.csv",
  columns: ["id", "product", "sales", "region", "year"],
  rows: [
    [1, "Widget A", 1000, "North", 2023],
    [2, "Widget B", 1500, "South", 2023],
    [3, "Widget A", 1200, "East", 2023],
    [4, "Widget C", 800, "West", 2023],
    [5, "Widget B", 2000, "North", 2024],
    [6, "Widget A", 1800, "South", 2024],
    [7, "Widget C", 900, "East", 2024],
    [8, "Widget B", 2500, "West", 2024],
  ],
  types: ["number", "string", "number", "string", "number"],
});

const createTestAnalysis = (): AnalysisResult => ({
  summary: {
    totalRows: 8,
    totalColumns: 5,
    numericColumns: 3,
    categoricalColumns: 2,
    missingPercent: 0,
  },
  statistics: {
    id: { type: "numeric", mean: 4.5, std: 2.29, min: 1, max: 8 },
    sales: { type: "numeric", mean: 1462.5, std: 552.3, min: 800, max: 2500 },
    year: { type: "numeric", mean: 2023.5, std: 0.5, min: 2023, max: 2024 },
    product: { type: "categorical", uniqueCount: 3, topValues: [{ value: "Widget B", count: 3 }] },
    region: { type: "categorical", uniqueCount: 4, topValues: [{ value: "North", count: 2 }] },
  },
  correlations: [{ column1: "year", column2: "sales", value: 0.72, strength: "strong" }],
  trends: [],
  outliers: [],
});

describe("Browser Visualization", () => {
  describe("generateBrowserViz", () => {
    it("should generate valid HTML", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("</html>");
      expect(html).toContain("<html");
    });

    it("should include Plotly library", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("plotly");
    });

    it("should include Kowalski branding", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("Kowalski");
      expect(html).toContain("🐧");
    });

    it("should include dataset name in title", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("test-sales.csv");
    });

    it("should include summary statistics", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      // Should contain row count
      expect(html).toContain("8");
      // Should contain column count
      expect(html).toContain("5");
    });

    it("should include chart containers", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("chart1");
      expect(html).toContain("chart2");
      expect(html).toContain("chart3");
      expect(html).toContain("chart4");
    });

    it("should embed data as JSON", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      // Should contain the data embedded
      expect(html).toContain("const data =");
      expect(html).toContain("Widget A");
      expect(html).toContain("Widget B");
    });
  });

  describe("Theme Support", () => {
    it("should support cyberpunk theme", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis, { type: "dashboard", theme: "cyberpunk" });

      // Cyberpunk theme has specific colors
      expect(html).toContain("#0f0f1a"); // background
      expect(html).toContain("#00d4aa"); // primary
    });

    it("should support dark theme", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis, { type: "dashboard", theme: "dark" });

      expect(html).toContain("#111827"); // dark background
      expect(html).toContain("#3b82f6"); // blue primary
    });

    it("should support light theme", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis, { type: "dashboard", theme: "light" });

      expect(html).toContain("#f8fafc"); // light background
      expect(html).toContain("#0ea5e9"); // cyan primary
    });

    it("should default to cyberpunk theme", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("#0f0f1a");
    });
  });

  describe("Chart Generation", () => {
    it("should generate bar chart code", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("type: 'bar'");
    });

    it("should generate pie chart code", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("type: 'pie'");
    });

    it("should generate line chart code", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("type: 'scatter'");
      expect(html).toContain("mode: 'lines+markers'");
    });

    it("should generate heatmap code", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("type: 'heatmap'");
    });
  });

  describe("Data Aggregation", () => {
    it("should aggregate by category columns", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      // Should contain aggregation code
      expect(html).toContain("aggregations");
      expect(html).toContain("byCategory");
    });

    it("should handle data with rate columns", () => {
      const data: DataSet = {
        name: "rates.csv",
        columns: ["name", "adoption_rate", "industry"],
        rows: [
          ["Tool A", 0.75, "Tech"],
          ["Tool B", 0.60, "Finance"],
          ["Tool C", 0.85, "Tech"],
        ],
        types: ["string", "number", "string"],
      };
      const analysis: AnalysisResult = {
        summary: { totalRows: 3, totalColumns: 3, numericColumns: 1, categoricalColumns: 2, missingPercent: 0 },
        statistics: {
          name: { type: "categorical", uniqueCount: 3, topValues: [] },
          adoption_rate: { type: "numeric", mean: 0.73, std: 0.1, min: 0.6, max: 0.85 },
          industry: { type: "categorical", uniqueCount: 2, topValues: [] },
        },
        correlations: [],
        trends: [],
        outliers: [],
      };

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("adoption_rate");
    });

    it("should handle data with time columns", () => {
      const data: DataSet = {
        name: "timeseries.csv",
        columns: ["month", "revenue"],
        rows: [
          ["2024-01", 1000],
          ["2024-02", 1200],
          ["2024-03", 1100],
        ],
        types: ["date", "number"],
      };
      const analysis: AnalysisResult = {
        summary: { totalRows: 3, totalColumns: 2, numericColumns: 1, categoricalColumns: 0, missingPercent: 0 },
        statistics: {
          month: { type: "categorical", uniqueCount: 3, topValues: [] },
          revenue: { type: "numeric", mean: 1100, std: 100, min: 1000, max: 1200 },
        },
        correlations: [],
        trends: [],
        outliers: [],
      };

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<!DOCTYPE html>");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty dataset", () => {
      const data: DataSet = {
        name: "empty.csv",
        columns: ["a", "b"],
        rows: [],
        types: ["string", "number"],
      };
      const analysis: AnalysisResult = {
        summary: { totalRows: 0, totalColumns: 2, numericColumns: 1, categoricalColumns: 1, missingPercent: 0 },
        statistics: {},
        correlations: [],
        trends: [],
        outliers: [],
      };

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("0"); // Zero records
    });

    it("should handle dataset with only numeric columns", () => {
      const data: DataSet = {
        name: "numbers.csv",
        columns: ["x", "y", "z"],
        rows: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        types: ["number", "number", "number"],
      };
      const analysis: AnalysisResult = {
        summary: { totalRows: 2, totalColumns: 3, numericColumns: 3, categoricalColumns: 0, missingPercent: 0 },
        statistics: {
          x: { type: "numeric", mean: 2.5, std: 1.5, min: 1, max: 4 },
          y: { type: "numeric", mean: 3.5, std: 1.5, min: 2, max: 5 },
          z: { type: "numeric", mean: 4.5, std: 1.5, min: 3, max: 6 },
        },
        correlations: [],
        trends: [],
        outliers: [],
      };

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<!DOCTYPE html>");
    });

    it("should handle dataset with special characters in names", () => {
      const data: DataSet = {
        name: "special & chars <test>.csv",
        columns: ["col<>name", "value"],
        rows: [["test & value", 100]],
        types: ["string", "number"],
      };
      const analysis: AnalysisResult = {
        summary: { totalRows: 1, totalColumns: 2, numericColumns: 1, categoricalColumns: 1, missingPercent: 0 },
        statistics: {},
        correlations: [],
        trends: [],
        outliers: [],
      };

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<!DOCTYPE html>");
    });

    it("should limit sample rows for large datasets", () => {
      const rows = Array.from({ length: 200 }, (_, i) => [i, `Item ${i}`, i * 10]);
      const data: DataSet = {
        name: "large.csv",
        columns: ["id", "name", "value"],
        rows,
        types: ["number", "string", "number"],
      };
      const analysis: AnalysisResult = {
        summary: { totalRows: 200, totalColumns: 3, numericColumns: 2, categoricalColumns: 1, missingPercent: 0 },
        statistics: {},
        correlations: [],
        trends: [],
        outliers: [],
      };

      const html = generateBrowserViz(data, analysis);

      // Should still generate valid HTML
      expect(html).toContain("<!DOCTYPE html>");
      // Should show correct total count in header
      expect(html).toContain("200");
    });
  });

  describe("Interactive Features", () => {
    it("should include hover templates", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("hovertemplate");
    });

    it("should make charts responsive", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("responsive: true");
    });
  });

  describe("Export Features", () => {
    it("should include PNG export button", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("Export PNG");
      expect(html).toContain("downloadAllCharts('png')");
    });

    it("should include SVG export button", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("Export SVG");
      expect(html).toContain("downloadAllCharts('svg')");
    });

    it("should include downloadChart function", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("function downloadChart");
      expect(html).toContain("Plotly.downloadImage");
    });

    it("should include downloadAllCharts function", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("function downloadAllCharts");
    });
  });

  describe("Styling", () => {
    it("should include CSS styles", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    it("should include Google Fonts", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("fonts.googleapis.com");
      expect(html).toContain("Inter");
      expect(html).toContain("JetBrains Mono");
    });

    it("should have card-based layout", () => {
      const data = createTestData();
      const analysis = createTestAnalysis();

      const html = generateBrowserViz(data, analysis);

      expect(html).toContain("card");
      expect(html).toContain("grid");
    });
  });
});
