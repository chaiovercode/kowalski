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
import { getNumericColumnValues, getColumnValues } from "./data-loader";
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

/**
 * Full analysis of a dataset
 */
export function analyzeDataSet(data: DataSet): AnalysisResult {
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

  // Count duplicate rows
  const rowStrings = rows.map(row => JSON.stringify(row));
  const uniqueRows = new Set(rowStrings);
  summary.duplicateRows = rows.length - uniqueRows.size;

  // Correlations (numeric columns only)
  const numericCols = columns.filter((_, i) => types?.[i] === "number");
  const correlations: Correlation[] = [];

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const col1 = numericCols[i];
      const col2 = numericCols[j];
      const idx1 = columns.indexOf(col1);
      const idx2 = columns.indexOf(col2);

      const vals1 = getNumericColumnValues(data, idx1);
      const vals2 = getNumericColumnValues(data, idx2);

      // Align arrays (only use rows where both have values)
      const aligned1: number[] = [];
      const aligned2: number[] = [];

      for (let k = 0; k < rows.length; k++) {
        const v1 = rows[k][idx1];
        const v2 = rows[k][idx2];
        if (typeof v1 === "number" && typeof v2 === "number") {
          aligned1.push(v1);
          aligned2.push(v2);
        }
      }

      if (aligned1.length >= 3) {
        const value = calculateCorrelation(aligned1, aligned2);
        correlations.push({
          column1: col1,
          column2: col2,
          value,
          strength: getCorrelationStrength(value),
        });
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
