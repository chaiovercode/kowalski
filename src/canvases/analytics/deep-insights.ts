// Kowalski Deep Insights Engine
// "Skipper, I've found something you need to see."
//
// This is the brain of Kowalski - goes beyond basic stats to find
// real stories, anomalies, and actionable insights in data.

import type { DataSet, ColumnStatistics, Correlation, AnalysisResult } from "./types";
import type { EDAReport, EDAFinding } from "./insights";

// ============================================
// Types
// ============================================

export interface DeepInsight {
  id: string;
  type: InsightType;
  severity: "critical" | "warning" | "info" | "success";
  confidence: number; // 0-100
  title: string;
  description: string;
  details: string[];
  evidence: Evidence[];
  recommendation?: string;
  affectedRows?: number[];
  affectedColumns?: string[];
}

export type InsightType =
  | "anomaly"           // Something unexpected
  | "pattern"           // Recurring behavior
  | "correlation"       // Relationship between variables
  | "trend"             // Directional movement
  | "segment"           // Natural grouping
  | "quality"           // Data quality issue
  | "opportunity"       // Actionable finding
  | "risk"              // Potential problem
  | "story";            // Narrative insight

export interface Evidence {
  type: "statistic" | "example" | "comparison" | "visualization";
  label: string;
  value: string | number;
  context?: string;
}

export interface DataStory {
  headline: string;
  summary: string;
  keyFindings: string[];
  surprises: string[];
  questions: string[];
  nextSteps: string[];
}

export interface DeepAnalysisResult {
  insights: DeepInsight[];
  story: DataStory;
  recommendations: Recommendation[];
  dataQuality: DataQualityReport;
  segments?: Segment[];
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  action: string;
  reason: string;
  impact: string;
}

export interface DataQualityReport {
  score: number; // 0-100
  issues: QualityIssue[];
  summary: string;
}

export interface QualityIssue {
  type: "missing" | "inconsistent" | "outlier" | "duplicate" | "format" | "suspicious";
  column?: string;
  severity: "critical" | "warning" | "info";
  description: string;
  affectedCount: number;
  suggestion: string;
}

export interface Segment {
  name: string;
  description: string;
  size: number;
  characteristics: string[];
  distinctiveFeatures: string[];
}

// ============================================
// Deep Analysis Engine
// ============================================

/**
 * Run deep analysis on a dataset
 * This is the main entry point for intelligent insights
 */
export function runDeepAnalysis(
  data: DataSet,
  analysis: AnalysisResult,
  edaReport?: EDAReport
): DeepAnalysisResult {
  const insights: DeepInsight[] = [];

  // 1. Data Quality Analysis
  const dataQuality = analyzeDataQuality(data, analysis);
  insights.push(...dataQuality.issues.map(issueToInsight));

  // 2. Anomaly Detection
  insights.push(...detectAnomalies(data, analysis));

  // 3. Pattern Discovery
  insights.push(...discoverPatterns(data, analysis));

  // 4. Correlation Insights (beyond just numbers)
  insights.push(...analyzeCorrelations(data, analysis));

  // 5. Trend Analysis
  insights.push(...analyzeTrends(data, analysis));

  // 6. Segmentation
  const segments = findSegments(data, analysis);
  insights.push(...segments.map(segmentToInsight));

  // 7. Generate Story
  const story = generateDataStory(data, analysis, insights);

  // 8. Generate Recommendations
  const recommendations = generateRecommendations(insights, dataQuality);

  // Sort insights by importance
  insights.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, success: 2, info: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.confidence - a.confidence;
  });

  return {
    insights,
    story,
    recommendations,
    dataQuality,
    segments: segments.length > 0 ? segments : undefined,
  };
}

// ============================================
// Data Quality Analysis
// ============================================

