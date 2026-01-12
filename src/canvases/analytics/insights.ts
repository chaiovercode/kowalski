// Kowalski Intelligence Engine
// "Kowalski, analysis!" - Actually intelligent insights, not just stats

import type { DataSet, AnalysisResult, ColumnStats } from "./types";

export interface DataInsight {
  category: "quality" | "pattern" | "anomaly" | "finding" | "warning";
  title: string;
  description: string;
  severity: "info" | "success" | "warning" | "critical";
  evidence?: string[];
}

export interface EDAReport {
  overview: {
    rows: number;
    columns: number;
    numericCols: number;
    categoricalCols: number;
    suspiciouslyClean: boolean;
  };
  variables: VariableSummary[];
  findings: DataInsight[];
  interpretation: string;
  bottomLine: string;
  isSynthetic: boolean;
  syntheticReasons: string[];
}

export interface VariableSummary {
  name: string;
  type: "numeric" | "categorical" | "date" | "text";
  uniqueCount: number;
  description: string;
  notable?: string;
}

/**
 * Generate intelligent EDA report with Claude-like analysis
 */
export function generateEDAReport(data: DataSet, analysis: AnalysisResult): EDAReport {
  const { columns, rows, types } = data;
  const { statistics, correlations, summary } = analysis;

  const numericCols = columns.filter((_, i) => types?.[i] === "number");
  const categoricalCols = columns.filter((_, i) => types?.[i] !== "number" && types?.[i] !== "date");

  // Check for suspiciously clean data
  const missingPercent = summary?.missingPercent || 0;
  const suspiciouslyClean = missingPercent === 0 && rows.length > 1000;

  // Analyze each variable
  const variables: VariableSummary[] = columns.map((col, i) => {
    const stats = statistics?.[col];
    const type = types?.[i] === "number" ? "numeric" : "categorical";

    let description = "";
    let notable: string | undefined;

    if (type === "numeric" && stats) {
      const range = (stats.max || 0) - (stats.min || 0);
      const cv = stats.mean ? (stats.std || 0) / stats.mean : 0;
      description = `μ=${stats.mean?.toFixed(2)}, σ=${stats.std?.toFixed(2)}, range=[${stats.min}-${stats.max}]`;

      // Look for interesting patterns
      if (stats.min === 0 && stats.max === 100) {
        notable = "Looks like a percentage/rate column";
      } else if (cv < 0.1 && rows.length > 100) {
        notable = "Very low variance - values are tightly clustered";
      } else if (cv > 2) {
        notable = "High variance - widely spread values";
      }
    } else if (stats) {
      const uniqueCount = stats.uniqueCount || stats.uniqueValues || 0;
      description = `${uniqueCount} unique values`;

      // Check for garbage data
      if (stats.topValues?.[0]) {
        const topValue = String(stats.topValues[0].value);
        if (topValue.length > 20 && /^[A-Za-z0-9]+$/.test(topValue)) {
          notable = "Looks like random/garbage data";
        }
      }

      if (uniqueCount === rows.length && rows.length > 100) {
        notable = "All unique values - possibly an ID column or garbage";
      }
    }

    return {
      name: col,
      type,
      uniqueCount: stats?.uniqueCount || stats?.uniqueValues || 0,
      description,
      notable,
    };
  });

  // Detect synthetic data
  const { isSynthetic, syntheticReasons } = detectSyntheticData(data, analysis, variables);

  // Generate findings
  const findings = generateFindings(data, analysis, variables, isSynthetic);

  // Generate interpretation
  const interpretation = generateInterpretation(data, analysis, isSynthetic, syntheticReasons);

  // Generate bottom line
  const bottomLine = generateBottomLine(isSynthetic, findings);

  return {
    overview: {
      rows: rows.length,
      columns: columns.length,
      numericCols: numericCols.length,
      categoricalCols: categoricalCols.length,
      suspiciouslyClean,
    },
    variables,
    findings,
    interpretation,
    bottomLine,
    isSynthetic,
    syntheticReasons,
  };
}

/**
 * Detect if data is likely synthetic/generated
 */
