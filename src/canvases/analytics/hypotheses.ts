// Hypothesis Engine for Kowalski Analytics
// "Skipper, I've formulated several testable hypotheses based on the data."
//
// Implements REF: AN-005 (Hypothesis Generation)
// See specs/README.md Section 3.3.5

import type {
  DataSet,
  AnalysisResult,
  Correlation,
  Trend,
  Outlier,
  ColumnStats,
} from "./types";
import { calculateStats, calculateCorrelation } from "./stats";
import { getNumericColumnValues, getColumnValues } from "./data-loader";

/**
 * Hypothesis type categories
 */
export type HypothesisType =
  | "correlation"     // X may drive Y (based on correlation)
  | "group_difference" // Segment A differs from B
  | "trend"           // Metric is increasing/decreasing
  | "anomaly"         // Outliers may indicate issue
  | "distribution";   // Distribution pattern hypothesis

/**
 * Interpretation of correlation - causal vs correlational
 */
export type CausalInterpretation = "causal" | "correlational" | "reverse_causal" | "confounded";

/**
 * A testable hypothesis generated from data patterns
 */
export interface Hypothesis {
  id: string;
  type: HypothesisType;
  title: string;
  description: string;
  confidence: number;       // 0-100
  evidence: HypothesisEvidence[];
  interpretation: CausalInterpretation;
  confounders: string[];    // Potential confounding variables
  recommendations: string[]; // Suggested follow-up analyses
  variables: string[];      // Columns involved
  testable: boolean;        // Can this be tested with current data?
  testMethod?: string;      // Suggested statistical test
}

/**
 * Evidence supporting a hypothesis
 */
export interface HypothesisEvidence {
  type: "statistic" | "pattern" | "comparison" | "test";
  description: string;
  value?: number;
  pValue?: number;          // For statistical tests
  interpretation: string;
}

/**
 * Result of hypothesis testing
 */
export interface HypothesisTestResult {
  hypothesisId: string;
  supported: boolean;
  confidence: number;
  testStatistic?: number;
  pValue?: number;
  effectSize?: number;
  interpretation: string;
  caveats: string[];
}

/**
 * Generate hypotheses from data analysis
 */
export function generateHypotheses(
  data: DataSet,
  analysis: AnalysisResult
): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  let hypothesisCounter = 1;

  // Generate correlation-based hypotheses
  const correlationHypotheses = generateCorrelationHypotheses(
    data,
    analysis,
    () => `H${hypothesisCounter++}`
  );
  hypotheses.push(...correlationHypotheses);

  // Generate group difference hypotheses
  const groupDiffHypotheses = generateGroupDifferenceHypotheses(
    data,
    analysis,
    () => `H${hypothesisCounter++}`
  );
  hypotheses.push(...groupDiffHypotheses);

  // Generate trend-based hypotheses
  const trendHypotheses = generateTrendHypotheses(
    data,
    analysis,
    () => `H${hypothesisCounter++}`
  );
  hypotheses.push(...trendHypotheses);

  // Generate anomaly-based hypotheses
  const anomalyHypotheses = generateAnomalyHypotheses(
    data,
    analysis,
    () => `H${hypothesisCounter++}`
  );
  hypotheses.push(...anomalyHypotheses);

  // Sort by confidence (most confident first)
  hypotheses.sort((a, b) => b.confidence - a.confidence);

  // Return top hypotheses (limit to avoid overwhelming user)
  return hypotheses.slice(0, 10);
}

/**
 * Generate hypotheses from correlations
 * "X may drive Y" when correlation > 0.5
 */
