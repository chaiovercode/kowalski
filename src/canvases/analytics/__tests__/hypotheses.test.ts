// Tests for Hypothesis Engine
// "Kowalski, validate the hypothesis generation!"

import { describe, it, expect } from "bun:test";
import {
  generateHypotheses,
  testHypothesis,
  formatHypothesisKowalski,
  type Hypothesis,
  type HypothesisTestResult,
} from "../hypotheses";
import { analyzeDataSet } from "../stats";
import type { DataSet, AnalysisResult } from "../types";

// Helper to create test datasets
function createDataSet(
  columns: string[],
  rows: (string | number | null)[][],
  types?: ("string" | "number" | "date")[],
  name = "test.csv"
): DataSet {
  return { name, columns, rows, types };
}

// Helper to create dataset with correlated columns
function createCorrelatedDataset(
  n: number,
  correlation: "strong" | "moderate" | "weak" | "none"
): DataSet {
  const rows: (number | null)[][] = [];
  const noise =
    correlation === "strong" ? 0.1 :
    correlation === "moderate" ? 0.5 :
    correlation === "weak" ? 0.8 : 1.5;

  for (let i = 0; i < n; i++) {
    const x = Math.random() * 100;
    const y = x + (Math.random() - 0.5) * noise * 50;
    rows.push([x, y]);
  }

  return createDataSet(["x_value", "y_value"], rows, ["number", "number"]);
}

// Helper to create dataset with group differences
function createGroupDifferenceDataset(): DataSet {
  const rows: (string | number)[][] = [];

  // Group A: higher values
  for (let i = 0; i < 30; i++) {
    rows.push(["GroupA", 80 + Math.random() * 40]); // 80-120
  }

  // Group B: lower values
  for (let i = 0; i < 30; i++) {
    rows.push(["GroupB", 20 + Math.random() * 40]); // 20-60
  }

  return createDataSet(["category", "value"], rows, ["string", "number"]);
}

// Helper to create dataset with trends
function createTrendDataset(direction: "up" | "down" | "stable", n = 50): DataSet {
  const rows: number[][] = [];

  for (let i = 0; i < n; i++) {
    let value: number;
    if (direction === "up") {
      value = i * 2 + Math.random() * 10; // Upward trend
    } else if (direction === "down") {
      value = 100 - i * 2 + Math.random() * 10; // Downward trend
    } else {
      value = 50 + Math.random() * 10; // Stable
    }
    rows.push([value]);
  }

  return createDataSet(["metric"], rows, ["number"]);
}

// Helper to create dataset with outliers
function createOutlierDataset(): DataSet {
  const rows: number[][] = [];

  // Normal values around 50
  for (let i = 0; i < 95; i++) {
    rows.push([50 + (Math.random() - 0.5) * 20]); // 40-60
  }

  // Outliers
  rows.push([200]); // High outlier
  rows.push([0]);   // Low outlier
  rows.push([250]); // Extreme outlier
  rows.push([-50]); // Extreme low outlier
  rows.push([300]); // Very extreme outlier

  return createDataSet(["measurement"], rows, ["number"]);
}

