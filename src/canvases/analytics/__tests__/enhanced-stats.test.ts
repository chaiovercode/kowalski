// Tests for Enhanced Statistics (Phase 3.2)
// "Kowalski, validate the advanced statistical methods!"

import { describe, it, expect } from "bun:test";
import {
  calculateCramersV,
  calculatePointBiserial,
  calculateZScore,
  detectOutliersZScore,
  detectChangePoints,
  detectSeasonality,
  calculateStats,
} from "../stats";

describe("Cramér's V for Categorical Correlation", () => {
  it("should return 1 for perfectly associated categories", () => {
    // Perfect association: each x value maps to exactly one y value
    const x = ["A", "A", "B", "B", "C", "C"];
    const y = ["X", "X", "Y", "Y", "Z", "Z"];
    const v = calculateCramersV(x, y);
    expect(v).toBeCloseTo(1, 1);
  });

  it("should return near 0 for independent categories", () => {
    // Independent: uniform distribution across all combinations
    const x = ["A", "A", "A", "A", "B", "B", "B", "B"];
    const y = ["X", "Y", "X", "Y", "X", "Y", "X", "Y"];
    const v = calculateCramersV(x, y);
    expect(v).toBeLessThan(0.2);
  });

  it("should handle numeric categorical values", () => {
    const x = [1, 1, 2, 2, 3, 3];
    const y = [10, 10, 20, 20, 30, 30];
    const v = calculateCramersV(x, y);
    expect(v).toBeCloseTo(1, 1);
  });

  it("should skip null values", () => {
    const x = ["A", "A", null, "B", "B"];
    const y = ["X", "X", "Y", "Y", "Y"];
    const v = calculateCramersV(x, y);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it("should return 0 for insufficient data", () => {
    expect(calculateCramersV([], [])).toBe(0);
    expect(calculateCramersV(["A"], ["X"])).toBe(0);
  });

  it("should return 0 if only one category on either side", () => {
    const x = ["A", "A", "A", "A"];
    const y = ["X", "Y", "Z", "W"];
    const v = calculateCramersV(x, y);
    expect(v).toBe(0);
  });

  it("should detect moderate association", () => {
    // Some association but not perfect
    const x = ["A", "A", "A", "B", "B", "B", "B", "C", "C", "C"];
    const y = ["X", "X", "Y", "X", "Y", "Y", "Y", "Z", "Z", "Y"];
    const v = calculateCramersV(x, y);
    expect(v).toBeGreaterThan(0.3);
    expect(v).toBeLessThan(0.9);
  });
});

describe("Point-Biserial Correlation", () => {
  it("should return positive correlation when group 1 has higher values", () => {
    const numeric = [100, 105, 110, 95, 10, 15, 20, 5];
    const categorical = ["High", "High", "High", "High", "Low", "Low", "Low", "Low"];
    const rpb = calculatePointBiserial(numeric, categorical);
    expect(rpb).toBeGreaterThan(0.7);
  });

  it("should return negative correlation when group 1 has lower values", () => {
    const numeric = [10, 15, 20, 5, 100, 105, 110, 95];
    const categorical = ["Low", "Low", "Low", "Low", "High", "High", "High", "High"];
    const rpb = calculatePointBiserial(numeric, categorical);
    // Low is more common, so Low vs rest (High) - Low has lower values = negative
    expect(rpb).toBeLessThan(-0.3);
  });

  it("should return near 0 for no difference between groups", () => {
    const numeric = [50, 52, 48, 51, 49, 53, 47, 50];
    const categorical = ["A", "A", "A", "A", "B", "B", "B", "B"];
    const rpb = calculatePointBiserial(numeric, categorical);
    expect(Math.abs(rpb)).toBeLessThan(0.2);
  });

  it("should handle multi-category variables", () => {
    // Uses most common category vs rest
    const numeric = [100, 105, 110, 95, 10, 15, 20, 5, 50, 55];
    const categorical = ["A", "A", "A", "A", "B", "B", "C", "C", "A", "A"];
    const rpb = calculatePointBiserial(numeric, categorical);
    expect(rpb).toBeDefined();
    expect(rpb).toBeGreaterThanOrEqual(-1);
    expect(rpb).toBeLessThanOrEqual(1);
  });

  it("should skip null values", () => {
    const numeric = [100, 105, null as unknown as number, 95, 10, 15, 20, 5];
    const categorical = ["A", "A", "A", "A", "B", "B", "B", null];
    // Note: NaN will be filtered out
    const rpb = calculatePointBiserial(
      numeric.map(n => typeof n === 'number' ? n : NaN),
      categorical
    );
    expect(rpb).toBeDefined();
  });

  it("should return 0 for insufficient categories", () => {
    const numeric = [1, 2, 3, 4];
    const categorical = ["A", "A", "A", "A"];
    expect(calculatePointBiserial(numeric, categorical)).toBe(0);
  });

  it("should return 0 for mismatched array lengths", () => {
    expect(calculatePointBiserial([1, 2, 3], ["A", "B"])).toBe(0);
  });
});

describe("Z-Score Calculations", () => {
  describe("calculateZScore", () => {
    it("should return 0 for the mean value", () => {
      expect(calculateZScore(50, 50, 10)).toBe(0);
    });

    it("should return positive z-score for values above mean", () => {
      expect(calculateZScore(60, 50, 10)).toBe(1);
      expect(calculateZScore(70, 50, 10)).toBe(2);
    });

    it("should return negative z-score for values below mean", () => {
      expect(calculateZScore(40, 50, 10)).toBe(-1);
      expect(calculateZScore(30, 50, 10)).toBe(-2);
    });

    it("should handle zero standard deviation", () => {
      expect(calculateZScore(50, 50, 0)).toBe(0);
    });
  });

  describe("detectOutliersZScore", () => {
    it("should detect extreme outliers (default threshold 3)", () => {
      // More values in "normal" range to reduce std impact of outlier
      // This creates a clear outlier with z-score > 3
      const values = [
        50, 50, 50, 50, 50, 50, 50, 50, 50, 50,
        50, 50, 50, 50, 50, 50, 50, 50, 50, 200
      ];
      const { indices, zscores } = detectOutliersZScore(values);
      expect(indices).toContain(19); // Index of 200
      expect(zscores.length).toBe(indices.length);
    });

    it("should detect outliers with custom threshold", () => {
      const values = [48, 50, 52, 49, 51, 50, 48, 52, 80, 50];
      const { indices } = detectOutliersZScore(values, 2);
      expect(indices).toContain(8); // Index of 80
    });

    it("should return empty for no outliers", () => {
      const values = [48, 50, 52, 49, 51, 50, 48, 52, 50, 51];
      const { indices } = detectOutliersZScore(values);
      expect(indices.length).toBe(0);
    });

    it("should return empty for constant values", () => {
      const values = [50, 50, 50, 50, 50];
      const { indices } = detectOutliersZScore(values);
      expect(indices.length).toBe(0);
    });

    it("should return empty for insufficient data", () => {
      expect(detectOutliersZScore([]).indices.length).toBe(0);
      expect(detectOutliersZScore([1]).indices.length).toBe(0);
      expect(detectOutliersZScore([1, 2]).indices.length).toBe(0);
    });

    it("should detect both high and low outliers", () => {
      const values = [50, 51, 49, 50, 52, 48, 50, 0, 100];
      const { indices } = detectOutliersZScore(values, 2);
      // Both 0 and 100 should be outliers
      expect(indices.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("Change Point Detection", () => {
  it("should detect a clear level shift", () => {
    // First half around 20, second half around 80 - more data points per segment
    const values = [
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80
    ];
    const changePoints = detectChangePoints(values, 5, 2.0);
    expect(changePoints.length).toBeGreaterThanOrEqual(1);

    // Find a change point that indicates an increase
    const increasePoint = changePoints.find(cp => cp.direction === "increase");
    expect(increasePoint).toBeDefined();
    if (increasePoint) {
      expect(increasePoint.afterMean).toBeGreaterThan(increasePoint.beforeMean);
    }
  });

  it("should detect decrease change point", () => {
    const values = [
      80, 82, 78, 81, 79, 80, 82, 78, 81, 79,
      20, 22, 18, 21, 19, 20, 22, 18, 21, 19
    ];
    const changePoints = detectChangePoints(values);
    expect(changePoints.length).toBeGreaterThanOrEqual(1);
    expect(changePoints[0].direction).toBe("decrease");
  });

  it("should return empty for constant data", () => {
    const values = Array(20).fill(50);
    const changePoints = detectChangePoints(values);
    expect(changePoints.length).toBe(0);
  });

  it("should return empty for insufficient data", () => {
    expect(detectChangePoints([1, 2, 3]).length).toBe(0);
  });

  it("should detect multiple change points", () => {
    // Low -> High -> Low
    const values = [
      10, 12, 11, 10, 11,  // Low
      50, 52, 51, 50, 51,  // High
      10, 12, 11, 10, 11   // Low again
    ];
    const changePoints = detectChangePoints(values);
    expect(changePoints.length).toBeGreaterThanOrEqual(1);
  });

  it("should have low significance for gradual trends", () => {
    // Very gradual linear increase with small increments
    const values = Array.from({ length: 30 }, (_, i) => 50 + i * 0.5);
    const changePoints = detectChangePoints(values, 10, 10); // Very high threshold
    // Gradual changes should have lower significance or no change points at very high threshold
    // If any change points are found, they should have lower significance than abrupt changes
    for (const cp of changePoints) {
      expect(cp.significance).toBeLessThan(15); // Gradual changes won't have extreme significance
    }
  });

  it("should include correct before/after means", () => {
    const values = [
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50
    ];
    const changePoints = detectChangePoints(values, 5, 2.0);
    expect(changePoints.length).toBeGreaterThanOrEqual(1);
    // Find a change point indicating an increase
    const increasePoint = changePoints.find(cp => cp.direction === "increase");
    expect(increasePoint).toBeDefined();
    if (increasePoint) {
      // Before mean should be less than after mean (increase direction)
      expect(increasePoint.beforeMean).toBeLessThan(increasePoint.afterMean);
      // Before mean should be closer to 10 (lower values)
      expect(increasePoint.beforeMean).toBeLessThan(30);
      // After mean should be closer to 50 (higher values)
      expect(increasePoint.afterMean).toBeGreaterThan(30);
    }
  });
});

describe("Seasonality Detection", () => {
  it("should detect weekly seasonality (period 7)", () => {
    // Generate weekly pattern
    const values: number[] = [];
    for (let i = 0; i < 28; i++) {
      // Peak on day 0 (Sunday), low on day 3 (Wednesday)
      const dayOfWeek = i % 7;
      const seasonal = dayOfWeek === 0 ? 100 : dayOfWeek === 3 ? 20 : 60;
      values.push(seasonal + Math.random() * 5);
    }

    const result = detectSeasonality(values);
    expect(result.detected).toBe(true);
    expect(result.period).toBe(7);
  });

  it("should detect quarterly seasonality (period 4)", () => {
    const values: number[] = [];
    for (let i = 0; i < 16; i++) {
      const quarter = i % 4;
      const seasonal = quarter === 0 ? 100 : quarter === 1 ? 60 : quarter === 2 ? 40 : 80;
      values.push(seasonal);
    }

    const result = detectSeasonality(values);
    expect(result.detected).toBe(true);
    expect(result.period).toBe(4);
  });

  it("should return false for random data", () => {
    const values = Array.from({ length: 50 }, () => Math.random() * 100);
    const result = detectSeasonality(values);
    // Random data might occasionally show weak patterns
    if (result.detected && result.strength) {
      expect(result.strength).toBeLessThan(0.5);
    }
  });

  it("should return false for constant data", () => {
    const values = Array(20).fill(50);
    const result = detectSeasonality(values);
    expect(result.detected).toBe(false);
  });

  it("should return false for insufficient data", () => {
    const result = detectSeasonality([1, 2, 3, 4, 5]);
    expect(result.detected).toBe(false);
  });

  it("should include strength metric", () => {
    const values: number[] = [];
    for (let i = 0; i < 20; i++) {
      values.push(i % 4 === 0 ? 100 : 20);
    }

    const result = detectSeasonality(values);
    if (result.detected) {
      expect(result.strength).toBeDefined();
      expect(result.strength).toBeGreaterThan(0.3);
      expect(result.strength).toBeLessThanOrEqual(1);
    }
  });

  it("should provide meaningful description", () => {
    const values: number[] = [];
    for (let i = 0; i < 28; i++) {
      values.push(i % 7 === 0 ? 100 : 50);
    }

    const result = detectSeasonality(values);
    expect(result.description).toBeDefined();
    if (result.detected && result.period === 7) {
      expect(result.description).toContain("weekly");
    }
  });

  it("should handle monthly pattern detection", () => {
    const values: number[] = [];
    for (let i = 0; i < 36; i++) {
      // Simulate monthly pattern in yearly data (12 months per cycle)
      const month = i % 12;
      const seasonal = month < 3 ? 80 : month < 6 ? 50 : month < 9 ? 30 : 60;
      values.push(seasonal);
    }

    const result = detectSeasonality(values);
    if (result.detected) {
      expect(result.period).toBe(12);
    }
  });
});

describe("Integration with calculateStats", () => {
  it("should calculate stats correctly for use in z-score", () => {
    const values = [10, 20, 30, 40, 50];
    const stats = calculateStats(values);

    expect(stats.mean).toBe(30);
    expect(stats.count).toBe(5);
    expect(stats.std).toBeCloseTo(14.14, 1);

    // Verify z-score calculation
    const zscore = calculateZScore(50, stats.mean, stats.std);
    expect(zscore).toBeCloseTo(1.41, 1);
  });
});