function analyzeDataQuality(data: DataSet, analysis: AnalysisResult): DataQualityReport {
  const issues: QualityIssue[] = [];
  let totalScore = 100;

  const { statistics } = analysis;
  const totalRows = data.rows.length;

  for (const [col, stats] of Object.entries(statistics)) {
    // Missing data
    if (stats.missing > 0) {
      const missingPct = (stats.missing / totalRows) * 100;
      const severity = missingPct > 20 ? "critical" : missingPct > 5 ? "warning" : "info";

      issues.push({
        type: "missing",
        column: col,
        severity,
        description: `${missingPct.toFixed(1)}% missing values in "${col}"`,
        affectedCount: stats.missing,
        suggestion: missingPct > 50
          ? `Consider dropping "${col}" or investigating why data is missing`
          : `Impute missing values or filter rows with missing "${col}"`,
      });

      totalScore -= Math.min(missingPct, 20);
    }

    // Suspicious patterns in numeric data
    if (stats.type === "numeric") {
      // Check for suspiciously round numbers (might indicate estimates)
      const roundNumberRatio = detectRoundNumbers(data, col);
      if (roundNumberRatio > 0.8) {
        issues.push({
          type: "suspicious",
          column: col,
          severity: "info",
          description: `${(roundNumberRatio * 100).toFixed(0)}% of "${col}" values are round numbers`,
          affectedCount: Math.floor(totalRows * roundNumberRatio),
          suggestion: "This might indicate estimated or placeholder values",
        });
      }

      // Check for outliers
      if (stats.outliers && stats.outliers.length > 0) {
        const outlierPct = (stats.outliers.length / totalRows) * 100;
        issues.push({
          type: "outlier",
          column: col,
          severity: outlierPct > 5 ? "warning" : "info",
          description: `${stats.outliers.length} outliers detected in "${col}" (${outlierPct.toFixed(1)}%)`,
          affectedCount: stats.outliers.length,
          suggestion: "Review outliers - they may be errors or genuinely unusual observations",
        });
      }
    }

    // Check for inconsistent categorical values
    if (stats.type === "categorical" && stats.topValues) {
      const uniqueRatio = stats.unique / totalRows;
      if (uniqueRatio > 0.9 && totalRows > 100) {
        issues.push({
          type: "inconsistent",
          column: col,
          severity: "warning",
          description: `"${col}" has ${stats.unique} unique values for ${totalRows} rows - might be an ID column or have data issues`,
          affectedCount: stats.unique,
          suggestion: "Check if this should be categorical or if there are typos/variations",
        });
      }

      // Look for near-duplicates (case variations, typos)
      const nearDupes = findNearDuplicates(stats.topValues.map(v => String(v.value)));
      if (nearDupes.length > 0) {
        issues.push({
          type: "inconsistent",
          column: col,
          severity: "warning",
          description: `Possible inconsistent values in "${col}": ${nearDupes.slice(0, 3).map(d => `"${d[0]}" vs "${d[1]}"`).join(", ")}`,
          affectedCount: nearDupes.length * 2,
          suggestion: "Standardize these values for accurate analysis",
        });
        totalScore -= 5;
      }
    }
  }

  // Check for duplicate rows
  const duplicateRows = findDuplicateRows(data);
  if (duplicateRows > 0) {
    const dupePct = (duplicateRows / totalRows) * 100;
    issues.push({
      type: "duplicate",
      severity: dupePct > 10 ? "critical" : "warning",
      description: `${duplicateRows} duplicate rows detected (${dupePct.toFixed(1)}%)`,
      affectedCount: duplicateRows,
      suggestion: "Remove duplicates unless they represent valid repeated measurements",
    });
    totalScore -= Math.min(dupePct, 15);
  }

  const score = Math.max(0, Math.round(totalScore));
  const summary = score >= 90 ? "Excellent data quality - ready for analysis"
    : score >= 70 ? "Good data quality with minor issues to address"
    : score >= 50 ? "Moderate data quality - address issues before drawing conclusions"
    : "Significant data quality issues - clean data before analysis";

  return { score, issues, summary };
}

// ============================================
// Anomaly Detection
// ============================================