function detectSyntheticData(
  data: DataSet,
  analysis: AnalysisResult,
  variables: VariableSummary[]
): { isSynthetic: boolean; syntheticReasons: string[] } {
  const reasons: string[] = [];
  const { rows } = data;
  const { correlations, statistics, summary } = analysis;

  // Check 1: Zero missing values with large dataset
  if ((summary?.missingPercent || 0) === 0 && rows.length > 1000) {
    reasons.push("Zero missing values in a large dataset (real data almost always has some missing values)");
  }

  // Check 2: Near-zero correlations between all numeric variables
  if (correlations && correlations.length > 0) {
    const maxCorr = Math.max(...correlations.map(c => Math.abs(c.value)));
    if (maxCorr < 0.1 && correlations.length >= 3) {
      reasons.push(`Near-zero correlations across all variables (max: ${maxCorr.toFixed(3)}) - real data usually has some relationships`);
    }
  }

  // Check 3: Perfectly uniform distributions
  if (statistics) {
    const numericStats = Object.entries(statistics).filter(([_, s]) => s.type === "numeric");
    for (const [col, stats] of numericStats) {
      if (stats.min === 0 && stats.max === 100 && rows.length > 1000) {
        // Check if distribution is suspiciously uniform
        const colIdx = data.columns.indexOf(col);
        if (colIdx >= 0) {
          const values = rows.map(r => r[colIdx]).filter((v): v is number => typeof v === "number");
          const buckets = new Array(5).fill(0);
          for (const v of values) {
            const bucket = Math.min(4, Math.floor(v / 20));
            buckets[bucket]++;
          }
          const avgBucket = values.length / 5;
          const maxDeviation = Math.max(...buckets.map(b => Math.abs(b - avgBucket) / avgBucket));
          if (maxDeviation < 0.05) {
            reasons.push(`${col} has suspiciously perfect uniform distribution (each 20% bucket has ~equal counts)`);
          }
        }
      }
    }
  }

  // Check 4: Identical means across categorical groups
  const categoricalCols = Object.entries(statistics || {}).filter(([_, s]) => s.type === "categorical");
  const numericCols = Object.entries(statistics || {}).filter(([_, s]) => s.type === "numeric");

  if (categoricalCols.length > 0 && numericCols.length > 0 && rows.length > 1000) {
    // Sample check: means should vary by category in real data
    for (const [catCol, catStats] of categoricalCols.slice(0, 2)) {
      for (const [numCol, numStats] of numericCols.slice(0, 1)) {
        const catIdx = data.columns.indexOf(catCol);
        const numIdx = data.columns.indexOf(numCol);

        if (catIdx >= 0 && numIdx >= 0) {
          const groupMeans = new Map<string, number[]>();
          for (const row of rows) {
            const cat = String(row[catIdx]);
            const num = row[numIdx];
            if (typeof num === "number") {
              if (!groupMeans.has(cat)) groupMeans.set(cat, []);
              groupMeans.get(cat)!.push(num);
            }
          }

          const means = Array.from(groupMeans.entries()).map(([_, vals]) =>
            vals.reduce((a, b) => a + b, 0) / vals.length
          );

          if (means.length >= 3) {
            const overallMean = means.reduce((a, b) => a + b, 0) / means.length;
            const maxDiff = Math.max(...means.map(m => Math.abs(m - overallMean)));
            if (maxDiff < 1 && numStats.std && numStats.std > 10) {
              reasons.push(`${numCol} has virtually identical means across all ${catCol} groups (${maxDiff.toFixed(2)} max difference) - real data shows variation`);
            }
          }
        }
      }
    }
  }

  // Check 5: Garbage text columns
  const garbageColumns = variables.filter(v => v.notable?.includes("garbage"));
  if (garbageColumns.length > 0) {
    reasons.push(`${garbageColumns.map(v => v.name).join(", ")} contain random characters, not real data`);
  }

  return {
    isSynthetic: reasons.length >= 2,
    syntheticReasons: reasons,
  };
}

/**
 * Generate findings based on data analysis
 */
function generateFindings(
  data: DataSet,
  analysis: AnalysisResult,
  variables: VariableSummary[],
  isSynthetic: boolean
): DataInsight[] {
  const findings: DataInsight[] = [];
  const { correlations, statistics, summary, trends, outliers } = analysis;

  // Finding: Data cleanliness
  if ((summary?.missingPercent || 0) === 0) {
    findings.push({
      category: isSynthetic ? "warning" : "quality",
      title: "Perfect Data Completeness",
      description: "No missing values at all" + (isSynthetic ? " - suspiciously perfect for real-world data" : ""),
      severity: isSynthetic ? "warning" : "success",
    });
  } else if ((summary?.missingPercent || 0) > 0.1) {
    findings.push({
      category: "warning",
      title: "Missing Data Alert",
      description: `${((summary?.missingPercent || 0) * 100).toFixed(1)}% of values are missing - may need imputation`,
      severity: "warning",
    });
  }

  // Finding: Correlations
  if (correlations && correlations.length > 0) {
    const strongCorrs = correlations.filter(c => Math.abs(c.value) > 0.5);
    const maxCorr = correlations[0];

    if (strongCorrs.length > 0) {
      findings.push({
        category: "finding",
        title: "Strong Correlations Found",
        description: `${strongCorrs.length} variable pairs have correlation > 0.5. Strongest: ${maxCorr.column1} ↔ ${maxCorr.column2} (${maxCorr.value.toFixed(2)})`,
        severity: "success",
        evidence: strongCorrs.slice(0, 3).map(c => `${c.column1} ↔ ${c.column2}: ${c.value.toFixed(2)}`),
      });
    } else if (isSynthetic) {
      findings.push({
        category: "anomaly",
        title: "Zero Meaningful Correlations",
        description: `All correlations are near zero (max: ${Math.abs(maxCorr?.value || 0).toFixed(3)}). Nothing predicts anything - classic sign of random data.`,
        severity: "warning",
      });
    }
  }

  // Finding: Trends
  if (trends && trends.length > 0) {
    const significantTrends = trends.filter(t => Math.abs(t.changePercent) > 5);
    if (significantTrends.length > 0) {
      findings.push({
        category: "finding",
        title: "Significant Trends Detected",
        description: significantTrends.map(t =>
          `${t.column}: ${t.direction === "up" ? "↑" : "↓"} ${Math.abs(t.changePercent).toFixed(1)}%`
        ).join(", "),
        severity: "info",
      });
    }
  }

  // Finding: Outliers
  if (outliers && outliers.length > 0) {
    findings.push({
      category: "anomaly",
      title: "Outliers Detected",
      description: `Found ${outliers.length} outlier values that fall outside expected ranges`,
      severity: outliers.length > 10 ? "warning" : "info",
    });
  }

  // Finding: Data imbalance
  if (statistics) {
    for (const [col, stats] of Object.entries(statistics)) {
      if (stats.type === "categorical" && stats.topValues) {
        const total = stats.topValues.reduce((sum, v) => sum + v.count, 0);
        const topPct = (stats.topValues[0].count / total) * 100;
        if (topPct > 60) {
          findings.push({
            category: "pattern",
            title: `Imbalanced: ${col}`,
            description: `"${stats.topValues[0].value}" dominates with ${topPct.toFixed(0)}% of values`,
            severity: "info",
          });
        }
      }
    }
  }

  // Finding: Garbage columns
  const garbageCols = variables.filter(v => v.notable?.includes("garbage"));
  if (garbageCols.length > 0) {
    findings.push({
      category: "warning",
      title: "Garbage Data Detected",
      description: `${garbageCols.map(v => v.name).join(", ")} contain random characters, not usable data`,
      severity: "warning",
    });
  }

  return findings;
}