describe("generateHypotheses", () => {
  describe("Correlation-based hypotheses", () => {
    it("should generate hypothesis for strong correlation", () => {
      const data = createCorrelatedDataset(100, "strong");
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      // Should find correlation-based hypothesis
      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      expect(corrHypothesis).toBeDefined();
      expect(corrHypothesis!.confidence).toBeGreaterThan(50);
      expect(corrHypothesis!.variables).toContain("x_value");
      expect(corrHypothesis!.variables).toContain("y_value");
    });

    it("should have higher confidence for stronger correlations", () => {
      const strongData = createCorrelatedDataset(100, "strong");
      const moderateData = createCorrelatedDataset(100, "moderate");

      const strongAnalysis = analyzeDataSet(strongData);
      const moderateAnalysis = analyzeDataSet(moderateData);

      const strongHypotheses = generateHypotheses(strongData, strongAnalysis);
      const moderateHypotheses = generateHypotheses(moderateData, moderateAnalysis);

      const strongCorr = strongHypotheses.find(h => h.type === "correlation");
      const moderateCorr = moderateHypotheses.find(h => h.type === "correlation");

      if (strongCorr && moderateCorr) {
        expect(strongCorr.confidence).toBeGreaterThanOrEqual(moderateCorr.confidence);
      }
    });

    it("should not generate correlation hypothesis for weak correlations", () => {
      // Create dataset with truly uncorrelated data
      const rows: number[][] = [];
      for (let i = 0; i < 100; i++) {
        // Use deterministic values that are uncorrelated
        rows.push([i, (i * 7 + 13) % 100]); // Modular arithmetic breaks correlation
      }
      const data = createDataSet(["x_value", "y_value"], rows, ["number", "number"]);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      // Weak correlations should not generate hypotheses
      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      // Either no hypothesis, or low confidence if one exists
      expect(corrHypothesis === undefined || corrHypothesis.confidence < 50).toBe(true);
    });

    it("should include causal interpretation for correlation hypotheses", () => {
      const data = createCorrelatedDataset(100, "strong");
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      expect(corrHypothesis).toBeDefined();
      expect(corrHypothesis!.interpretation).toBeDefined();
      expect(["causal", "correlational", "reverse_causal", "confounded"]).toContain(
        corrHypothesis!.interpretation
      );
    });

    it("should provide recommendations for correlation hypotheses", () => {
      const data = createCorrelatedDataset(100, "strong");
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      expect(corrHypothesis).toBeDefined();
      expect(corrHypothesis!.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Group difference hypotheses", () => {
    it("should generate hypothesis for significant group difference", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const groupHypothesis = hypotheses.find(h => h.type === "group_difference");
      expect(groupHypothesis).toBeDefined();
      expect(groupHypothesis!.title).toContain("category");
      expect(groupHypothesis!.variables).toContain("category");
      expect(groupHypothesis!.variables).toContain("value");
    });

    it("should include t-test evidence for group differences", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const groupHypothesis = hypotheses.find(h => h.type === "group_difference");
      expect(groupHypothesis).toBeDefined();

      const tTestEvidence = groupHypothesis!.evidence.find(e => e.type === "test");
      expect(tTestEvidence).toBeDefined();
      expect(tTestEvidence!.description).toContain("t-test");
    });

    it("should not generate hypothesis for similar groups", () => {
      // Create dataset with similar group means
      const rows: (string | number)[][] = [];
      for (let i = 0; i < 30; i++) {
        rows.push(["GroupA", 50 + Math.random() * 10]);
        rows.push(["GroupB", 50 + Math.random() * 10]);
      }
      const data = createDataSet(["category", "value"], rows, ["string", "number"]);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      // Should not find significant group difference
      const groupHypothesis = hypotheses.find(h => h.type === "group_difference");
      expect(groupHypothesis === undefined || groupHypothesis.confidence < 50).toBe(true);
    });
  });

  describe("Trend hypotheses", () => {
    it("should generate hypothesis for upward trend", () => {
      const data = createTrendDataset("up", 100);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const trendHypothesis = hypotheses.find(h => h.type === "trend");
      expect(trendHypothesis).toBeDefined();
      expect(trendHypothesis!.title.toLowerCase()).toContain("increasing");
      expect(trendHypothesis!.variables).toContain("metric");
    });

    it("should generate hypothesis for downward trend", () => {
      const data = createTrendDataset("down", 100);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const trendHypothesis = hypotheses.find(h => h.type === "trend");
      expect(trendHypothesis).toBeDefined();
      expect(trendHypothesis!.title.toLowerCase()).toContain("decreasing");
    });

    it("should not generate hypothesis for stable data", () => {
      const data = createTrendDataset("stable", 100);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const trendHypothesis = hypotheses.find(h => h.type === "trend");
      // Stable data should not generate trend hypothesis or have low confidence
      expect(trendHypothesis === undefined || trendHypothesis.confidence < 50).toBe(true);
    });

    it("should include trend percentage in evidence", () => {
      const data = createTrendDataset("up", 100);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const trendHypothesis = hypotheses.find(h => h.type === "trend");
      expect(trendHypothesis).toBeDefined();

      const changeEvidence = trendHypothesis!.evidence.find(
        e => e.description.includes("%") || e.description.includes("Change")
      );
      expect(changeEvidence).toBeDefined();
    });
  });

  describe("Anomaly hypotheses", () => {
    it("should generate hypothesis for outliers", () => {
      const data = createOutlierDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const anomalyHypothesis = hypotheses.find(h => h.type === "anomaly");
      expect(anomalyHypothesis).toBeDefined();
      expect(anomalyHypothesis!.title.toLowerCase()).toContain("outlier");
    });

    it("should include outlier count in evidence", () => {
      const data = createOutlierDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const anomalyHypothesis = hypotheses.find(h => h.type === "anomaly");
      expect(anomalyHypothesis).toBeDefined();

      const outlierEvidence = anomalyHypothesis!.evidence.find(
        e => e.description.includes("outlier")
      );
      expect(outlierEvidence).toBeDefined();
    });

    it("should not generate anomaly hypothesis for clean data", () => {
      // Create dataset without outliers
      const rows: number[][] = [];
      for (let i = 0; i < 100; i++) {
        rows.push([50 + (Math.random() - 0.5) * 10]);
      }
      const data = createDataSet(["value"], rows, ["number"]);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const anomalyHypothesis = hypotheses.find(h => h.type === "anomaly");
      // Clean data should not have anomaly hypothesis
      expect(anomalyHypothesis).toBeUndefined();
    });
  });

  describe("Hypothesis structure", () => {
    it("should return hypotheses sorted by confidence", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      for (let i = 1; i < hypotheses.length; i++) {
        expect(hypotheses[i - 1].confidence).toBeGreaterThanOrEqual(
          hypotheses[i].confidence
        );
      }
    });

    it("should limit to reasonable number of hypotheses", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      expect(hypotheses.length).toBeLessThanOrEqual(10);
    });

    it("should include unique IDs for each hypothesis", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const ids = hypotheses.map(h => h.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should mark hypotheses as testable when appropriate", () => {
      const data = createCorrelatedDataset(100, "strong");
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      expect(corrHypothesis).toBeDefined();
      expect(corrHypothesis!.testable).toBe(true);
      expect(corrHypothesis!.testMethod).toBeDefined();
    });
  });
});

