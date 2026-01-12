// Tests for Analysis Brain
// "Kowalski, validate the brain's analytical capabilities!"

import { describe, it, expect } from "bun:test";
import {
  AnalysisBrain,
  createAnalysisBrain,
  quickAnalysis,
  fastAnalysis,
} from "../brain";
import type { DataSet } from "../types";

// Helper to create test datasets
function createDataSet(
  columns: string[],
  rows: (string | number | null)[][],
  types?: ("string" | "number" | "date")[],
  name = "test.csv"
): DataSet {
  return { name, columns, rows, types };
}

// Create a realistic test dataset
function createSalesDataset(): DataSet {
  const rows: (string | number)[][] = [];
  const regions = ["North", "South", "East", "West"];
  const products = ["Widget A", "Widget B", "Gadget X"];

  for (let i = 0; i < 100; i++) {
    const region = regions[i % 4];
    const product = products[i % 3];
    const revenue = 1000 + Math.random() * 9000;
    const quantity = Math.floor(10 + Math.random() * 90);

    rows.push([region, product, revenue, quantity, i + 1]);
  }

  return createDataSet(
    ["region", "product", "revenue", "quantity", "order_id"],
    rows,
    ["string", "string", "number", "number", "number"],
    "sales.csv"
  );
}

// Create a dataset with trends and patterns
function createTimeSeriesDataset(): DataSet {
  const rows: number[][] = [];

  for (let i = 0; i < 50; i++) {
    // Upward trend with some noise
    const value = 100 + i * 2 + (Math.random() - 0.5) * 10;
    rows.push([value]);
  }

  return createDataSet(
    ["metric"],
    rows,
    ["number"],
    "timeseries.csv"
  );
}

// Create a dataset with change point
function createChangePointDataset(): DataSet {
  const rows: number[][] = [];

  // First 25 values around 50
  for (let i = 0; i < 25; i++) {
    rows.push([50 + (Math.random() - 0.5) * 5]);
  }

  // Next 25 values around 100 (clear level shift)
  for (let i = 0; i < 25; i++) {
    rows.push([100 + (Math.random() - 0.5) * 5]);
  }

  return createDataSet(
    ["value"],
    rows,
    ["number"],
    "changepoint.csv"
  );
}