/**
 * Generate human-readable interpretation
 */
function generateInterpretation(
  data: DataSet,
  analysis: AnalysisResult,
  isSynthetic: boolean,
  syntheticReasons: string[]
): string {
  if (isSynthetic) {
    return `This looks like **synthetically generated data**, probably for practice or testing purposes. Here's why:

${syntheticReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Real data would show natural variation: category-level differences in metrics, age group patterns, geographic variation based on real-world factors. Here? Everything's flat. Suspiciously flat.`;
  }

  const { summary, correlations } = analysis;
  const parts: string[] = [];

  if ((summary?.missingPercent || 0) > 0.05) {
    parts.push(`The data has ${((summary?.missingPercent || 0) * 100).toFixed(1)}% missing values that may need handling.`);
  }

  if (correlations && correlations.length > 0 && Math.abs(correlations[0].value) > 0.5) {
    parts.push(`There's a strong relationship between ${correlations[0].column1} and ${correlations[0].column2} (${correlations[0].value.toFixed(2)}) worth investigating.`);
  }

  if (parts.length === 0) {
    parts.push("The data looks reasonably clean and ready for analysis.");
  }

  return parts.join(" ");
}

/**
 * Generate bottom line summary
 */
function generateBottomLine(isSynthetic: boolean, findings: DataInsight[]): string {
  if (isSynthetic) {
    return "Data is clean but likely synthetic. Fine for practice, but don't draw real conclusions from it.";
  }

  const warnings = findings.filter(f => f.severity === "warning" || f.severity === "critical");
  const positives = findings.filter(f => f.severity === "success");

  if (warnings.length > 2) {
    return `Several data quality issues need attention before analysis. Address the ${warnings.length} warnings first.`;
  }

  if (positives.length > 0) {
    return "Data quality looks good. Ready for deeper analysis.";
  }

  return "Data loaded successfully. Select an analysis type to dig deeper.";
}

/**
 * Format the EDA report for terminal display
 */
export function formatEDAForTerminal(report: EDAReport): string[] {
  const lines: string[] = [];

  // Header
  lines.push("## EDA Summary");
  lines.push("");

  // The Basics
  lines.push("**The Basics**");
  lines.push("");
  const cleanNote = report.overview.suspiciouslyClean ? " No missing values at all, which is nice... suspiciously nice, actually." : "";
  lines.push(`You've got ${report.overview.rows.toLocaleString()} rows across ${report.overview.columns} columns.${cleanNote}`);
  lines.push("");

  // Key Variables
  lines.push("**Key Variables:**");
  for (const v of report.variables) {
    const notable = v.notable ? ` ← ${v.notable}` : "";
    lines.push(`- **${v.name}** (${v.type}): ${v.description}${notable}`);
  }
  lines.push("");

  // Findings
  if (report.findings.length > 0) {
    lines.push('**The "Interesting" Findings**');
    lines.push("");
    for (const f of report.findings) {
      const icon = f.severity === "warning" ? "⚠️" : f.severity === "success" ? "✓" : "•";
      lines.push(`${icon} **${f.title}**: ${f.description}`);
      if (f.evidence) {
        for (const e of f.evidence) {
          lines.push(`   - ${e}`);
        }
      }
    }
    lines.push("");
  }

  // Interpretation
  lines.push("**What This Tells Me**");
  lines.push("");
  lines.push(report.interpretation);
  lines.push("");

  // Bottom Line
  lines.push("**Bottom Line**");
  lines.push("");
  lines.push(report.bottomLine);

  return lines;
}