function detectAnomalies(data: DataSet, analysis: AnalysisResult): DeepInsight[] {
  const insights: DeepInsight[] = [];
  const { statistics } = analysis;

  for (const [col, stats] of Object.entries(statistics)) {
    if (stats.type !== "numeric") continue;

    // Detect distribution anomalies
    if (stats.skewness !== undefined) {
      if (Math.abs(stats.skewness) > 2) {
        insights.push({
          id: `anomaly-skew-${col}`,
          type: "anomaly",
          severity: "info",
          confidence: 85,
          title: `Highly skewed distribution in "${col}"`,
          description: stats.skewness > 0
            ? `"${col}" is heavily right-skewed (${stats.skewness.toFixed(2)}) - most values are low with some very high outliers`
            : `"${col}" is heavily left-skewed (${stats.skewness.toFixed(2)}) - most values are high with some very low outliers`,
          details: [
            `Mean (${stats.mean?.toFixed(2)}) differs significantly from median (${stats.median?.toFixed(2)})`,
            "Consider log transformation for analysis or using median instead of mean",
          ],
          evidence: [
            { type: "statistic", label: "Skewness", value: stats.skewness.toFixed(2) },
            { type: "statistic", label: "Mean", value: stats.mean?.toFixed(2) || "N/A" },
            { type: "statistic", label: "Median", value: stats.median?.toFixed(2) || "N/A" },
          ],
          recommendation: "Use median for central tendency and consider log transformation",
          affectedColumns: [col],
        });
      }
    }

    // Detect unusual value concentrations
    if (stats.min !== undefined && stats.max !== undefined && stats.mean !== undefined) {
      const range = stats.max - stats.min;
      const meanPosition = (stats.mean - stats.min) / range;

      if (meanPosition < 0.2 || meanPosition > 0.8) {
        insights.push({
          id: `anomaly-concentration-${col}`,
          type: "anomaly",
          severity: "info",
          confidence: 70,
          title: `Values concentrated at ${meanPosition < 0.5 ? "lower" : "upper"} end of "${col}"`,
          description: `Most values in "${col}" are clustered near the ${meanPosition < 0.5 ? "minimum" : "maximum"}`,
          details: [
            `Range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}`,
            `Mean at ${(meanPosition * 100).toFixed(0)}% of range`,
          ],
          evidence: [
            { type: "statistic", label: "Min", value: stats.min.toFixed(2) },
            { type: "statistic", label: "Max", value: stats.max.toFixed(2) },
            { type: "statistic", label: "Mean position", value: `${(meanPosition * 100).toFixed(0)}%` },
          ],
          affectedColumns: [col],
        });
      }
    }
  }

  // Detect row-level anomalies using Z-scores
  const rowAnomalies = detectRowAnomalies(data, analysis);
  if (rowAnomalies.length > 0) {
    insights.push({
      id: "anomaly-rows",
      type: "anomaly",
      severity: rowAnomalies.length > data.rows.length * 0.05 ? "warning" : "info",
      confidence: 80,
      title: `${rowAnomalies.length} anomalous rows detected`,
      description: "These rows have unusual combinations of values across multiple columns",
      details: [
        `Row indices: ${rowAnomalies.slice(0, 10).join(", ")}${rowAnomalies.length > 10 ? "..." : ""}`,
        "Review these rows for data entry errors or genuinely unusual cases",
      ],
      evidence: [
        { type: "statistic", label: "Anomalous rows", value: rowAnomalies.length },
        { type: "statistic", label: "Percentage", value: `${((rowAnomalies.length / data.rows.length) * 100).toFixed(1)}%` },
      ],
      recommendation: "Investigate these rows - they may reveal edge cases or errors",
      affectedRows: rowAnomalies,
    });
  }

  return insights;
}

// ============================================
// Pattern Discovery
// ============================================