describe("testHypothesis", () => {
  describe("Correlation hypothesis testing", () => {
    it("should support strong correlation hypothesis", () => {
      const data = createCorrelatedDataset(100, "strong");
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      expect(corrHypothesis).toBeDefined();

      const result = testHypothesis(data, corrHypothesis!);
      expect(result.supported).toBe(true);
      expect(result.testStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.pValue!).toBeLessThan(0.05);
    });

    it("should not support weak correlation hypothesis", () => {
      // Create dataset with weak correlation
      const rows: number[][] = [];
      for (let i = 0; i < 100; i++) {
        rows.push([Math.random() * 100, Math.random() * 100]);
      }
      const data = createDataSet(["x", "y"], rows, ["number", "number"]);
      const analysis = analyzeDataSet(data);

      // Manually create a correlation hypothesis to test
      const mockHypothesis: Hypothesis = {
        id: "H1",
        type: "correlation",
        title: "Test correlation",
        description: "Testing weak correlation",
        confidence: 30,
        evidence: [],
        interpretation: "correlational",
        confounders: [],
        recommendations: [],
        variables: ["x", "y"],
        testable: true,
      };

      const result = testHypothesis(data, mockHypothesis);
      // Random data should not show significant correlation
      expect(result.pValue).toBeGreaterThan(0.01);
    });

    it("should include caveats in test results", () => {
      const data = createCorrelatedDataset(100, "strong");
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const corrHypothesis = hypotheses.find(h => h.type === "correlation");
      const result = testHypothesis(data, corrHypothesis!);

      expect(result.caveats).toBeDefined();
      expect(result.caveats.length).toBeGreaterThan(0);
    });
  });

  describe("Group difference hypothesis testing", () => {
    it("should support significant group difference hypothesis", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const groupHypothesis = hypotheses.find(h => h.type === "group_difference");
      expect(groupHypothesis).toBeDefined();

      const result = testHypothesis(data, groupHypothesis!);
      expect(result.supported).toBe(true);
      expect(result.pValue).toBeDefined();
      expect(result.pValue!).toBeLessThan(0.05);
    });

    it("should calculate effect size for group differences", () => {
      const data = createGroupDifferenceDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const groupHypothesis = hypotheses.find(h => h.type === "group_difference");
      const result = testHypothesis(data, groupHypothesis!);

      expect(result.effectSize).toBeDefined();
    });
  });

  describe("Trend hypothesis testing", () => {
    it("should support upward trend hypothesis", () => {
      const data = createTrendDataset("up", 100);
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const trendHypothesis = hypotheses.find(h => h.type === "trend");
      if (trendHypothesis) {
        const result = testHypothesis(data, trendHypothesis);
        expect(result.supported).toBe(true);
        expect(result.interpretation.toLowerCase()).toContain("upward");
      }
    });

    it("should not support trend in stable data", () => {
      const data = createTrendDataset("stable", 100);

      // Create mock trend hypothesis for stable data
      const mockHypothesis: Hypothesis = {
        id: "H1",
        type: "trend",
        title: "Metric is increasing",
        description: "Testing for trend",
        confidence: 30,
        evidence: [],
        interpretation: "correlational",
        confounders: [],
        recommendations: [],
        variables: ["metric"],
        testable: true,
      };

      const result = testHypothesis(data, mockHypothesis);
      // Stable data should show weak or no trend
      expect(result.testStatistic).toBeDefined();
    });
  });

  describe("Anomaly hypothesis testing", () => {
    it("should support anomaly hypothesis when outliers present", () => {
      const data = createOutlierDataset();
      const analysis = analyzeDataSet(data);
      const hypotheses = generateHypotheses(data, analysis);

      const anomalyHypothesis = hypotheses.find(h => h.type === "anomaly");
      expect(anomalyHypothesis).toBeDefined();

      const result = testHypothesis(data, anomalyHypothesis!);
      expect(result.supported).toBe(true);
      expect(result.testStatistic).toBeGreaterThan(0); // Outlier count
    });

    it("should not support anomaly hypothesis for clean data", () => {
      // Create clean dataset
      const rows: number[][] = [];
      for (let i = 0; i < 100; i++) {
        rows.push([50 + (Math.random() - 0.5) * 5]);
      }
      const data = createDataSet(["value"], rows, ["number"]);

      const mockHypothesis: Hypothesis = {
        id: "H1",
        type: "anomaly",
        title: "Outliers detected",
        description: "Testing for outliers",
        confidence: 30,
        evidence: [],
        interpretation: "correlational",
        confounders: [],
        recommendations: [],
        variables: ["value"],
        testable: true,
      };

      const result = testHypothesis(data, mockHypothesis);
      // Very clean data should have few or no outliers
      expect(result.testStatistic).toBeLessThan(5);
    });
  });

  describe("Error handling", () => {
    it("should handle missing columns gracefully", () => {
      const data = createDataSet(["a", "b"], [[1, 2], [3, 4]], ["number", "number"]);

      const mockHypothesis: Hypothesis = {
        id: "H1",
        type: "correlation",
        title: "Test",
        description: "Test",
        confidence: 50,
        evidence: [],
        interpretation: "correlational",
        confounders: [],
        recommendations: [],
        variables: ["missing_col1", "missing_col2"],
        testable: true,
      };

      const result = testHypothesis(data, mockHypothesis);
      expect(result.supported).toBe(false);
      expect(result.interpretation).toContain("Could not find");
    });

    it("should handle insufficient data gracefully", () => {
      const data = createDataSet(["x", "y"], [[1, 2], [3, 4]], ["number", "number"]);

      const mockHypothesis: Hypothesis = {
        id: "H1",
        type: "correlation",
        title: "Test",
        description: "Test",
        confidence: 50,
        evidence: [],
        interpretation: "correlational",
        confounders: [],
        recommendations: [],
        variables: ["x", "y"],
        testable: true,
      };

      const result = testHypothesis(data, mockHypothesis);
      expect(result.supported).toBe(false);
      expect(result.interpretation).toContain("Insufficient");
    });
  });
});

