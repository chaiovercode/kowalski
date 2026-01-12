// Performance Optimization tests for Phase 9
// "Maximum efficiency achieved, Skipper." - Kowalski

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getDatasetTier,
  getProcessingStrategy,
  getLargeDatasetWarning,
  prepareForAnalysis,
  generateDataFingerprint,
  getCachedAnalysis,
  cacheAnalysis,
  clearAnalysisCache,
  getCacheStats,
  processInChunks,
  mergeAnalysisResults,
  PerformanceTimer,
  checkPerformanceTargets,
  TIER_THRESHOLDS,
  SAMPLE_SIZES,
  CHUNK_SIZES,
  PERFORMANCE_TARGETS,
} from "../performance";
import type { DataSet, AnalysisResult } from "../types";

// Helper to create test datasets of specific sizes
const createTestData = (rowCount: number, name = "test.csv"): DataSet => {
  const rows: (string | number | null)[][] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push([i, `Item ${i}`, i * 10, i % 5]);
  }
  return {
    name,
    columns: ["id", "name", "value", "category"],
    rows,
    types: ["number", "string", "number", "number"],
  };
};

const createTestAnalysis = (): AnalysisResult => ({
  summary: {
    totalRows: 100,
    totalColumns: 4,
    numericColumns: 3,
    categoricalColumns: 1,
    missingPercent: 0,
  },
  statistics: {
    id: { type: "numeric", mean: 50, std: 28.9, min: 0, max: 99 },
    value: { type: "numeric", mean: 490, std: 288.7, min: 0, max: 990 },
  },
  correlations: [{ column1: "id", column2: "value", value: 1.0, strength: "perfect" }],
  trends: [],
  outliers: [],
});

describe("Dataset Tier Detection", () => {
  it("should classify small datasets (<10k rows)", () => {
    expect(getDatasetTier(0)).toBe("small");
    expect(getDatasetTier(100)).toBe("small");
    expect(getDatasetTier(5000)).toBe("small");
    expect(getDatasetTier(9999)).toBe("small");
    expect(getDatasetTier(10000)).toBe("small");
  });

  it("should classify medium datasets (10k-100k rows)", () => {
    expect(getDatasetTier(10001)).toBe("medium");
    expect(getDatasetTier(50000)).toBe("medium");
    expect(getDatasetTier(99999)).toBe("medium");
    expect(getDatasetTier(100000)).toBe("medium");
  });

  it("should classify large datasets (100k-500k rows)", () => {
    expect(getDatasetTier(100001)).toBe("large");
    expect(getDatasetTier(250000)).toBe("large");
    expect(getDatasetTier(499999)).toBe("large");
    expect(getDatasetTier(500000)).toBe("large");
  });

  it("should classify massive datasets (>500k rows)", () => {
    expect(getDatasetTier(500001)).toBe("massive");
    expect(getDatasetTier(1000000)).toBe("massive");
    expect(getDatasetTier(10000000)).toBe("massive");
  });
});

describe("Processing Strategy", () => {
  describe("Small datasets", () => {
    it("should not sample small datasets", () => {
      const data = createTestData(5000);
      const strategy = getProcessingStrategy(data);

      expect(strategy.tier).toBe("small");
      expect(strategy.shouldSample).toBe(false);
      expect(strategy.shouldWarn).toBe(false);
      expect(strategy.shouldChunk).toBe(false);
    });

    it("should estimate fast processing time", () => {
      const data = createTestData(1000);
      const strategy = getProcessingStrategy(data);

      expect(strategy.estimatedTime).toContain("< 2");
    });
  });

  describe("Medium datasets", () => {
    it("should sample medium datasets", () => {
      const data = createTestData(50000);
      const strategy = getProcessingStrategy(data);

      expect(strategy.tier).toBe("medium");
      expect(strategy.shouldSample).toBe(true);
      expect(strategy.sampleSize).toBe(SAMPLE_SIZES.medium);
      expect(strategy.shouldWarn).toBe(false);
    });
  });

  describe("Large datasets", () => {
    it("should sample and warn for large datasets", () => {
      const data = createTestData(200000);
      const strategy = getProcessingStrategy(data);

      expect(strategy.tier).toBe("large");
      expect(strategy.shouldSample).toBe(true);
      expect(strategy.shouldWarn).toBe(true);
      expect(strategy.shouldChunk).toBe(true);
      expect(strategy.chunkSize).toBe(CHUNK_SIZES.large);
    });
  });

  describe("Massive datasets", () => {
    it("should handle massive datasets with warnings", () => {
      const data = createTestData(1000000);
      const strategy = getProcessingStrategy(data);

      expect(strategy.tier).toBe("massive");
      expect(strategy.shouldSample).toBe(true);
      expect(strategy.shouldWarn).toBe(true);
      expect(strategy.sampleSize).toBe(SAMPLE_SIZES.massive);
    });
  });
});