function discoverPatterns(data: DataSet, analysis: AnalysisResult): DeepInsight[] {
  const insights: DeepInsight[] = [];
  const { statistics } = analysis;

  // Find columns with similar distributions
  const numericCols = Object.entries(statistics)
    .filter(([_, s]) => s.type === "numeric")
    .map(([col, _]) => col);

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const col1 = numericCols[i];
      const col2 = numericCols[j];
      const stats1 = statistics[col1];
      const stats2 = statistics[col2];

      // Check for similar scales
      if (stats1.mean && stats2.mean && stats1.std && stats2.std) {
        const meanRatio = stats1.mean / stats2.mean;
        const stdRatio = stats1.std / stats2.std;

        if (Math.abs(meanRatio - 1) < 0.1 && Math.abs(stdRatio - 1) < 0.2) {
          insights.push({
            id: `pattern-similar-${col1}-${col2}`,
            type: "pattern",
            severity: "info",
            confidence: 75,
            title: `"${col1}" and "${col2}" have similar distributions`,
            description: "These columns have very similar means and standard deviations",
            details: [
              `${col1}: mean=${stats1.mean.toFixed(2)}, std=${stats1.std.toFixed(2)}`,
              `${col2}: mean=${stats2.mean.toFixed(2)}, std=${stats2.std.toFixed(2)}`,
            ],
            evidence: [
              { type: "comparison", label: "Mean ratio", value: meanRatio.toFixed(2) },
              { type: "comparison", label: "Std ratio", value: stdRatio.toFixed(2) },
            ],
            recommendation: "Check if these columns are measuring the same thing or are derived from each other",
            affectedColumns: [col1, col2],
          });
        }
      }
    }
  }

  // Find categorical patterns
  for (const [col, stats] of Object.entries(statistics)) {
    if (stats.type !== "categorical" || !stats.topValues) continue;

    const topValue = stats.topValues[0];
    if (topValue) {
      const dominance = topValue.count / data.rows.length;

      if (dominance > 0.7) {
        insights.push({
          id: `pattern-dominant-${col}`,
          type: "pattern",
          severity: dominance > 0.9 ? "warning" : "info",
          confidence: 90,
          title: `"${col}" is dominated by "${topValue.value}"`,
          description: `${(dominance * 100).toFixed(0)}% of rows have the same value`,
          details: [
            `"${topValue.value}": ${topValue.count} rows (${(dominance * 100).toFixed(1)}%)`,
            dominance > 0.9 ? "This column provides very little discriminating information" : "",
          ].filter(Boolean),
          evidence: [
            { type: "statistic", label: "Dominant value", value: String(topValue.value) },
            { type: "statistic", label: "Frequency", value: `${(dominance * 100).toFixed(0)}%` },
          ],
          recommendation: dominance > 0.9
            ? "Consider dropping this column - it doesn't differentiate records"
            : "Focus analysis on the minority values - they may be more interesting",
          affectedColumns: [col],
        });
      }
    }
  }

  return insights;
}

// ============================================
// Correlation Analysis
// ============================================