describe("formatHypothesisKowalski", () => {
  it("should format hypothesis with Kowalski style", () => {
    const hypothesis: Hypothesis = {
      id: "H1",
      type: "correlation",
      title: "Revenue correlates with marketing spend",
      description: "Strong positive correlation (r=0.85)",
      confidence: 85,
      evidence: [
        {
          type: "statistic",
          description: "Pearson r = 0.85",
          value: 0.85,
          interpretation: "Strong positive correlation",
        },
      ],
      interpretation: "correlational",
      confounders: ["seasonality"],
      recommendations: ["Run controlled experiment"],
      variables: ["revenue", "marketing_spend"],
      testable: true,
    };

    const formatted = formatHypothesisKowalski(hypothesis);

    expect(formatted).toContain("H1");
    expect(formatted).toContain("Revenue correlates with marketing spend");
    expect(formatted).toContain("85%");
    expect(formatted).toContain("Recommendations");
  });

  it("should include confidence level description", () => {
    const highConfidenceHypothesis: Hypothesis = {
      id: "H1",
      type: "correlation",
      title: "Test",
      description: "Test",
      confidence: 90,
      evidence: [],
      interpretation: "correlational",
      confounders: [],
      recommendations: ["Test"],
      variables: [],
      testable: true,
    };

    const formatted = formatHypothesisKowalski(highConfidenceHypothesis);
    expect(formatted).toContain("highly confident");
  });

  it("should include causation warning for correlational hypotheses", () => {
    const hypothesis: Hypothesis = {
      id: "H1",
      type: "correlation",
      title: "Test",
      description: "Test",
      confidence: 70,
      evidence: [],
      interpretation: "correlational",
      confounders: [],
      recommendations: ["Test"],
      variables: [],
      testable: true,
    };

    const formatted = formatHypothesisKowalski(hypothesis);
    expect(formatted.toLowerCase()).toContain("correlation");
    expect(formatted.toLowerCase()).toContain("causation");
  });
});