function generateCorrelationHypotheses(
  data: DataSet,
  analysis: AnalysisResult,
  nextId: () => string
): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  const { correlations, statistics } = analysis;

  if (!correlations || correlations.length === 0) {
    return hypotheses;
  }

  // Focus on strong and moderate correlations
  const significantCorrelations = correlations.filter(
    c => Math.abs(c.value) >= 0.4
  );

  for (const corr of significantCorrelations.slice(0, 5)) {
    const { column1, column2, value, strength } = corr;
    const absValue = Math.abs(value);
    const direction = value > 0 ? "positive" : "negative";
    const directionDesc = value > 0
      ? "increases with"
      : "decreases as";

    // Determine interpretation
    const interpretation = determineCorrelationInterpretation(
      column1,
      column2,
      data,
      analysis
    );

    // Find potential confounders
    const confounders = findPotentialConfounders(
      column1,
      column2,
      correlations,
      data
    );

    // Calculate confidence based on correlation strength and sample size
    const sampleSize = data.rows.length;
    let confidence = Math.round(absValue * 80); // Base confidence from correlation strength

    // Adjust for sample size
    if (sampleSize > 1000) confidence += 10;
    else if (sampleSize < 100) confidence -= 10;

    // Adjust for confounders
    if (confounders.length > 2) confidence -= 10;

    confidence = Math.max(30, Math.min(95, confidence));

    const hypothesis: Hypothesis = {
      id: nextId(),
      type: "correlation",
      title: `${column1} may ${interpretation === "causal" ? "drive" : "relate to"} ${column2}`,
      description: `${column1} ${directionDesc} ${column2} (r=${value.toFixed(2)}, ${strength} ${direction} correlation)`,
      confidence,
      evidence: [
        {
          type: "statistic",
          description: `Pearson correlation coefficient: ${value.toFixed(3)}`,
          value,
          interpretation: `This indicates a ${strength} ${direction} relationship between the variables.`,
        },
        {
          type: "pattern",
          description: `As ${column1} increases, ${column2} ${value > 0 ? "tends to increase" : "tends to decrease"}.`,
          interpretation: "This pattern is consistent across the dataset.",
        },
      ],
      interpretation,
      confounders,
      recommendations: generateCorrelationRecommendations(
        column1,
        column2,
        value,
        interpretation,
        confounders
      ),
      variables: [column1, column2],
      testable: true,
      testMethod: "Linear regression with significance testing",
    };

    // Add warning about correlation vs causation
    if (interpretation === "correlational" || interpretation === "confounded") {
      hypothesis.evidence.push({
        type: "pattern",
        description: "Correlation does not imply causation",
        interpretation: confounders.length > 0
          ? `Potential confounders (${confounders.join(", ")}) may explain this relationship.`
          : "Consider experimental design or instrumental variables to establish causality.",
      });
    }

    hypotheses.push(hypothesis);
  }

  return hypotheses;
}

/**
 * Generate hypotheses from group differences
 * "Segment A differs from B"
 */