describe("AnalysisBrain", () => {
  describe("constructor", () => {
    it("should create brain with default options", () => {
      const brain = new AnalysisBrain();
      expect(brain).toBeDefined();
    });

    it("should create brain with custom options", () => {
      const brain = new AnalysisBrain({
        skipHypotheses: true,
        maxHypotheses: 5,
      });
      expect(brain).toBeDefined();
    });
  });

  describe("analyze", () => {
    it("should return full analysis result", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const result = await brain.analyze(data);

      expect(result).toBeDefined();
      expect(result.schemaInference).toBeDefined();
      expect(result.hypotheses).toBeDefined();
      expect(result.edaReport).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it("should include schema inference with confidence", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const result = await brain.analyze(data);

      expect(result.schemaInference.columns).toHaveLength(5);
      for (const col of result.schemaInference.columns) {
        expect(col.basicTypeConfidence).toBeDefined();
        expect(col.semanticTypeConfidence).toBeDefined();
        expect(col.basicTypeConfidence.value).toBeGreaterThanOrEqual(0);
        expect(col.basicTypeConfidence.value).toBeLessThanOrEqual(100);
      }
    });

    it("should generate hypotheses", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const result = await brain.analyze(data);

      expect(Array.isArray(result.hypotheses)).toBe(true);
      // With 2 numeric columns, should generate some hypotheses
      if (result.hypotheses.length > 0) {
        const h = result.hypotheses[0];
        expect(h.id).toBeDefined();
        expect(h.title).toBeDefined();
        expect(h.confidence).toBeDefined();
      }
    });

    it("should include EDA report", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const result = await brain.analyze(data);

      expect(result.edaReport.overview).toBeDefined();
      expect(result.edaReport.overview.rows).toBe(100);
      expect(result.edaReport.overview.columns).toBe(5);
      expect(result.edaReport.bottomLine).toBeDefined();
    });

    it("should respect maxHypotheses option", async () => {
      const brain = createAnalysisBrain({ maxHypotheses: 2 });
      const data = createSalesDataset();

      const result = await brain.analyze(data);

      expect(result.hypotheses.length).toBeLessThanOrEqual(2);
    });

    it("should skip hypotheses when requested", async () => {
      const brain = createAnalysisBrain({ skipHypotheses: true });
      const data = createSalesDataset();

      const result = await brain.analyze(data);

      expect(result.hypotheses).toHaveLength(0);
    });
  });

  describe("time series analysis", () => {
    it("should detect change points", async () => {
      const brain = createAnalysisBrain();
      const data = createChangePointDataset();

      const result = await brain.analyze(data);

      expect(result.timeSeriesAnalysis).toBeDefined();
      const changePoints = result.timeSeriesAnalysis!.changePoints.get("value");
      expect(changePoints).toBeDefined();
      if (changePoints && changePoints.length > 0) {
        expect(changePoints[0].direction).toBe("increase");
      }
    });

    it("should skip time series analysis when requested", async () => {
      const brain = createAnalysisBrain({ skipTimeSeries: true });
      const data = createTimeSeriesDataset();

      const result = await brain.analyze(data);

      expect(result.timeSeriesAnalysis).toBeUndefined();
    });
  });

  describe("inferSchema", () => {
    it("should infer schema with confidence", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const schema = await brain.inferSchema(data);

      expect(schema.columns).toHaveLength(5);
      expect(schema.overallConfidence).toBeDefined();
      expect(schema.suggestedQuestions).toBeDefined();
    });

    it("should detect categorical columns", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const schema = await brain.inferSchema(data);

      const regionCol = schema.columns.find((c) => c.column === "region");
      expect(regionCol).toBeDefined();
      expect(regionCol!.semanticType).toBe("categorical");
    });
  });

  describe("getClarifyingQuestions", () => {
    it("should filter questions by confidence threshold", async () => {
      const brain = createAnalysisBrain({ questionThreshold: 50 });
      const data = createSalesDataset();

      const schema = await brain.inferSchema(data);
      const questions = brain.getClarifyingQuestions(schema);

      // All returned questions should have confidence below threshold
      for (const q of questions) {
        expect(q.confidence).toBeLessThan(50);
      }
    });
  });

  describe("testHypothesis", () => {
    it("should test a hypothesis", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const analysis = await brain.analyze(data);

      if (analysis.hypotheses.length > 0) {
        const hypothesis = analysis.hypotheses[0];
        const result = brain.testHypothesis(data, hypothesis);

        expect(result).toBeDefined();
        expect(result.hypothesisId).toBe(hypothesis.id);
        expect(typeof result.supported).toBe("boolean");
        expect(result.interpretation).toBeDefined();
      }
    });
  });

  describe("getSummary", () => {
    it("should generate Kowalski-style summary", async () => {
      const brain = createAnalysisBrain();
      const data = createSalesDataset();

      const result = await brain.analyze(data);
      const summary = brain.getSummary(result);

      expect(summary).toContain("KOWALSKI");
      expect(summary).toContain("Skipper");
      expect(summary).toContain("100 records");
      expect(summary).toContain("BOTTOM LINE");
    });
  });
});

describe("Convenience functions", () => {
  describe("createAnalysisBrain", () => {
    it("should create brain instance", () => {
      const brain = createAnalysisBrain();
      expect(brain).toBeInstanceOf(AnalysisBrain);
    });

    it("should pass options through", () => {
      const brain = createAnalysisBrain({ maxHypotheses: 3 });
      expect(brain).toBeInstanceOf(AnalysisBrain);
    });
  });

  describe("quickAnalysis", () => {
    it("should run full analysis", async () => {
      const data = createSalesDataset();
      const result = await quickAnalysis(data);

      expect(result.schemaInference).toBeDefined();
      expect(result.hypotheses).toBeDefined();
      expect(result.edaReport).toBeDefined();
    });
  });

  describe("fastAnalysis", () => {
    it("should skip expensive operations", async () => {
      const data = createSalesDataset();
      const result = await fastAnalysis(data);

      expect(result.hypotheses).toHaveLength(0);
      expect(result.timeSeriesAnalysis).toBeUndefined();
      // But should still have basic analysis
      expect(result.schemaInference).toBeDefined();
      expect(result.edaReport).toBeDefined();
    });
  });
});

describe("Edge cases", () => {
  it("should handle empty dataset", async () => {
    const brain = createAnalysisBrain();
    const data = createDataSet(["a", "b"], [], ["number", "string"]);

    const result = await brain.analyze(data);

    expect(result).toBeDefined();
    expect(result.edaReport.overview.rows).toBe(0);
  });

  it("should handle single row", async () => {
    const brain = createAnalysisBrain();
    const data = createDataSet(
      ["value"],
      [[42]],
      ["number"]
    );

    const result = await brain.analyze(data);

    expect(result).toBeDefined();
    expect(result.edaReport.overview.rows).toBe(1);
  });

  it("should handle all null column", async () => {
    const brain = createAnalysisBrain();
    const data = createDataSet(
      ["empty"],
      [[null], [null], [null]],
      ["string"]
    );

    const result = await brain.analyze(data);

    expect(result).toBeDefined();
  });
});