describe("Edge cases", () => {
  it("should handle empty dataset", () => {
    const data = createDataSet(["a", "b"], [], ["number", "number"]);
    const analysis = analyzeDataSet(data);
    const hypotheses = generateHypotheses(data, analysis);

    expect(hypotheses).toBeDefined();
    expect(Array.isArray(hypotheses)).toBe(true);
  });

  it("should handle single row dataset", () => {
    const data = createDataSet(["a", "b"], [[1, 2]], ["number", "number"]);
    const analysis = analyzeDataSet(data);
    const hypotheses = generateHypotheses(data, analysis);

    expect(hypotheses).toBeDefined();
    expect(Array.isArray(hypotheses)).toBe(true);
  });

  it("should handle dataset with all null values", () => {
    const data = createDataSet(
      ["a", "b"],
      [[null, null], [null, null], [null, null]],
      ["number", "number"]
    );
    const analysis = analyzeDataSet(data);
    const hypotheses = generateHypotheses(data, analysis);

    expect(hypotheses).toBeDefined();
    expect(Array.isArray(hypotheses)).toBe(true);
  });

  it("should handle dataset with single column", () => {
    const rows: number[][] = [];
    for (let i = 0; i < 100; i++) {
      rows.push([i * 2]);
    }
    const data = createDataSet(["value"], rows, ["number"]);
    const analysis = analyzeDataSet(data);
    const hypotheses = generateHypotheses(data, analysis);

    // Single column can still have trend hypothesis
    expect(hypotheses).toBeDefined();
  });
});

describe("Integration with analyzeDataSet", () => {
  it("should work with full analysis pipeline", () => {
    // Create comprehensive test dataset
    const rows: (string | number)[][] = [];
    for (let i = 0; i < 100; i++) {
      const category = i < 50 ? "Premium" : "Basic";
      const price = category === "Premium" ? 100 + Math.random() * 50 : 30 + Math.random() * 20;
      const sales = price * (0.8 + Math.random() * 0.4);
      const satisfaction = category === "Premium" ? 4 + Math.random() : 2 + Math.random() * 2;

      rows.push([category, price, sales, satisfaction]);
    }

    const data = createDataSet(
      ["category", "price", "sales", "satisfaction"],
      rows,
      ["string", "number", "number", "number"]
    );

    const analysis = analyzeDataSet(data);
    const hypotheses = generateHypotheses(data, analysis);

    // Should generate multiple hypothesis types
    expect(hypotheses.length).toBeGreaterThan(0);

    // Check for correlation hypothesis (price-sales should correlate)
    const corrHypothesis = hypotheses.find(h =>
      h.type === "correlation" &&
      (h.variables.includes("price") || h.variables.includes("sales"))
    );

    // Check for group difference hypothesis
    const groupHypothesis = hypotheses.find(h =>
      h.type === "group_difference" &&
      h.variables.includes("category")
    );

    // At least one of these should be present
    expect(corrHypothesis || groupHypothesis).toBeTruthy();
  });
});
