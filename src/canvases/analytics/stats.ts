// Statistical Analysis Functions for Kowalski Analytics
// "Kowalski, crunch the numbers!"

import type {
  DataSet,
  AnalysisResult,
  Statistics,
  ColumnStats,
  Correlation,
  Trend,
  DataSummary,
  ChartConfig,
  KPI,
  Outlier,
} from "./types";
import { getNumericColumnValues, getColumnValues, cacheColumnData } from "./data-loader";
import { getCorrelationStrength } from "./types";

/**
 * Calculate basic statistics for a numeric array
 */
export function calculateStats(values: number[]): {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  sum: number;
  percentiles: { p25: number; p50: number; p75: number };
} {
  if (values.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      std: 0,
      sum: 0,
      percentiles: { p25: 0, p50: 0, p75: 0 },
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const min = sorted[0];
  const max = sorted[count - 1];

  // Median
  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

  // Standard deviation
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const std = Math.sqrt(variance);

  // Percentiles
  const p25 = sorted[Math.floor(count * 0.25)];
  const p50 = median;
  const p75 = sorted[Math.floor(count * 0.75)];

  return { count, mean, median, min, max, std, sum, percentiles: { p25, p50, p75 } };
}

/**
 * Calculate statistics for categorical data
 */
export function calculateCategoricalStats(values: (string | number | null)[]): {
  count: number;
  nullCount: number;
  uniqueValues: number;
  topValues: { value: string; count: number }[];
} {
  const counts = new Map<string, number>();
  let nullCount = 0;

  for (const val of values) {
    if (val === null) {
      nullCount++;
    } else {
      const key = String(val);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const topValues = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  return {
    count: values.length,
    nullCount,
    uniqueValues: counts.size,
    topValues,
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculate Cramér's V for categorical-categorical correlation
 * Measures association between two categorical variables
 * Returns value between 0 (no association) and 1 (perfect association)
 */
export function calculateCramersV(
  x: (string | number | null)[],
  y: (string | number | null)[]
): number {
  if (x.length !== y.length || x.length < 2) return 0;

  // Build contingency table
  const contingencyTable = new Map<string, Map<string, number>>();
  const xValues = new Set<string>();
  const yValues = new Set<string>();
  let n = 0;

  for (let i = 0; i < x.length; i++) {
    if (x[i] === null || y[i] === null) continue;

    const xVal = String(x[i]);
    const yVal = String(y[i]);

    xValues.add(xVal);
    yValues.add(yVal);

    if (!contingencyTable.has(xVal)) {
      contingencyTable.set(xVal, new Map());
    }
    const row = contingencyTable.get(xVal)!;
    row.set(yVal, (row.get(yVal) || 0) + 1);
    n++;
  }

  if (n === 0) return 0;

  const numRows = xValues.size;
  const numCols = yValues.size;

  if (numRows < 2 || numCols < 2) return 0;

  // Calculate row and column totals
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();

  for (const xVal of xValues) {
    let rowTotal = 0;
    const row = contingencyTable.get(xVal);
    if (row) {
      for (const yVal of yValues) {
        const count = row.get(yVal) || 0;
        rowTotal += count;
        colTotals.set(yVal, (colTotals.get(yVal) || 0) + count);
      }
    }
    rowTotals.set(xVal, rowTotal);
  }

  // Calculate chi-squared statistic
  let chiSquared = 0;
  for (const xVal of xValues) {
    const row = contingencyTable.get(xVal);
    const rowTotal = rowTotals.get(xVal) || 0;

    for (const yVal of yValues) {
      const observed = row?.get(yVal) || 0;
      const colTotal = colTotals.get(yVal) || 0;
      const expected = (rowTotal * colTotal) / n;

      if (expected > 0) {
        chiSquared += Math.pow(observed - expected, 2) / expected;
      }
    }
  }

  // Calculate Cramér's V
  const minDim = Math.min(numRows - 1, numCols - 1);
  if (minDim === 0) return 0;

  const v = Math.sqrt(chiSquared / (n * minDim));
  return Math.min(v, 1); // Clamp to [0, 1]
}

/**
 * Calculate point-biserial correlation for numeric-categorical pairs
 * Measures correlation between a continuous variable and a binary variable
 * For multi-category variables, calculates against the most common category
 */
export function calculatePointBiserial(
  numeric: number[],
  categorical: (string | number | null)[]
): number {
  if (numeric.length !== categorical.length || numeric.length < 2) return 0;

  // Find the most common category (or use binary if only 2)
  const counts = new Map<string, number>();
  for (const cat of categorical) {
    if (cat !== null) {
      const key = String(cat);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const categories = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (categories.length < 2) return 0;

  // Use the most common category as group 1, rest as group 0
  const targetCategory = categories[0][0];

  // Split numeric values by group
  const group1: number[] = [];
  const group0: number[] = [];

  for (let i = 0; i < numeric.length; i++) {
    if (categorical[i] === null || isNaN(numeric[i])) continue;

    if (String(categorical[i]) === targetCategory) {
      group1.push(numeric[i]);
    } else {
      group0.push(numeric[i]);
    }
  }

  if (group0.length === 0 || group1.length === 0) return 0;

  const n = group0.length + group1.length;
  const n0 = group0.length;
  const n1 = group1.length;

  // Calculate means
  const mean0 = group0.reduce((a, b) => a + b, 0) / n0;
  const mean1 = group1.reduce((a, b) => a + b, 0) / n1;

  // Calculate pooled standard deviation
  const allValues = [...group0, ...group1];
  const totalMean = allValues.reduce((a, b) => a + b, 0) / n;
  const variance = allValues.reduce((acc, v) => acc + Math.pow(v - totalMean, 2), 0) / n;
  const std = Math.sqrt(variance);

  if (std === 0) return 0;

  // Point-biserial correlation formula
  const rpb = ((mean1 - mean0) / std) * Math.sqrt((n0 * n1) / (n * n));
  return Math.max(-1, Math.min(1, rpb)); // Clamp to [-1, 1]
}

/**
 * Calculate Z-score for a value given mean and standard deviation
 */
export function calculateZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Detect outliers using Z-score method
 * Default threshold is 3 standard deviations from the mean
 */
export function detectOutliersZScore(
  values: number[],
  threshold: number = 3
): { indices: number[]; zscores: number[] } {
  if (values.length < 3) return { indices: [], zscores: [] };

  const stats = calculateStats(values);
  const { mean, std } = stats;

  if (std === 0) return { indices: [], zscores: [] };

  const indices: number[] = [];
  const zscores: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const zscore = calculateZScore(values[i], mean, std);
    if (Math.abs(zscore) > threshold) {
      indices.push(i);
      zscores.push(zscore);
    }
  }

  return { indices, zscores };
}

/**
 * Detect trend in time series data
 */
export function detectTrend(values: number[]): {
  direction: "up" | "down" | "stable";
  changePercent: number;
  slope: number;
} {
  if (values.length < 2) {
    return { direction: "stable", changePercent: 0, slope: 0 };
  }

  // Simple linear regression
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Calculate percent change
  // Calculate percent change
  const startSlice = values.slice(0, Math.ceil(n / 4));
  const endSlice = values.slice(-Math.ceil(n / 4));

  const first = startSlice.reduce((a, b) => a + b, 0) / startSlice.length;
  const last = endSlice.reduce((a, b) => a + b, 0) / endSlice.length;

  let changePercent = 0;
  if (first === 0) {
    if (last !== 0) {
      // If started at 0 and changed, use mean as base or 100% if mean is 0
      const base = Math.abs(yMean) > 0 ? Math.abs(yMean) : 1;
      changePercent = ((last - first) / base) * 100;
    }
  } else {
    changePercent = ((last - first) / Math.abs(first)) * 100;
  }

  // Determine direction based on significance
  const threshold = Math.abs(yMean) * 0.05; // 5% threshold
  let direction: "up" | "down" | "stable";

  if (slope > threshold / n) {
    direction = "up";
  } else if (slope < -threshold / n) {
    direction = "down";
  } else {
    direction = "stable";
  }

  return { direction, changePercent, slope };
}

import type { ChangePoint, SeasonalityResult } from "./types";

/**
 * Detect change points in time series data using CUSUM-like approach
 * Returns points where the mean level significantly shifts
 */
export function detectChangePoints(
  values: number[],
  minSegmentSize: number = 5,
  threshold: number = 2.0
): ChangePoint[] {
  if (values.length < minSegmentSize * 2) return [];

  const changePoints: ChangePoint[] = [];
  const n = values.length;

  // Calculate overall statistics
  const overallMean = values.reduce((a, b) => a + b, 0) / n;
  const overallVariance = values.reduce((acc, v) => acc + Math.pow(v - overallMean, 2), 0) / n;
  const overallStd = Math.sqrt(overallVariance);

  if (overallStd === 0) return [];

  // Test each potential change point
  for (let i = minSegmentSize; i < n - minSegmentSize; i++) {
    const before = values.slice(0, i);
    const after = values.slice(i);

    const beforeMean = before.reduce((a, b) => a + b, 0) / before.length;
    const afterMean = after.reduce((a, b) => a + b, 0) / after.length;

    // Calculate significance using pooled variance estimate
    const beforeVar = before.reduce((acc, v) => acc + Math.pow(v - beforeMean, 2), 0) / before.length;
    const afterVar = after.reduce((acc, v) => acc + Math.pow(v - afterMean, 2), 0) / after.length;

    const pooledStd = Math.sqrt(
      ((before.length - 1) * beforeVar + (after.length - 1) * afterVar) /
      (before.length + after.length - 2)
    );

    if (pooledStd === 0) continue;

    // Calculate t-statistic-like significance measure
    const standardError = pooledStd * Math.sqrt(1 / before.length + 1 / after.length);
    const significance = Math.abs(afterMean - beforeMean) / standardError;

    if (significance > threshold) {
      changePoints.push({
        index: i,
        beforeMean,
        afterMean,
        significance,
        direction: afterMean > beforeMean ? "increase" : "decrease",
      });
    }
  }

  // Filter to keep only the most significant change points (avoid duplicates near each other)
  const filtered: ChangePoint[] = [];
  changePoints.sort((a, b) => b.significance - a.significance);

  for (const cp of changePoints) {
    const tooClose = filtered.some(
      (existing) => Math.abs(existing.index - cp.index) < minSegmentSize
    );
    if (!tooClose) {
      filtered.push(cp);
    }
  }

  return filtered.sort((a, b) => a.index - b.index);
}

/**
 * Detect seasonality in time series data using autocorrelation
 * Looks for repeating patterns at regular intervals
 */
export function detectSeasonality(
  values: number[],
  maxPeriod?: number
): SeasonalityResult {
  const n = values.length;

  if (n < 8) {
    return { detected: false, description: "Insufficient data for seasonality analysis" };
  }

  // Default max period to half the data length (need at least 2 cycles)
  const effectiveMaxPeriod = maxPeriod || Math.floor(n / 2);
  const minPeriod = 2;

  // Calculate mean and variance
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;

  if (variance === 0) {
    return { detected: false, description: "No variance in data" };
  }

  // Calculate autocorrelation for different lags
  const autocorrelations: { lag: number; acf: number }[] = [];

  for (let lag = minPeriod; lag <= effectiveMaxPeriod; lag++) {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < n - lag; i++) {
      sum += (values[i] - mean) * (values[i + lag] - mean);
      count++;
    }

    if (count > 0) {
      const acf = sum / (count * variance);
      autocorrelations.push({ lag, acf });
    }
  }

  if (autocorrelations.length === 0) {
    return { detected: false, description: "Could not compute autocorrelation" };
  }

  // Find peaks in autocorrelation (potential seasonal periods)
  const peaks: { lag: number; acf: number }[] = [];

  for (let i = 1; i < autocorrelations.length - 1; i++) {
    const prev = autocorrelations[i - 1].acf;
    const curr = autocorrelations[i].acf;
    const next = autocorrelations[i + 1].acf;

    // Peak detection with significance threshold
    if (curr > prev && curr > next && curr > 0.3) {
      peaks.push(autocorrelations[i]);
    }
  }

  if (peaks.length === 0) {
    return { detected: false, description: "No significant seasonal pattern detected" };
  }

  // Sort peaks by autocorrelation strength
  peaks.sort((a, b) => b.acf - a.acf);
  const bestPeak = peaks[0];

  // Verify the period by checking for harmonics
  const period = bestPeak.lag;
  let harmonicScore = 0;

  // Check if autocorrelation at 2x period is also high (confirms pattern)
  const doublePeroidAcf = autocorrelations.find((a) => a.lag === period * 2);
  if (doublePeroidAcf && doublePeroidAcf.acf > 0.2) {
    harmonicScore += 1;
  }

  // Find peak indices in the original data
  const peakIndices: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
      peakIndices.push(i);
    }
  }

  // Generate description
  let description = `Seasonal pattern detected with period ${period}`;
  if (period === 7) description += " (weekly)";
  else if (period === 12) description += " (monthly for yearly data)";
  else if (period === 4) description += " (quarterly)";
  else if (period === 24) description += " (hourly for daily data)";

  return {
    detected: true,
    period,
    strength: bestPeak.acf,
    peaks: peakIndices.slice(0, 10), // Return first 10 peaks
    description,
  };
}

/**
 * Full analysis of a dataset
 */
export function analyzeDataSet(data: DataSet): AnalysisResult {
  // Pre-cache all column data for performance
  cacheColumnData(data);

  const { columns, rows, types } = data;

  // Count column types
  let numericColumns = 0;
  let categoricalColumns = 0;
  let totalNulls = 0;
  const totalCells = rows.length * columns.length;

  // Summary
  const summary: DataSummary = {
    totalRows: rows.length,
    totalColumns: columns.length,
    numericColumns: 0,
    categoricalColumns: 0,
    missingPercent: 0,
    duplicateRows: 0,
    nullCounts: {},
    uniqueCounts: {},
  };

  // Statistics per column
  const statistics: Statistics = {};

  for (let i = 0; i < columns.length; i++) {
    const colName = columns[i];
    const colType = types?.[i] || "string";
    const values = getColumnValues(data, i);

    // Count nulls
    const nullCount = values.filter((v) => v === null).length;
    summary.nullCounts![colName] = nullCount;
    totalNulls += nullCount;

    // Count unique
    summary.uniqueCounts![colName] = new Set(values.filter((v) => v !== null)).size;

    if (colType === "number") {
      numericColumns++;
      const numericValues = getNumericColumnValues(data, i);
      const stats = calculateStats(numericValues);

      statistics[colName] = {
        type: "numeric",
        count: stats.count,
        nullCount: nullCount,
        mean: stats.mean,
        median: stats.median,
        min: stats.min,
        max: stats.max,
        std: stats.std,
        q1: stats.percentiles.p25,
        q3: stats.percentiles.p75,
        percentiles: stats.percentiles,
      };
    } else {
      categoricalColumns++;
      const catStats = calculateCategoricalStats(values);

      statistics[colName] = {
        type: "categorical",
        count: catStats.count,
        nullCount: catStats.nullCount,
        uniqueCount: catStats.uniqueValues,
        uniqueValues: catStats.uniqueValues,
        topValues: catStats.topValues,
      };
    }
  }

  // Update summary
  summary.numericColumns = numericColumns;
  summary.categoricalColumns = categoricalColumns;
  summary.missingPercent = totalCells > 0 ? totalNulls / totalCells : 0;

  // Count duplicate rows efficiently (avoid JSON.stringify)
  const rowHashes = new Set<string>();
  let duplicateCount = 0;
  for (const row of rows) {
    // Create a simple hash string instead of JSON.stringify
    const hash = row.map(v => v === null ? '∅' : String(v)).join('|');
    if (rowHashes.has(hash)) {
      duplicateCount++;
    } else {
      rowHashes.add(hash);
    }
  }
  summary.duplicateRows = duplicateCount;

  // Correlations (optimized single-pass calculation)
  const numericCols = columns.filter((_, i) => types?.[i] === "number");
  const correlations: Correlation[] = [];

  if (numericCols.length >= 2) {
    // Pre-fetch all numeric column data
    const numericData: number[][] = numericCols.map(col => {
      const idx = columns.indexOf(col);
      return getNumericColumnValues(data, idx);
    });

    // Pre-compute sums for each column
    const sums = numericData.map(arr => arr.reduce((a, b) => a + b, 0));
    const sumsSq = numericData.map(arr => arr.reduce((a, b) => a + b * b, 0));
    const counts = numericData.map(arr => arr.length);

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        // Align arrays - only use rows where both have values
        const vals1: number[] = [];
        const vals2: number[] = [];

        for (let k = 0; k < rows.length; k++) {
          const v1 = rows[k][columns.indexOf(numericCols[i])];
          const v2 = rows[k][columns.indexOf(numericCols[j])];
          if (typeof v1 === "number" && typeof v2 === "number") {
            vals1.push(v1);
            vals2.push(v2);
          }
        }

        if (vals1.length >= 3) {
          // Use the aligned arrays for correlation
          const n = vals1.length;
          const sumX = vals1.reduce((a, b) => a + b, 0);
          const sumY = vals2.reduce((a, b) => a + b, 0);
          const sumXY = vals1.reduce((acc, xi, idx) => acc + xi * vals2[idx], 0);
          const sumX2 = vals1.reduce((acc, xi) => acc + xi * xi, 0);
          const sumY2 = vals2.reduce((acc, yi) => acc + yi * yi, 0);

          const numerator = n * sumXY - sumX * sumY;
          const denominator = Math.sqrt(
            (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
          );

          if (denominator !== 0) {
            const value = numerator / denominator;
            correlations.push({
              column1: numericCols[i],
              column2: numericCols[j],
              value,
              strength: getCorrelationStrength(value),
            });
          }
        }
      }
    }
  }

  // Sort correlations by absolute value
  correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  // Trends (for numeric columns)
  const trends: Trend[] = [];

  for (const col of numericCols) {
    const idx = columns.indexOf(col);
    const values = getNumericColumnValues(data, idx);

    if (values.length >= 5) {
      const trend = detectTrend(values);
      if (trend.direction !== "stable" || Math.abs(trend.changePercent) > 5) {
        trends.push({
          column: col,
          direction: trend.direction,
          changePercent: trend.changePercent,
          description: describeTrend(col, trend),
        });
      }
    }
  }

  // Detect outliers using IQR method
  const outliers: Outlier[] = [];

  for (const col of numericCols) {
    const idx = columns.indexOf(col);
    const stats = statistics[col];

    if (stats.type === "numeric" && stats.q1 !== undefined && stats.q3 !== undefined) {
      const iqr = stats.q3 - stats.q1;
      const lowerBound = stats.q1 - 1.5 * iqr;
      const upperBound = stats.q3 + 1.5 * iqr;

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const value = rows[rowIdx][idx];
        if (typeof value === "number") {
          if (value < lowerBound || value > upperBound) {
            // Calculate z-score
            const zscore = stats.std && stats.std > 0
              ? (value - (stats.mean || 0)) / stats.std
              : 0;

            outliers.push({
              column: col,
              rowIndex: rowIdx,
              value,
              expectedMin: lowerBound,
              expectedMax: upperBound,
              zscore,
            });
          }
        }
      }
    }
  }

  // Sort outliers by z-score (most extreme first)
  outliers.sort((a, b) => Math.abs(b.zscore || 0) - Math.abs(a.zscore || 0));

  return { summary, statistics, correlations, trends, outliers };
}

/**
 * Generate human-readable trend description
 */
function describeTrend(
  column: string,
  trend: { direction: "up" | "down" | "stable"; changePercent: number }
): string {
  const absChange = Math.abs(trend.changePercent).toFixed(1);

  if (trend.direction === "up") {
    return `${column} shows upward trend (+${absChange}%)`;
  } else if (trend.direction === "down") {
    return `${column} shows downward trend (-${absChange}%)`;
  } else {
    return `${column} remains stable`;
  }
}

/**
 * Generate insights from analysis
 */
export function generateInsights(data: DataSet, analysis: AnalysisResult): string[] {
  const insights: string[] = [];
  const { summary, statistics, correlations, trends } = analysis;

  // Data quality insight
  const nullColumns = Object.entries(summary?.nullCounts || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (nullColumns.length > 0) {
    const [col, count] = nullColumns[0];
    const percent = ((count / summary!.totalRows) * 100).toFixed(1);
    insights.push(`"${col}" has ${percent}% missing values - consider data cleaning`);
  }

  // Top correlations
  const strongCorr = correlations?.filter((c) => c.strength === "strong")[0];
  if (strongCorr) {
    const sign = strongCorr.value > 0 ? "positive" : "negative";
    insights.push(
      `Strong ${sign} correlation (${strongCorr.value.toFixed(2)}) between "${strongCorr.column1}" and "${strongCorr.column2}"`
    );
  }

  // Trends
  const significantTrends = trends?.filter((t) => Math.abs(t.changePercent) > 10);
  if (significantTrends && significantTrends.length > 0) {
    for (const trend of significantTrends.slice(0, 2)) {
      insights.push(trend.description);
    }
  }

  // Outliers (using IQR)
  for (const [colName, stats] of Object.entries(statistics || {})) {
    if (stats.type === "numeric" && stats.percentiles) {
      const { p25, p75 } = stats.percentiles;
      const iqr = p75 - p25;
      const lowerBound = p25 - 1.5 * iqr;
      const upperBound = p75 + 1.5 * iqr;

      if (stats.min! < lowerBound || stats.max! > upperBound) {
        insights.push(`"${colName}" may contain outliers (range: ${stats.min?.toFixed(0)} - ${stats.max?.toFixed(0)})`);
        break; // Only report first outlier column
      }
    }
  }

  // Categorical insights
  for (const [colName, stats] of Object.entries(statistics || {})) {
    if (stats.type === "categorical" && stats.topValues && stats.topValues.length > 0) {
      const top = stats.topValues[0];
      const percent = ((top.count / stats.count) * 100).toFixed(1);
      if (parseFloat(percent) > 50) {
        insights.push(`"${colName}" is dominated by "${top.value}" (${percent}%)`);
        break;
      }
    }
  }

  return insights.slice(0, 5); // Limit to 5 insights
}

/**
 * Auto-generate charts based on data analysis
 */
export function generateCharts(data: DataSet, analysis: AnalysisResult): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const { columns, rows, types } = data;
  const { statistics } = analysis;

  // Find numeric and categorical columns
  const numericCols = columns.filter((_, i) => types?.[i] === "number");
  const categoricalCols = columns.filter((_, i) => types?.[i] !== "number");

  // Line chart for first numeric column (if looks like time series)
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const idx = columns.indexOf(col);
    const values = getNumericColumnValues(data, idx);

    if (values.length >= 5) {
      charts.push({
        type: "line",
        title: `${col} Trend`,
        data: { values: values.slice(0, 50) }, // Limit points
      });
    }
  }

  // Bar chart for categorical column
  if (categoricalCols.length > 0 && statistics) {
    const col = categoricalCols[0];
    const stats = statistics[col];

    if (stats?.topValues && stats.topValues.length > 0) {
      charts.push({
        type: "bar",
        title: `${col} Distribution`,
        data: {
          labels: stats.topValues.slice(0, 8).map((v) => v.value),
          values: stats.topValues.slice(0, 8).map((v) => v.count),
        },
      });
    }
  }

  // Horizontal bar for second numeric column
  if (numericCols.length > 1 && categoricalCols.length > 0) {
    const numCol = numericCols[1];
    const catCol = categoricalCols[0];
    const numIdx = columns.indexOf(numCol);
    const catIdx = columns.indexOf(catCol);

    // Aggregate by category
    const aggregated = new Map<string, number[]>();

    for (const row of rows) {
      const cat = String(row[catIdx] || "Unknown");
      const val = row[numIdx];

      if (typeof val === "number") {
        if (!aggregated.has(cat)) aggregated.set(cat, []);
        aggregated.get(cat)!.push(val);
      }
    }

    const sorted = Array.from(aggregated.entries())
      .map(([label, vals]) => ({
        label,
        value: vals.reduce((a, b) => a + b, 0) / vals.length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    if (sorted.length > 0) {
      charts.push({
        type: "horizontal-bar",
        title: `Avg ${numCol} by ${catCol}`,
        data: {
          labels: sorted.map((s) => s.label),
          values: sorted.map((s) => s.value),
        },
      });
    }
  }

  // Pie chart for categorical distribution
  if (categoricalCols.length > 0 && statistics) {
    const col = categoricalCols[Math.min(1, categoricalCols.length - 1)];
    const stats = statistics[col];

    if (stats?.topValues && stats.topValues.length >= 2) {
      charts.push({
        type: "pie",
        title: `${col} Breakdown`,
        data: {
          labels: stats.topValues.slice(0, 5).map((v) => v.value),
          values: stats.topValues.slice(0, 5).map((v) => v.count),
        },
      });
    }
  }

  return charts.slice(0, 4); // Limit to 4 charts for dashboard
}

/**
 * Generate KPIs from analysis
 */
export function generateKPIs(data: DataSet, analysis: AnalysisResult): KPI[] {
  const kpis: KPI[] = [];
  const { summary, statistics, trends } = analysis;

  // Total rows
  kpis.push({
    label: "Total Records",
    value: summary?.totalRows.toLocaleString() || "0",
  });

  // Find key numeric column (revenue, sales, amount, etc.)
  const keyColumns = ["revenue", "sales", "amount", "total", "value", "price"];
  const numericCols = Object.entries(statistics || {}).filter(
    ([_, stats]) => stats.type === "numeric"
  );

  const keyCol = numericCols.find(([name]) =>
    keyColumns.some((k) => name.toLowerCase().includes(k))
  ) || numericCols[0];

  if (keyCol) {
    const [name, stats] = keyCol;
    const trend = trends?.find((t) => t.column === name);

    kpis.push({
      label: `Total ${name}`,
      value: (stats.mean! * stats.count).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      change: trend ? trend.changePercent / 100 : undefined,
      changeType: trend
        ? trend.direction === "up"
          ? "increase"
          : trend.direction === "down"
            ? "decrease"
            : "neutral"
        : undefined,
    });

    kpis.push({
      label: `Avg ${name}`,
      value: stats.mean!.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
    });
  }

  // Add a categorical count if available
  const catCol = Object.entries(statistics || {}).find(
    ([_, stats]) => stats.type === "categorical"
  );

  if (catCol) {
    const [name, stats] = catCol;
    kpis.push({
      label: `Unique ${name}`,
      value: stats.uniqueValues?.toLocaleString() || "0",
    });
  }

  return kpis.slice(0, 4); // Limit to 4 KPIs
}