function analyzeCorrelations(data: DataSet, analysis: AnalysisResult): DeepInsight[] {
  const insights: DeepInsight[] = [];
  const correlations = analysis.correlations || [];

  // Strong correlations
  const strongCorrs = correlations.filter(c => Math.abs(c.value) > 0.7);
  for (const corr of strongCorrs) {
    const isPositive = corr.value > 0;
    insights.push({
      id: `corr-strong-${corr.column1}-${corr.column2}`,
      type: "correlation",
      severity: "success",
      confidence: 90,
      title: `Strong ${isPositive ? "positive" : "negative"} correlation: "${corr.column1}" ↔ "${corr.column2}"`,
      description: isPositive
        ? `As "${corr.column1}" increases, "${corr.column2}" tends to increase`
        : `As "${corr.column1}" increases, "${corr.column2}" tends to decrease`,
      details: [
        `Correlation coefficient: ${corr.value.toFixed(3)}`,
        `This explains ${(corr.value ** 2 * 100).toFixed(0)}% of the variance`,
      ],
      evidence: [
        { type: "statistic", label: "Correlation", value: corr.value.toFixed(3) },
        { type: "statistic", label: "R²", value: `${(corr.value ** 2 * 100).toFixed(0)}%` },
      ],
      recommendation: "Investigate causality - does one drive the other, or is there a common cause?",
      affectedColumns: [corr.column1, corr.column2],
    });
  }

  // Surprising non-correlations (columns that "should" correlate but don't)
  const weakCorrs = correlations.filter(c => Math.abs(c.value) < 0.1);
  for (const corr of weakCorrs) {
    // Check if names suggest they should be related
    const namesRelated = checkNamesRelated(corr.column1, corr.column2);
    if (namesRelated) {
      insights.push({
        id: `corr-surprise-${corr.column1}-${corr.column2}`,
        type: "anomaly",
        severity: "info",
        confidence: 60,
        title: `Surprisingly weak correlation: "${corr.column1}" ↔ "${corr.column2}"`,
        description: "These columns might be expected to correlate but don't",
        details: [
          `Correlation: ${corr.value.toFixed(3)} (essentially no relationship)`,
          "This could indicate independent factors or data issues",
        ],
        evidence: [
          { type: "statistic", label: "Correlation", value: corr.value.toFixed(3) },
        ],
        affectedColumns: [corr.column1, corr.column2],
      });
    }
  }

  return insights;
}

// ============================================
// Trend Analysis
// ============================================

function analyzeTrends(data: DataSet, analysis: AnalysisResult): DeepInsight[] {
  const insights: DeepInsight[] = [];
  const trends = analysis.trends || [];

  for (const trend of trends) {
    const isStrong = Math.abs(trend.changePercent) > 20;
    insights.push({
      id: `trend-${trend.column}`,
      type: "trend",
      severity: isStrong ? "warning" : "info",
      confidence: 75,
      title: `${trend.direction === "up" ? "Upward" : "Downward"} trend in "${trend.column}"`,
      description: trend.description || `Values ${trend.direction === "up" ? "increasing" : "decreasing"} over time`,
      details: [
        `Change: ${trend.changePercent > 0 ? "+" : ""}${trend.changePercent.toFixed(1)}%`,
      ],
      evidence: [
        { type: "statistic", label: "Direction", value: trend.direction },
        { type: "statistic", label: "Change", value: `${trend.changePercent.toFixed(1)}%` },
      ],
      recommendation: isStrong
        ? "Investigate what's driving this significant change"
        : "Monitor this trend over time",
      affectedColumns: [trend.column],
    });
  }

  return insights;
}

// ============================================
// Segmentation
// ============================================

function findSegments(data: DataSet, analysis: AnalysisResult): Segment[] {
  const segments: Segment[] = [];
  const { statistics } = analysis;

  // Simple segmentation based on categorical columns with moderate cardinality
  for (const [col, stats] of Object.entries(statistics)) {
    if (stats.type !== "categorical" || !stats.topValues) continue;
    if (stats.unique < 2 || stats.unique > 10) continue;

    const colIndex = data.columns.indexOf(col);
    if (colIndex < 0) continue;

    // Create segments for each category
    for (const topValue of stats.topValues.slice(0, 5)) {
      const segmentRows = data.rows.filter(row => row[colIndex] === topValue.value);
      if (segmentRows.length < 10) continue;

      // Calculate characteristics
      const characteristics: string[] = [];
      const numericCols = Object.entries(statistics).filter(([_, s]) => s.type === "numeric");

      for (const [numCol, numStats] of numericCols.slice(0, 3)) {
        const numColIndex = data.columns.indexOf(numCol);
        if (numColIndex < 0) continue;

        const segmentValues = segmentRows
          .map(row => row[numColIndex])
          .filter((v): v is number => typeof v === "number");

        if (segmentValues.length > 0) {
          const segmentMean = segmentValues.reduce((a, b) => a + b, 0) / segmentValues.length;
          const overallMean = numStats.mean || 0;
          const diff = ((segmentMean - overallMean) / overallMean) * 100;

          if (Math.abs(diff) > 10) {
            characteristics.push(
              `${diff > 0 ? "Higher" : "Lower"} ${numCol} (${diff > 0 ? "+" : ""}${diff.toFixed(0)}% vs average)`
            );
          }
        }
      }

      if (characteristics.length > 0) {
        segments.push({
          name: `${col}: ${topValue.value}`,
          description: `${topValue.count} rows (${((topValue.count / data.rows.length) * 100).toFixed(1)}%) where ${col} = "${topValue.value}"`,
          size: topValue.count,
          characteristics,
          distinctiveFeatures: characteristics.slice(0, 2),
        });
      }
    }
  }

  return segments.slice(0, 5); // Top 5 most interesting segments
}