describe("Warning Messages", () => {
  it("should return null for small datasets", () => {
    const data = createTestData(5000);
    const strategy = getProcessingStrategy(data);
    const warning = getLargeDatasetWarning(strategy);

    expect(warning).toBeNull();
  });

  it("should return null for medium datasets", () => {
    const data = createTestData(50000);
    const strategy = getProcessingStrategy(data);
    const warning = getLargeDatasetWarning(strategy);

    expect(warning).toBeNull();
  });

  it("should return warning for large datasets", () => {
    const data = createTestData(200000);
    const strategy = getProcessingStrategy(data);
    const warning = getLargeDatasetWarning(strategy);

    expect(warning).not.toBeNull();
    expect(warning).toContain("Skipper");
    expect(warning).toContain("200,000");
  });

  it("should return special warning for massive datasets", () => {
    const data = createTestData(1000000);
    const strategy = getProcessingStrategy(data);
    const warning = getLargeDatasetWarning(strategy);

    expect(warning).not.toBeNull();
    expect(warning).toContain("Whoa there, Skipper");
    expect(warning).toContain("1,000,000");
    expect(warning).toContain("reconnaissance");
  });
});

describe("Prepare for Analysis", () => {
  it("should not modify small datasets", () => {
    const data = createTestData(1000);
    const { processedData, strategy, warning } = prepareForAnalysis(data);

    expect(processedData.rows.length).toBe(1000);
    expect(strategy.tier).toBe("small");
    expect(warning).toBeNull();
  });

  it("should sample medium datasets", () => {
    const data = createTestData(50000);
    const { processedData, strategy } = prepareForAnalysis(data);

    expect(processedData.rows.length).toBeLessThanOrEqual(SAMPLE_SIZES.medium);
    expect(strategy.shouldSample).toBe(true);
  });

  it("should return strategy and warning for large datasets", () => {
    const data = createTestData(200000);
    const { strategy, warning } = prepareForAnalysis(data);

    expect(strategy.shouldWarn).toBe(true);
    expect(warning).not.toBeNull();
  });
});

describe("Data Fingerprinting", () => {
  it("should generate consistent fingerprints", () => {
    const data = createTestData(100);
    const fp1 = generateDataFingerprint(data);
    const fp2 = generateDataFingerprint(data);

    expect(fp1).toBe(fp2);
  });

  it("should generate different fingerprints for different data", () => {
    const data1 = createTestData(100, "data1.csv");
    const data2 = createTestData(100, "data2.csv");

    const fp1 = generateDataFingerprint(data1);
    const fp2 = generateDataFingerprint(data2);

    expect(fp1).not.toBe(fp2);
  });

  it("should detect row count changes", () => {
    const data1 = createTestData(100);
    const data2 = createTestData(200);

    const fp1 = generateDataFingerprint(data1);
    const fp2 = generateDataFingerprint(data2);

    expect(fp1).not.toBe(fp2);
  });

  it("should handle empty datasets", () => {
    const data: DataSet = {
      name: "empty.csv",
      columns: ["a", "b"],
      rows: [],
      types: ["string", "number"],
    };

    const fp = generateDataFingerprint(data);

    expect(typeof fp).toBe("string");
    expect(fp.length).toBeGreaterThan(0);
  });
});