function generateGroupDifferenceHypotheses(
  data: DataSet,
  analysis: AnalysisResult,
  nextId: () => string
): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  const { columns, rows, types } = data;
  const { statistics } = analysis;

  if (!statistics) return hypotheses;

  // Find categorical and numeric columns
  const categoricalCols = columns.filter((col, i) =>
    types?.[i] !== "number" &&
    statistics[col]?.type === "categorical" &&
    (statistics[col]?.uniqueCount || 0) <= 10 // Limit to reasonable categories
  );

  const numericCols = columns.filter((col, i) =>
    types?.[i] === "number"
  );

  // Analyze each categorical-numeric pair
  for (const catCol of categoricalCols.slice(0, 3)) {
    const catIdx = columns.indexOf(catCol);
    const catStats = statistics[catCol];

    if (!catStats?.topValues || catStats.topValues.length < 2) continue;

    for (const numCol of numericCols.slice(0, 3)) {
      const numIdx = columns.indexOf(numCol);

      // Group values by category
      const groups = new Map<string, number[]>();
      for (const row of rows) {
        const cat = String(row[catIdx] ?? "");
        const num = row[numIdx];
        if (typeof num === "number" && cat !== "") {
          if (!groups.has(cat)) groups.set(cat, []);
          groups.get(cat)!.push(num);
        }
      }

      // Need at least 2 groups with data
      if (groups.size < 2) continue;

      // Calculate stats for each group
      const groupStats = Array.from(groups.entries())
        .filter(([_, vals]) => vals.length >= 5) // Minimum sample size
        .map(([name, vals]) => ({
          name,
          count: vals.length,
          mean: vals.reduce((a, b) => a + b, 0) / vals.length,
          std: calculateStats(vals).std,
        }))
        .sort((a, b) => b.mean - a.mean);

      if (groupStats.length < 2) continue;

      // Check if there's a significant difference
      const maxMean = groupStats[0].mean;
      const minMean = groupStats[groupStats.length - 1].mean;
      const overallMean = (maxMean + minMean) / 2;
      const diffPercent = overallMean !== 0
        ? Math.abs(maxMean - minMean) / Math.abs(overallMean) * 100
        : 0;

      // Only create hypothesis if difference is meaningful
      if (diffPercent < 10) continue;

      // Perform t-test approximation
      const topGroup = groupStats[0];
      const bottomGroup = groupStats[groupStats.length - 1];
      const tTestResult = approximateTTest(
        groups.get(topGroup.name)!,
        groups.get(bottomGroup.name)!
      );

      const confidence = Math.min(90, Math.max(40,
        tTestResult.significant ? 70 + (1 - tTestResult.pValue) * 20 : 40
      ));

      hypotheses.push({
        id: nextId(),
        type: "group_difference",
        title: `${catCol} affects ${numCol}`,
        description: `${topGroup.name} has ${diffPercent.toFixed(0)}% higher ${numCol} than ${bottomGroup.name}`,
        confidence,
        evidence: [
          {
            type: "comparison",
            description: `${topGroup.name}: mean=${topGroup.mean.toFixed(2)}, n=${topGroup.count}`,
            value: topGroup.mean,
            interpretation: `Highest ${numCol} among ${catCol} groups`,
          },
          {
            type: "comparison",
            description: `${bottomGroup.name}: mean=${bottomGroup.mean.toFixed(2)}, n=${bottomGroup.count}`,
            value: bottomGroup.mean,
            interpretation: `Lowest ${numCol} among ${catCol} groups`,
          },
          {
            type: "test",
            description: `t-test: t=${tTestResult.tStatistic.toFixed(2)}, p${tTestResult.pValue < 0.001 ? "<0.001" : "=" + tTestResult.pValue.toFixed(3)}`,
            pValue: tTestResult.pValue,
            interpretation: tTestResult.significant
              ? "Statistically significant difference"
              : "Difference may not be statistically significant",
          },
        ],
        interpretation: tTestResult.significant ? "correlational" : "correlational",
        confounders: [],
        recommendations: [
          `Investigate what drives ${topGroup.name}'s higher ${numCol}`,
          "Consider controlling for other variables that may explain the difference",
          groupStats.length > 2
            ? `Review all ${groupStats.length} groups for patterns`
            : undefined,
        ].filter((r): r is string => r !== undefined),
        variables: [catCol, numCol],
        testable: true,
        testMethod: "Independent samples t-test or ANOVA",
      });
    }
  }

  return hypotheses;
}

/**
 * Generate hypotheses from trends
 * "Metric is increasing/decreasing"
 */