// ============================================
// Story Generation
// ============================================

function generateDataStory(
  data: DataSet,
  analysis: AnalysisResult,
  insights: DeepInsight[]
): DataStory {
  const { summary } = analysis;
  const criticalInsights = insights.filter(i => i.severity === "critical");
  const warningInsights = insights.filter(i => i.severity === "warning");
  const successInsights = insights.filter(i => i.severity === "success");

  // Generate headline
  let headline = "";
  if (criticalInsights.length > 0) {
    headline = `Critical issues found: ${criticalInsights[0].title}`;
  } else if (successInsights.length > 0) {
    headline = successInsights[0].title;
  } else if (warningInsights.length > 0) {
    headline = `Attention needed: ${warningInsights[0].title}`;
  } else {
    headline = `Analysis of ${data.rows.length.toLocaleString()} records across ${data.columns.length} variables`;
  }

  // Generate summary
  const summaryParts: string[] = [];
  summaryParts.push(`Dataset contains ${data.rows.length.toLocaleString()} rows and ${data.columns.length} columns.`);

  if (summary) {
    summaryParts.push(`${summary.numericColumns} numeric and ${summary.categoricalColumns} categorical variables.`);
  }

  if (analysis.correlations && analysis.correlations.length > 0) {
    const strongCorrs = analysis.correlations.filter(c => Math.abs(c.value) > 0.5);
    if (strongCorrs.length > 0) {
      summaryParts.push(`Found ${strongCorrs.length} significant correlation${strongCorrs.length > 1 ? "s" : ""}.`);
    }
  }

  // Key findings
  const keyFindings = insights
    .filter(i => i.confidence >= 70)
    .slice(0, 5)
    .map(i => i.title);

  // Surprises
  const surprises = insights
    .filter(i => i.type === "anomaly")
    .slice(0, 3)
    .map(i => i.description);

  // Questions to explore
  const questions: string[] = [];
  for (const insight of insights.slice(0, 5)) {
    if (insight.type === "correlation") {
      questions.push(`What causes the relationship between ${insight.affectedColumns?.join(" and ")}?`);
    } else if (insight.type === "anomaly") {
      questions.push(`Why are there anomalies in ${insight.affectedColumns?.[0] || "the data"}?`);
    } else if (insight.type === "trend") {
      questions.push(`What's driving the trend in ${insight.affectedColumns?.[0]}?`);
    }
  }

  // Next steps
  const nextSteps: string[] = [];
  if (criticalInsights.length > 0) {
    nextSteps.push("Address critical data quality issues first");
  }
  if (successInsights.length > 0) {
    nextSteps.push("Investigate strong correlations for causal relationships");
  }
  if (warningInsights.length > 0) {
    nextSteps.push("Review warnings and decide how to handle them");
  }
  nextSteps.push("Ask follow-up questions about specific findings");

  return {
    headline,
    summary: summaryParts.join(" "),
    keyFindings: keyFindings.length > 0 ? keyFindings : ["No significant findings at high confidence"],
    surprises: surprises.length > 0 ? surprises : ["No major surprises - data behaves as expected"],
    questions: questions.length > 0 ? questions.slice(0, 5) : ["What specific aspect would you like to explore?"],
    nextSteps,
  };
}