describe("Analysis Caching", () => {
  beforeEach(() => {
    clearAnalysisCache();
  });

  it("should cache and retrieve analysis", () => {
    const data = createTestData(100);
    const analysis = createTestAnalysis();

    cacheAnalysis(data, analysis);
    const cached = getCachedAnalysis(data);

    expect(cached).not.toBeNull();
    expect(cached?.summary.totalRows).toBe(100);
  });

  it("should return null for uncached data", () => {
    const data = createTestData(100);
    const cached = getCachedAnalysis(data);

    expect(cached).toBeNull();
  });

  it("should differentiate between datasets", () => {
    const data1 = createTestData(100, "data1.csv");
    const data2 = createTestData(100, "data2.csv");
    const analysis1 = { ...createTestAnalysis(), summary: { ...createTestAnalysis().summary, totalRows: 100 } };
    const analysis2 = { ...createTestAnalysis(), summary: { ...createTestAnalysis().summary, totalRows: 200 } };

    cacheAnalysis(data1, analysis1);
    cacheAnalysis(data2, analysis2);

    expect(getCachedAnalysis(data1)?.summary.totalRows).toBe(100);
    expect(getCachedAnalysis(data2)?.summary.totalRows).toBe(200);
  });

  it("should clear cache", () => {
    const data = createTestData(100);
    const analysis = createTestAnalysis();

    cacheAnalysis(data, analysis);
    clearAnalysisCache();

    expect(getCachedAnalysis(data)).toBeNull();
  });

  it("should provide cache statistics", () => {
    const data1 = createTestData(100, "data1.csv");
    const data2 = createTestData(100, "data2.csv");

    cacheAnalysis(data1, createTestAnalysis());
    cacheAnalysis(data2, createTestAnalysis());

    const stats = getCacheStats();

    expect(stats.size).toBe(2);
    expect(stats.entries.length).toBe(2);
  });
});