function generateTrendHypotheses(
  data: DataSet,
  analysis: AnalysisResult,
  nextId: () => string
): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  const { trends, statistics } = analysis;

  if (!trends || trends.length === 0) return hypotheses;

  for (const trend of trends.slice(0, 5)) {
    const { column, direction, changePercent, description } = trend;

    if (direction === "stable" || Math.abs(changePercent) < 5) continue;

    const stats = statistics?.[column];
    const isSignificant = Math.abs(changePercent) > 10;

    // Calculate confidence based on trend strength and consistency
    let confidence = 50;
    if (Math.abs(changePercent) > 50) confidence += 25;
    else if (Math.abs(changePercent) > 20) confidence += 15;
    if (data.rows.length > 100) confidence += 10;

    confidence = Math.min(85, confidence);

    const trendWord = direction === "up" ? "increasing" : "decreasing";
    const trendImplication = direction === "up"
      ? "growth or improvement"
      : "decline or degradation";

    hypotheses.push({
      id: nextId(),
      type: "trend",
      title: `${column} is ${trendWord}`,
      description: `${column} shows a ${Math.abs(changePercent).toFixed(1)}% ${trendWord} trend over the dataset`,
      confidence,
      evidence: [
        {
          type: "statistic",
          description: `Change: ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
          value: changePercent,
          interpretation: description,
        },
        {
          type: "pattern",
          description: `Trend direction: ${direction}`,
          interpretation: `This suggests ${trendImplication} in ${column}.`,
        },
      ],
      interpretation: "correlational",
      confounders: [
        "Time-related factors (seasonality, business cycles)",
        "External events not captured in data",
        "Changes in data collection methodology",
      ],
      recommendations: [
        "Investigate root cause of the trend",
        "Check for seasonality or cyclical patterns",
        "Consider if trend is expected or concerning",
        isSignificant
          ? "Significant trend - may require action"
          : "Monitor for continued trend",
      ],
      variables: [column],
      testable: true,
      testMethod: "Linear regression with time as predictor",
    });
  }

  return hypotheses;
}

/**
 * Generate hypotheses from outliers/anomalies
 * "Outliers may indicate issue"
 */
function generateAnomalyHypotheses(
  data: DataSet,
  analysis: AnalysisResult,
  nextId: () => string
): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  const { outliers, statistics } = analysis;

  if (!outliers || outliers.length === 0) return hypotheses;

  // Group outliers by column
  const outliersByColumn = new Map<string, Outlier[]>();
  for (const outlier of outliers) {
    if (!outliersByColumn.has(outlier.column)) {
      outliersByColumn.set(outlier.column, []);
    }
    outliersByColumn.get(outlier.column)!.push(outlier);
  }

  for (const [column, colOutliers] of outliersByColumn) {
    const stats = statistics?.[column];
    if (!stats) continue;

    const outlierCount = colOutliers.length;
    const totalRows = data.rows.length;
    const outlierPercent = (outlierCount / totalRows) * 100;

    // Calculate severity
    const maxZscore = Math.max(...colOutliers.map(o => Math.abs(o.zscore || 0)));
    const severity = maxZscore > 4 ? "extreme" : maxZscore > 3 ? "severe" : "moderate";

    // Determine likely cause
    let likelyCause: string;
    let confidence: number;

    if (outlierPercent > 5) {
      likelyCause = "Possible data quality issue or different population";
      confidence = 70;
    } else if (outlierPercent > 2) {
      likelyCause = "May indicate special cases or edge conditions";
      confidence = 60;
    } else {
      likelyCause = "Natural variation or rare events";
      confidence = 50;
    }

    if (maxZscore > 5) confidence += 10;

    hypotheses.push({
      id: nextId(),
      type: "anomaly",
      title: `${column} contains ${severity} outliers`,
      description: `${outlierCount} values (${outlierPercent.toFixed(1)}%) are outside expected range`,
      confidence: Math.min(85, confidence),
      evidence: [
        {
          type: "statistic",
          description: `${outlierCount} outliers detected using IQR method`,
          value: outlierCount,
          interpretation: `Values outside [${colOutliers[0]?.expectedMin.toFixed(2)}, ${colOutliers[0]?.expectedMax.toFixed(2)}]`,
        },
        {
          type: "pattern",
          description: `Max z-score: ${maxZscore.toFixed(2)}`,
          value: maxZscore,
          interpretation: severity === "extreme"
            ? "Extremely unusual values present"
            : severity === "severe"
              ? "Severely unusual values present"
              : "Moderately unusual values present",
        },
      ],
      interpretation: "correlational",
      confounders: [],
      recommendations: [
        "Investigate outlier records for data entry errors",
        "Determine if outliers represent valid edge cases",
        outlierPercent > 3
          ? "Consider robust statistics if outliers are valid"
          : undefined,
        maxZscore > 4
          ? "Extreme outliers may significantly skew analysis"
          : undefined,
      ].filter((r): r is string => r !== undefined),
      variables: [column],
      testable: true,
      testMethod: "Investigate individual records; consider Grubbs' test",
    });
  }

  return hypotheses;
}

/**
 * Determine if correlation suggests causation
 */
function determineCorrelationInterpretation(
  col1: string,
  col2: string,
  data: DataSet,
  analysis: AnalysisResult
): CausalInterpretation {
  const name1 = col1.toLowerCase();
  const name2 = col2.toLowerCase();

  // Check for obvious causal patterns based on naming
  const causeKeywords = ["input", "spend", "investment", "effort", "time", "cost"];
  const effectKeywords = ["output", "revenue", "result", "return", "outcome", "sales"];

  const col1IsCause = causeKeywords.some(k => name1.includes(k));
  const col2IsEffect = effectKeywords.some(k => name2.includes(k));
  const col2IsCause = causeKeywords.some(k => name2.includes(k));
  const col1IsEffect = effectKeywords.some(k => name1.includes(k));

  if (col1IsCause && col2IsEffect) return "causal";
  if (col2IsCause && col1IsEffect) return "reverse_causal";

  // Check for time-based columns (time typically causes outcomes)
  const timeKeywords = ["date", "time", "year", "month", "day", "period"];
  if (timeKeywords.some(k => name1.includes(k))) return "causal";
  if (timeKeywords.some(k => name2.includes(k))) return "reverse_causal";

  // Default to correlational - safest interpretation
  return "correlational";
}

/**
 * Find potential confounding variables
 */
function findPotentialConfounders(
  col1: string,
  col2: string,
  correlations: Correlation[],
  data: DataSet
): string[] {
  const confounders: string[] = [];

  // Look for variables that correlate with both col1 and col2
  const col1Correlations = new Map<string, number>();
  const col2Correlations = new Map<string, number>();

  for (const corr of correlations) {
    if (corr.column1 === col1 || corr.column2 === col1) {
      const other = corr.column1 === col1 ? corr.column2 : corr.column1;
      if (other !== col2) {
        col1Correlations.set(other, Math.abs(corr.value));
      }
    }
    if (corr.column1 === col2 || corr.column2 === col2) {
      const other = corr.column1 === col2 ? corr.column2 : corr.column1;
      if (other !== col1) {
        col2Correlations.set(other, Math.abs(corr.value));
      }
    }
  }

  // Variables that correlate with both are potential confounders
  for (const [variable, corrWithCol1] of col1Correlations) {
    const corrWithCol2 = col2Correlations.get(variable);
    if (corrWithCol2 && corrWithCol1 > 0.3 && corrWithCol2 > 0.3) {
      confounders.push(variable);
    }
  }

  // Common confounders by domain
  const commonConfounders = [
    "time",
    "date",
    "size",
    "scale",
    "population",
    "region",
  ];

  for (const col of data.columns) {
    const nameLower = col.toLowerCase();
    if (
      col !== col1 &&
      col !== col2 &&
      commonConfounders.some(c => nameLower.includes(c)) &&
      !confounders.includes(col)
    ) {
      confounders.push(col);
    }
  }

  return confounders.slice(0, 5);
}

/**
 * Generate recommendations for correlation hypothesis
 */
function generateCorrelationRecommendations(
  col1: string,
  col2: string,
  correlationValue: number,
  interpretation: CausalInterpretation,
  confounders: string[]
): string[] {
  const recommendations: string[] = [];

  if (interpretation === "correlational") {
    recommendations.push(
      "Run controlled experiment to test causality",
      "Consider instrumental variable analysis"
    );
  }

  if (confounders.length > 0) {
    recommendations.push(
      `Control for potential confounders: ${confounders.slice(0, 3).join(", ")}`
    );
  }

  if (Math.abs(correlationValue) > 0.7) {
    recommendations.push(
      "Strong relationship - investigate underlying mechanism"
    );
  }

  if (Math.abs(correlationValue) < 0.5) {
    recommendations.push(
      "Moderate relationship - other factors likely involved"
    );
  }

  recommendations.push(`Build regression model with ${col1} predicting ${col2}`);

  return recommendations;
}

/**
 * Approximate t-test for two groups
 */
function approximateTTest(
  group1: number[],
  group2: number[]
): { tStatistic: number; pValue: number; significant: boolean } {
  const n1 = group1.length;
  const n2 = group2.length;

  if (n1 < 2 || n2 < 2) {
    return { tStatistic: 0, pValue: 1, significant: false };
  }

  const stats1 = calculateStats(group1);
  const stats2 = calculateStats(group2);

  const mean1 = stats1.mean;
  const mean2 = stats2.mean;
  const var1 = stats1.std * stats1.std;
  const var2 = stats2.std * stats2.std;

  // Welch's t-test (unequal variances)
  const se = Math.sqrt(var1 / n1 + var2 / n2);

  if (se === 0) {
    return { tStatistic: 0, pValue: 1, significant: false };
  }

  const tStatistic = (mean1 - mean2) / se;

  // Approximate p-value using normal distribution (for large samples)
  // For small samples, this is an approximation
  const df = Math.min(n1, n2) - 1;
  const pValue = approximatePValue(Math.abs(tStatistic), df);

  return {
    tStatistic,
    pValue,
    significant: pValue < 0.05,
  };
}

/**
 * Approximate p-value from t-statistic
 * Using approximation for simplicity (accurate for df > 30)
 */
function approximatePValue(tStat: number, df: number): number {
  // For large df, use normal approximation
  // For small df, this is less accurate but sufficient for hypothesis generation

  // Simple approximation using cumulative normal
  const z = tStat;

  // Approximation of 2-tailed p-value
  // Using simple approximation: P(|Z| > z) ≈ 2 * (1 - Phi(z))

  // Approximation of standard normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  const cdf = 0.5 * (1.0 + sign * y);

  // Two-tailed p-value
  return 2 * (1 - cdf);
}

/**
 * Test a specific hypothesis with the data
 */
export function testHypothesis(
  data: DataSet,
  hypothesis: Hypothesis
): HypothesisTestResult {
  const { id, type, variables } = hypothesis;

  switch (type) {
    case "correlation":
      return testCorrelationHypothesis(data, hypothesis);
    case "group_difference":
      return testGroupDifferenceHypothesis(data, hypothesis);
    case "trend":
      return testTrendHypothesis(data, hypothesis);
    case "anomaly":
      return testAnomalyHypothesis(data, hypothesis);
    default:
      return {
        hypothesisId: id,
        supported: false,
        confidence: 0,
        interpretation: "Unable to test this hypothesis type",
        caveats: ["Hypothesis type not supported for testing"],
      };
  }
}

function testCorrelationHypothesis(
  data: DataSet,
  hypothesis: Hypothesis
): HypothesisTestResult {
  const [col1, col2] = hypothesis.variables;
  const idx1 = data.columns.indexOf(col1);
  const idx2 = data.columns.indexOf(col2);

  if (idx1 === -1 || idx2 === -1) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Could not find required columns",
      caveats: ["Column names may have changed"],
    };
  }

  // Get paired values
  const pairs: { x: number; y: number }[] = [];
  for (const row of data.rows) {
    const x = row[idx1];
    const y = row[idx2];
    if (typeof x === "number" && typeof y === "number") {
      pairs.push({ x, y });
    }
  }

  if (pairs.length < 10) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Insufficient paired data points",
      caveats: ["Need at least 10 paired observations"],
    };
  }

  const correlation = calculateCorrelation(
    pairs.map(p => p.x),
    pairs.map(p => p.y)
  );

  // Calculate p-value for correlation
  const n = pairs.length;
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = approximatePValue(Math.abs(t), n - 2);

  const supported = Math.abs(correlation) >= 0.4 && pValue < 0.05;

  return {
    hypothesisId: hypothesis.id,
    supported,
    confidence: Math.round(Math.abs(correlation) * 100),
    testStatistic: correlation,
    pValue,
    effectSize: correlation,
    interpretation: supported
      ? `Hypothesis supported: r=${correlation.toFixed(3)}, p${pValue < 0.001 ? "<0.001" : "=" + pValue.toFixed(3)}`
      : `Hypothesis not supported: r=${correlation.toFixed(3)}, p=${pValue.toFixed(3)}`,
    caveats: [
      "Correlation does not imply causation",
      hypothesis.confounders.length > 0
        ? `Consider controlling for: ${hypothesis.confounders.join(", ")}`
        : "",
    ].filter(c => c !== ""),
  };
}

function testGroupDifferenceHypothesis(
  data: DataSet,
  hypothesis: Hypothesis
): HypothesisTestResult {
  const [catCol, numCol] = hypothesis.variables;
  const catIdx = data.columns.indexOf(catCol);
  const numIdx = data.columns.indexOf(numCol);

  if (catIdx === -1 || numIdx === -1) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Could not find required columns",
      caveats: ["Column names may have changed"],
    };
  }

  // Group values
  const groups = new Map<string, number[]>();
  for (const row of data.rows) {
    const cat = String(row[catIdx] ?? "");
    const num = row[numIdx];
    if (typeof num === "number" && cat !== "") {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(num);
    }
  }

  const groupArray = Array.from(groups.entries())
    .filter(([_, vals]) => vals.length >= 5);

  if (groupArray.length < 2) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Insufficient groups for comparison",
      caveats: ["Need at least 2 groups with 5+ observations each"],
    };
  }

  // Perform t-test between top two groups
  const sortedGroups = groupArray
    .map(([name, vals]) => ({
      name,
      vals,
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
    }))
    .sort((a, b) => b.mean - a.mean);

  const topGroup = sortedGroups[0];
  const bottomGroup = sortedGroups[sortedGroups.length - 1];

  const result = approximateTTest(topGroup.vals, bottomGroup.vals);

  return {
    hypothesisId: hypothesis.id,
    supported: result.significant,
    confidence: result.significant ? 75 : 40,
    testStatistic: result.tStatistic,
    pValue: result.pValue,
    effectSize: (topGroup.mean - bottomGroup.mean) / bottomGroup.mean,
    interpretation: result.significant
      ? `Hypothesis supported: ${topGroup.name} significantly differs from ${bottomGroup.name} (p=${result.pValue.toFixed(3)})`
      : `Hypothesis not supported: Difference not statistically significant (p=${result.pValue.toFixed(3)})`,
    caveats: [
      "Comparison is between highest and lowest groups only",
      "Other variables may explain the difference",
    ],
  };
}

function testTrendHypothesis(
  data: DataSet,
  hypothesis: Hypothesis
): HypothesisTestResult {
  const [column] = hypothesis.variables;
  const colIdx = data.columns.indexOf(column);

  if (colIdx === -1) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Could not find required column",
      caveats: ["Column name may have changed"],
    };
  }

  const values = getNumericColumnValues(data, colIdx);

  if (values.length < 10) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Insufficient data points for trend analysis",
      caveats: ["Need at least 10 observations"],
    };
  }

  // Calculate trend using simple linear regression
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const correlation = calculateCorrelation(x, values);

  // Trend is "supported" if correlation with time is significant
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = approximatePValue(Math.abs(t), n - 2);

  const supported = Math.abs(correlation) >= 0.2 && pValue < 0.05;
  const direction = correlation > 0 ? "upward" : "downward";

  return {
    hypothesisId: hypothesis.id,
    supported,
    confidence: Math.round(Math.abs(correlation) * 100),
    testStatistic: correlation,
    pValue,
    interpretation: supported
      ? `Hypothesis supported: Significant ${direction} trend (r=${correlation.toFixed(3)}, p=${pValue.toFixed(3)})`
      : `Hypothesis not supported: No significant trend detected (r=${correlation.toFixed(3)}, p=${pValue.toFixed(3)})`,
    caveats: [
      "Assumes linear trend",
      "Seasonality or cycles may not be captured",
      "Data order assumed to be chronological",
    ],
  };
}

function testAnomalyHypothesis(
  data: DataSet,
  hypothesis: Hypothesis
): HypothesisTestResult {
  const [column] = hypothesis.variables;
  const colIdx = data.columns.indexOf(column);

  if (colIdx === -1) {
    return {
      hypothesisId: hypothesis.id,
      supported: false,
      confidence: 0,
      interpretation: "Could not find required column",
      caveats: ["Column name may have changed"],
    };
  }

  const values = getNumericColumnValues(data, colIdx);
  const stats = calculateStats(values);

  // Calculate outliers using IQR method
  const iqr = stats.percentiles.p75 - stats.percentiles.p25;
  const lowerBound = stats.percentiles.p25 - 1.5 * iqr;
  const upperBound = stats.percentiles.p75 + 1.5 * iqr;

  const outlierCount = values.filter(
    v => v < lowerBound || v > upperBound
  ).length;

  const outlierPercent = (outlierCount / values.length) * 100;
  const supported = outlierCount > 0;

  return {
    hypothesisId: hypothesis.id,
    supported,
    confidence: supported ? Math.min(90, 50 + outlierPercent * 5) : 30,
    testStatistic: outlierCount,
    interpretation: supported
      ? `Hypothesis supported: ${outlierCount} outliers (${outlierPercent.toFixed(1)}%) detected`
      : "Hypothesis not supported: No outliers detected with IQR method",
    caveats: [
      "IQR method may miss outliers in skewed distributions",
      "Consider Grubbs' test for formal outlier detection",
    ],
  };
}

/**
 * Format hypothesis for display in Kowalski voice
 */
export function formatHypothesisKowalski(hypothesis: Hypothesis): string {
  const { id, title, description, confidence, interpretation, recommendations } = hypothesis;

  const confidenceWord = confidence >= 80
    ? "highly confident"
    : confidence >= 60
      ? "reasonably confident"
      : "tentatively suggesting";

  const interpretationNote = interpretation === "causal"
    ? "This appears to be a causal relationship."
    : interpretation === "correlational"
      ? "Note: Correlation does not imply causation."
      : interpretation === "confounded"
        ? "Warning: Potential confounders may explain this relationship."
        : "";

  return [
    `**${id}: ${title}**`,
    `Evidence: ${description}`,
    `Confidence: ${confidence}% (${confidenceWord})`,
    interpretationNote,
    "",
    "Recommendations:",
    ...recommendations.slice(0, 3).map(r => `  - ${r}`),
  ].filter(line => line !== "").join("\n");
}