// ============================================
// Recommendations
// ============================================

function generateRecommendations(
  insights: DeepInsight[],
  dataQuality: DataQualityReport
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Data quality recommendations
  if (dataQuality.score < 70) {
    recommendations.push({
      priority: "high",
      action: "Clean your data before analysis",
      reason: `Data quality score is ${dataQuality.score}/100`,
      impact: "Analysis results may be unreliable with current data quality",
    });
  }

  // Critical issue recommendations
  for (const insight of insights.filter(i => i.severity === "critical")) {
    if (insight.recommendation) {
      recommendations.push({
        priority: "high",
        action: insight.recommendation,
        reason: insight.title,
        impact: "Critical issue affecting analysis validity",
      });
    }
  }

  // Warning recommendations
  for (const insight of insights.filter(i => i.severity === "warning").slice(0, 3)) {
    if (insight.recommendation) {
      recommendations.push({
        priority: "medium",
        action: insight.recommendation,
        reason: insight.title,
        impact: "May affect specific analyses",
      });
    }
  }

  // Opportunity recommendations
  for (const insight of insights.filter(i => i.type === "correlation" && i.severity === "success").slice(0, 2)) {
    recommendations.push({
      priority: "medium",
      action: `Investigate the ${insight.affectedColumns?.join("-")} relationship`,
      reason: insight.title,
      impact: "Potential for actionable insights",
    });
  }

  return recommendations;
}

// ============================================
// Helper Functions
// ============================================

function issueToInsight(issue: QualityIssue): DeepInsight {
  return {
    id: `quality-${issue.type}-${issue.column || "general"}`,
    type: "quality",
    severity: issue.severity,
    confidence: 95,
    title: issue.description,
    description: issue.suggestion,
    details: [`Affected: ${issue.affectedCount} ${issue.column ? "values" : "rows"}`],
    evidence: [
      { type: "statistic", label: "Affected count", value: issue.affectedCount },
    ],
    recommendation: issue.suggestion,
    affectedColumns: issue.column ? [issue.column] : undefined,
  };
}

function segmentToInsight(segment: Segment): DeepInsight {
  return {
    id: `segment-${segment.name}`,
    type: "segment",
    severity: "info",
    confidence: 70,
    title: `Segment: ${segment.name}`,
    description: segment.description,
    details: segment.characteristics,
    evidence: [
      { type: "statistic", label: "Size", value: segment.size },
    ],
  };
}

function detectRoundNumbers(data: DataSet, column: string): number {
  const colIndex = data.columns.indexOf(column);
  if (colIndex < 0) return 0;

  let roundCount = 0;
  let totalCount = 0;

  for (const row of data.rows) {
    const value = row[colIndex];
    if (typeof value !== "number") continue;
    totalCount++;

    // Check if it's a "round" number (divisible by 10, 100, 1000, etc.)
    if (value % 10 === 0 || value % 5 === 0) {
      roundCount++;
    }
  }

  return totalCount > 0 ? roundCount / totalCount : 0;
}

function findNearDuplicates(values: string[]): [string, string][] {
  const duplicates: [string, string][] = [];

  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const v1 = values[i].toLowerCase().trim();
      const v2 = values[j].toLowerCase().trim();

      if (v1 === v2 && values[i] !== values[j]) {
        duplicates.push([values[i], values[j]]);
      }
    }
  }

  return duplicates;
}

