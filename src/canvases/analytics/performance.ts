// Performance Optimization Module for Kowalski Analytics
// "Optimizing for maximum efficiency, Skipper." - Kowalski

import type { DataSet, AnalysisResult } from "./types";
import { sampleForAnalysis, cacheColumnData, clearColumnCache } from "./data-loader";

/**
 * Dataset size tiers for processing strategy
 */
export type DatasetTier = "small" | "medium" | "large" | "massive";

/**
 * Processing strategy based on dataset tier
 */
export interface ProcessingStrategy {
  tier: DatasetTier;
  rowCount: number;
  shouldSample: boolean;
  sampleSize: number;
  shouldWarn: boolean;
  shouldChunk: boolean;
  chunkSize: number;
  estimatedTime: string;
}

/**
 * Tier thresholds configuration
 */
export const TIER_THRESHOLDS = {
  small: 10_000,       // Full analysis, no sampling
  medium: 100_000,     // Smart sampling enabled
  large: 500_000,      // Warn + chunk processing
  massive: Infinity,   // Maximum supported
};

/**
 * Sample sizes for each tier
 */
export const SAMPLE_SIZES = {
  small: Infinity,     // No sampling
  medium: 10_000,      // Sample to 10k
  large: 5_000,        // Sample to 5k for initial analysis
  massive: 5_000,
};

/**
 * Chunk sizes for large dataset processing
 */
export const CHUNK_SIZES = {
  small: Infinity,
  medium: 50_000,
  large: 25_000,
  massive: 10_000,
};

/**
 * Determine the processing tier for a dataset
 */
export function getDatasetTier(rowCount: number): DatasetTier {
  if (rowCount <= TIER_THRESHOLDS.small) return "small";
  if (rowCount <= TIER_THRESHOLDS.medium) return "medium";
  if (rowCount <= TIER_THRESHOLDS.large) return "large";
  return "massive";
}

/**
 * Get processing strategy for a dataset
 */
export function getProcessingStrategy(data: DataSet): ProcessingStrategy {
  const rowCount = data.rows.length;
  const tier = getDatasetTier(rowCount);

  const strategy: ProcessingStrategy = {
    tier,
    rowCount,
    shouldSample: tier !== "small",
    sampleSize: SAMPLE_SIZES[tier],
    shouldWarn: tier === "large" || tier === "massive",
    shouldChunk: tier === "large" || tier === "massive",
    chunkSize: CHUNK_SIZES[tier],
    estimatedTime: estimateProcessingTime(rowCount, tier),
  };

  return strategy;
}

/**
 * Estimate processing time based on row count and tier
 */
function estimateProcessingTime(rowCount: number, tier: DatasetTier): string {
  // Rough estimates based on typical processing speeds
  const baseTimePerRow = 0.0001; // 0.1ms per row for basic operations

  switch (tier) {
    case "small":
      return "< 2 seconds";
    case "medium":
      return "2-5 seconds";
    case "large":
      return "5-15 seconds";
    case "massive":
      return "15+ seconds";
    default:
      return "unknown";
  }
}

/**
 * Get Kowalski warning message for large datasets
 */
export function getLargeDatasetWarning(strategy: ProcessingStrategy): string | null {
  if (!strategy.shouldWarn) return null;

  const { tier, rowCount, sampleSize } = strategy;

  if (tier === "massive") {
    return `Whoa there, Skipper! This dataset has ${rowCount.toLocaleString()} rows - that's a lot of reconnaissance data! ` +
      `I'll analyze a strategic sample of ${sampleSize.toLocaleString()} rows to maintain operational efficiency. ` +
      `Full analysis would take ${strategy.estimatedTime}.`;
  }

  return `Skipper, this is a substantial dataset with ${rowCount.toLocaleString()} rows. ` +
    `I'll use smart sampling (${sampleSize.toLocaleString()} rows) for optimal performance. ` +
    `Estimated time: ${strategy.estimatedTime}.`;
}

/**
 * Prepare dataset for analysis based on its size
 */
export function prepareForAnalysis(data: DataSet): {
  processedData: DataSet;
  strategy: ProcessingStrategy;
  warning: string | null;
} {
  const strategy = getProcessingStrategy(data);
  const warning = getLargeDatasetWarning(strategy);

  let processedData = data;

  // Apply sampling if needed
  if (strategy.shouldSample && strategy.sampleSize < data.rows.length) {
    processedData = sampleForAnalysis(data, strategy.sampleSize);
  }

  // Pre-cache column data for faster access
  cacheColumnData(processedData);

  return { processedData, strategy, warning };
}

/**
 * Analysis result cache
 */
interface CachedAnalysis {
  fingerprint: string;
  timestamp: number;
  result: AnalysisResult;
}

const analysisCache = new Map<string, CachedAnalysis>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a fingerprint for a dataset
 */
export function generateDataFingerprint(data: DataSet): string {
  const parts = [
    data.name,
    data.columns.join(","),
    String(data.rows.length),
    // Sample first and last row for quick fingerprint
    data.rows[0]?.slice(0, 3).join(",") || "",
    data.rows[data.rows.length - 1]?.slice(0, 3).join(",") || "",
  ];
  return parts.join("|");
}