describe("Chunk Processing", () => {
  it("should process data in chunks", async () => {
    const data = createTestData(100);
    const chunkSize = 25;
    const processedChunks: number[] = [];

    const results = await processInChunks(
      data,
      chunkSize,
      async (chunk, index) => {
        processedChunks.push(index);
        return chunk.rows.length;
      }
    );

    expect(results.length).toBe(4);
    expect(processedChunks).toEqual([0, 1, 2, 3]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("should call progress callback", async () => {
    const data = createTestData(100);
    const progressUpdates: { progress: number; message: string }[] = [];

    await processInChunks(
      data,
      50,
      async (chunk) => chunk.rows.length,
      (progress, message) => progressUpdates.push({ progress, message })
    );

    expect(progressUpdates.length).toBe(2);
    expect(progressUpdates[0].progress).toBe(50);
    expect(progressUpdates[1].progress).toBe(100);
  });

  it("should handle single chunk", async () => {
    const data = createTestData(50);

    const results = await processInChunks(
      data,
      100,
      async (chunk) => chunk.rows.length
    );

    expect(results.length).toBe(1);
    expect(results[0]).toBe(50);
  });
});

describe("Merge Analysis Results", () => {
  it("should merge multiple analysis results", () => {
    const result1: AnalysisResult = {
      summary: { totalRows: 100, totalColumns: 4, numericColumns: 3, categoricalColumns: 1, missingPercent: 0 },
      statistics: { id: { type: "numeric", mean: 50, std: 10, min: 0, max: 99 } },
      correlations: [{ column1: "id", column2: "value", value: 0.9, strength: "strong" }],
      trends: [],
      outliers: [{ column: "value", rowIndex: 5, value: 1000, zscore: 3.5 }],
    };

    const result2: AnalysisResult = {
      summary: { totalRows: 100, totalColumns: 4, numericColumns: 3, categoricalColumns: 1, missingPercent: 0 },
      statistics: { id: { type: "numeric", mean: 150, std: 10, min: 100, max: 199 } },
      correlations: [{ column1: "id", column2: "value", value: 0.9, strength: "strong" }],
      trends: [],
      outliers: [{ column: "value", rowIndex: 105, value: 2000, zscore: 4.0 }],
    };

    const merged = mergeAnalysisResults([result1, result2]);

    expect(merged.summary.totalRows).toBe(200);
    expect(merged.correlations.length).toBe(1); // Deduplicated
    expect(merged.outliers.length).toBe(2);
  });

  it("should handle empty results array", () => {
    const merged = mergeAnalysisResults([]);

    expect(merged.summary.totalRows).toBe(0);
    expect(merged.correlations).toEqual([]);
  });

  it("should return single result unchanged", () => {
    const result = createTestAnalysis();
    const merged = mergeAnalysisResults([result]);

    expect(merged).toBe(result);
  });
});

describe("Performance Timer", () => {
  it("should track elapsed time", async () => {
    const timer = new PerformanceTimer();

    // Small delay
    await new Promise((r) => setTimeout(r, 10));

    expect(timer.elapsed()).toBeGreaterThanOrEqual(10);
  });

  it("should record marks", async () => {
    const timer = new PerformanceTimer();

    await new Promise((r) => setTimeout(r, 5));
    timer.mark("step1");

    await new Promise((r) => setTimeout(r, 5));
    timer.mark("step2");

    const marks = timer.getMarks();

    expect(marks.step1).toBeDefined();
    expect(marks.step2).toBeDefined();
    expect(marks.step2).toBeGreaterThan(marks.step1);
  });

  it("should provide summary", () => {
    const timer = new PerformanceTimer();
    timer.mark("test");

    const summary = timer.getSummary();

    expect(summary).toContain("Total:");
    expect(summary).toContain("test:");
  });

  it("should check targets", async () => {
    const timer = new PerformanceTimer();

    expect(timer.meetsTarget(1000)).toBe(true);
  });
});

describe("Performance Targets", () => {
  it("should validate performance targets", () => {
    const timings = {
      initialScan: 1500,  // < 2000 ✓
      edaReport: 3000,    // < 5000 ✓
      chartRender: 500,   // < 1000 ✓
      filterApply: 200,   // < 500 ✓
    };

    const { passed, results } = checkPerformanceTargets(timings);

    expect(passed).toBe(true);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("should detect failed targets", () => {
    const timings = {
      initialScan: 3000,  // > 2000 ✗
      edaReport: 3000,    // < 5000 ✓
    };

    const { passed, results } = checkPerformanceTargets(timings);

    expect(passed).toBe(false);
    expect(results.find((r) => r.target === "initialScan")?.passed).toBe(false);
    expect(results.find((r) => r.target === "edaReport")?.passed).toBe(true);
  });

  it("should ignore missing timings", () => {
    const timings = {
      initialScan: 1000,
      // Other targets not provided
    };

    const { results } = checkPerformanceTargets(timings);

    expect(results.length).toBe(1);
  });

  it("should have reasonable default targets", () => {
    expect(PERFORMANCE_TARGETS.initialScan).toBeLessThanOrEqual(5000);
    expect(PERFORMANCE_TARGETS.edaReport).toBeLessThanOrEqual(10000);
    expect(PERFORMANCE_TARGETS.chartRender).toBeLessThanOrEqual(2000);
    expect(PERFORMANCE_TARGETS.filterApply).toBeLessThanOrEqual(1000);
  });
});

describe("Constants", () => {
  it("should have increasing tier thresholds", () => {
    expect(TIER_THRESHOLDS.small).toBeLessThan(TIER_THRESHOLDS.medium);
    expect(TIER_THRESHOLDS.medium).toBeLessThan(TIER_THRESHOLDS.large);
    expect(TIER_THRESHOLDS.large).toBeLessThan(TIER_THRESHOLDS.massive);
  });

  it("should have decreasing sample sizes for larger tiers", () => {
    expect(SAMPLE_SIZES.medium).toBeLessThan(SAMPLE_SIZES.small);
    expect(SAMPLE_SIZES.large).toBeLessThanOrEqual(SAMPLE_SIZES.medium);
  });

  it("should have decreasing chunk sizes for larger tiers", () => {
    expect(CHUNK_SIZES.medium).toBeLessThan(CHUNK_SIZES.small);
    expect(CHUNK_SIZES.large).toBeLessThan(CHUNK_SIZES.medium);
    expect(CHUNK_SIZES.massive).toBeLessThan(CHUNK_SIZES.large);
  });
});