function findDuplicateRows(data: DataSet): number {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of data.rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

function detectRowAnomalies(data: DataSet, analysis: AnalysisResult): number[] {
  const anomalousRows: number[] = [];
  const { statistics } = analysis;

  // Get numeric columns
  const numericCols = Object.entries(statistics)
    .filter(([_, s]) => s.type === "numeric" && s.mean !== undefined && s.std !== undefined)
    .map(([col, stats]) => ({
      col,
      index: data.columns.indexOf(col),
      mean: stats.mean!,
      std: stats.std!,
    }))
    .filter(c => c.index >= 0 && c.std > 0);

  if (numericCols.length < 2) return [];

  // Calculate anomaly score for each row
  for (let rowIdx = 0; rowIdx < data.rows.length; rowIdx++) {
    const row = data.rows[rowIdx];
    let totalZScore = 0;
    let validCols = 0;

    for (const col of numericCols) {
      const value = row[col.index];
      if (typeof value !== "number") continue;

      const zScore = Math.abs((value - col.mean) / col.std);
      totalZScore += zScore;
      validCols++;
    }

    if (validCols >= 2) {
      const avgZScore = totalZScore / validCols;
      if (avgZScore > 2.5) {
        anomalousRows.push(rowIdx);
      }
    }
  }

  return anomalousRows;
}

function checkNamesRelated(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // Check for common prefixes
  const prefix1 = n1.split(/[_\s]/)[0];
  const prefix2 = n2.split(/[_\s]/)[0];

  if (prefix1.length > 3 && prefix1 === prefix2) return true;

  // Check for semantic relationships
  const related = [
    ["price", "cost"],
    ["revenue", "sales"],
    ["qty", "quantity"],
    ["date", "time"],
    ["start", "end"],
    ["min", "max"],
  ];

  for (const [a, b] of related) {
    if ((n1.includes(a) && n2.includes(b)) || (n1.includes(b) && n2.includes(a))) {
      return true;
    }
  }

  return false;
}

// ============================================
// Export for Natural Language Queries
// ============================================

export interface QueryContext {
  data: DataSet;
  analysis: AnalysisResult;
  deepAnalysis: DeepAnalysisResult;
}

/**
 * Answer a natural language question about the data
 */
export function answerQuestion(question: string, context: QueryContext): string {
  const q = question.toLowerCase();
  const { data, analysis, deepAnalysis } = context;

  // What questions
  if (q.includes("what") && q.includes("correlation") || q.includes("relationship")) {
    const corrs = analysis.correlations || [];
    if (corrs.length === 0) return "No significant correlations found in this dataset.";

    const top = corrs.slice(0, 3);
    return `The strongest correlations are:\n${top.map(c =>
      `• ${c.column1} ↔ ${c.column2}: ${c.value.toFixed(3)} (${c.strength})`
    ).join("\n")}`;
  }

  if (q.includes("what") && (q.includes("issue") || q.includes("problem") || q.includes("quality"))) {
    const issues = deepAnalysis.dataQuality.issues;
    if (issues.length === 0) return "No significant data quality issues found.";

    return `Data quality issues found:\n${issues.slice(0, 5).map(i =>
      `• ${i.description}`
    ).join("\n")}`;
  }

  // Why questions
  if (q.includes("why")) {
    return "To understand causality, I'd need to run specific statistical tests. Based on the correlations I found, here are possible explanations:\n" +
      deepAnalysis.story.questions.slice(0, 3).map(q => `• ${q}`).join("\n");
  }

  // How many questions
  if (q.includes("how many") || q.includes("count")) {
    return `The dataset has:\n• ${data.rows.length.toLocaleString()} rows\n• ${data.columns.length} columns\n• ${analysis.summary?.numericColumns || 0} numeric columns\n• ${analysis.summary?.categoricalColumns || 0} categorical columns`;
  }

  // Summary questions
  if (q.includes("summary") || q.includes("overview") || q.includes("tell me about")) {
    return deepAnalysis.story.summary + "\n\nKey findings:\n" +
      deepAnalysis.story.keyFindings.map(f => `• ${f}`).join("\n");
  }

  // Default
  return `I found ${deepAnalysis.insights.length} insights in this data. The main story is:\n\n${deepAnalysis.story.headline}\n\n${deepAnalysis.story.summary}\n\nAsk me about correlations, quality issues, trends, or specific columns.`;
}