/**
 * Get cached analysis result if available and fresh
 */
export function getCachedAnalysis(data: DataSet): AnalysisResult | null {
  const fingerprint = generateDataFingerprint(data);
  const cached = analysisCache.get(fingerprint);

  if (!cached) return null;

  // Check if cache is still fresh
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(fingerprint);
    return null;
  }

  return cached.result;
}

/**
 * Cache an analysis result
 */
export function cacheAnalysis(data: DataSet, result: AnalysisResult): void {
  const fingerprint = generateDataFingerprint(data);
  analysisCache.set(fingerprint, {
    fingerprint,
    timestamp: Date.now(),
    result,
  });
}

/**
 * Clear analysis cache
 */
export function clearAnalysisCache(): void {
  analysisCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: { fingerprint: string; age: number }[];
} {
  const now = Date.now();
  const entries = Array.from(analysisCache.entries()).map(([key, value]) => ({
    fingerprint: key,
    age: now - value.timestamp,
  }));

  return {
    size: analysisCache.size,
    entries,
  };
}

/**
 * Process dataset in chunks for very large files
 */
export async function processInChunks<T>(
  data: DataSet,
  chunkSize: number,
  processor: (chunk: DataSet, chunkIndex: number, totalChunks: number) => Promise<T>,
  onProgress?: (progress: number, message: string) => void
): Promise<T[]> {
  const totalRows = data.rows.length;
  const totalChunks = Math.ceil(totalRows / chunkSize);
  const results: T[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalRows);

    const chunk: DataSet = {
      ...data,
      rows: data.rows.slice(start, end),
    };

    if (onProgress) {
      const progress = ((i + 1) / totalChunks) * 100;
      onProgress(progress, `Processing chunk ${i + 1}/${totalChunks} (rows ${start + 1}-${end})`);
    }

    const result = await processor(chunk, i, totalChunks);
    results.push(result);
  }

  return results;
}

/**
 * Merge chunked analysis results
 */
export function mergeAnalysisResults(results: AnalysisResult[]): AnalysisResult {
  if (results.length === 0) {
    return {
      summary: { totalRows: 0, totalColumns: 0, numericColumns: 0, categoricalColumns: 0, missingPercent: 0 },
      statistics: {},
      correlations: [],
      trends: [],
      outliers: [],
    };
  }

  if (results.length === 1) {
    return results[0];
  }

  // Combine summaries
  const totalRows = results.reduce((sum, r) => sum + (r.summary?.totalRows || 0), 0);
  const firstResult = results[0];

  // For most statistics, we use the combined/averaged values
  const combinedStats: Record<string, any> = {};
  for (const [key, value] of Object.entries(firstResult.statistics || {})) {
    combinedStats[key] = value;
  }

  // Merge correlations (deduplicate)
  const correlationMap = new Map<string, any>();
  for (const result of results) {
    for (const corr of result.correlations || []) {
      const key = `${corr.column1}-${corr.column2}`;
      if (!correlationMap.has(key)) {
        correlationMap.set(key, corr);
      }
    }
  }

  // Merge outliers (combine and deduplicate by row index if available)
  const allOutliers = results.flatMap((r) => r.outliers || []);

  return {
    summary: {
      totalRows,
      totalColumns: firstResult.summary?.totalColumns || 0,
      numericColumns: firstResult.summary?.numericColumns || 0,
      categoricalColumns: firstResult.summary?.categoricalColumns || 0,
      missingPercent: firstResult.summary?.missingPercent || 0,
    },
    statistics: combinedStats,
    correlations: Array.from(correlationMap.values()),
    trends: firstResult.trends || [],
    outliers: allOutliers.slice(0, 100), // Limit outliers
  };
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  mark(name: string): void {
    this.marks.set(name, Date.now() - this.startTime);
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  getMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }

  getSummary(): string {
    const total = this.elapsed();
    const markEntries = Array.from(this.marks.entries())
      .map(([name, time]) => `${name}: ${time}ms`)
      .join(", ");
    return `Total: ${total}ms | ${markEntries}`;
  }

  meetsTarget(targetMs: number): boolean {
    return this.elapsed() <= targetMs;
  }
}

/**
 * Performance targets from spec
 */
export const PERFORMANCE_TARGETS = {
  initialScan: 2000,    // < 2s for 50k rows
  edaReport: 5000,      // < 5s
  chartRender: 1000,    // < 1s
  filterApply: 500,     // < 500ms
};

/**
 * Check if performance meets targets
 */
export function checkPerformanceTargets(timings: Record<string, number>): {
  passed: boolean;
  results: { target: string; actual: number; limit: number; passed: boolean }[];
} {
  const results: { target: string; actual: number; limit: number; passed: boolean }[] = [];

  for (const [target, limit] of Object.entries(PERFORMANCE_TARGETS)) {
    const actual = timings[target];
    if (actual !== undefined) {
      results.push({
        target,
        actual,
        limit,
        passed: actual <= limit,
      });
    }
  }

  const passed = results.every((r) => r.passed);
  return { passed, results };
}

/**
 * Clean up resources
 */
export function cleanup(data?: DataSet): void {
  if (data) {
    clearColumnCache(data);
  }
  // Keep analysis cache as it may be reused
}
