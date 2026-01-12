// Kowalski Analyze Command
// Load and analyze data files

import { readFile } from "fs/promises";
import { resolve, basename } from "path";
import type { AnalyzeResult } from "../types";
import { kowalskiSay, formatConfidence } from "../personality";
import { parseData, cacheColumnData } from "../../../canvases/analytics/data-loader";
import { analyzeDataSet, generateInsights, generateCharts, generateKPIs } from "../../../canvases/analytics/stats";
import { generateEDAReport, type EDAReport } from "../../../canvases/analytics/insights";
import { spawnAnalytics } from "../../../api/canvas-api";
import type { DataSet, AnalysisResult } from "../../../canvases/analytics/types";

/**
 * Load and parse a data file
 */
export async function loadDataFile(filePath: string): Promise<DataSet> {
  const absolutePath = resolve(process.cwd(), filePath);
  const content = await readFile(absolutePath, "utf-8");
  const filename = basename(absolutePath);

  return parseData(content, filename);
}

/**
 * Perform full analysis on a dataset
 */
export function performAnalysis(data: DataSet): {
  analysis: AnalysisResult;
  insights: string[];
  edaReport: EDAReport;
} {
  // Cache column data for performance
  cacheColumnData(data);

  // Run statistical analysis
  const analysis = analyzeDataSet(data);

  // Generate insights
  const insights = generateInsights(data, analysis);

  // Generate EDA report
  const edaReport = generateEDAReport(data, analysis);

  return { analysis, insights, edaReport };
}

/**
 * Format analysis summary for text output
 */
export function formatAnalysisSummary(
  data: DataSet,
  analysis: AnalysisResult,
  edaReport: EDAReport
): string[] {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(kowalskiSay("status", `Analyzing ${data.name}...`));
  lines.push("");

  // Overview
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`DATASET: ${data.name}`);
  lines.push(`ROWS: ${data.rows.length.toLocaleString()} | COLUMNS: ${data.columns.length}`);
  lines.push(`NUMERIC: ${edaReport.overview.numericCols} | CATEGORICAL: ${edaReport.overview.categoricalCols}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  // Synthetic data warning
  if (edaReport.isSynthetic) {
    lines.push("⚠️  SYNTHETIC DATA DETECTED");
    lines.push("");
    for (const reason of edaReport.syntheticReasons.slice(0, 3)) {
      lines.push(`  • ${reason}`);
    }
    lines.push("");
  }

  // Key findings
  if (edaReport.findings.length > 0) {
    lines.push("KEY FINDINGS:");
    lines.push("");
    for (const finding of edaReport.findings.slice(0, 5)) {
      const icon = finding.severity === "warning" ? "⚠️" :
                   finding.severity === "success" ? "✓" :
                   finding.severity === "critical" ? "❌" : "•";
      lines.push(`${icon} ${finding.title}`);
      lines.push(`  ${finding.description}`);
    }
    lines.push("");
  }

  // Correlations
  if (analysis.correlations && analysis.correlations.length > 0) {
    lines.push("TOP CORRELATIONS:");
    lines.push("");
    for (const corr of analysis.correlations.slice(0, 3)) {
      const bar = formatConfidence(Math.abs(corr.value) * 100).split("]")[0] + "]";
      const sign = corr.value > 0 ? "+" : "";
      lines.push(`  ${corr.column1} ↔ ${corr.column2}: ${sign}${corr.value.toFixed(3)} ${bar}`);
    }
    lines.push("");
  }

  // Bottom line
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`BOTTOM LINE: ${edaReport.bottomLine}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return lines;
}

/**
 * Main analyze command handler
 */
export async function analyzeFile(
  filePath: string,
  options: { spawnCanvas?: boolean } = {}
): Promise<AnalyzeResult> {
  const { spawnCanvas: shouldSpawnCanvas = true } = options;

  try {
    // Load data
    const data = await loadDataFile(filePath);

    if (data.rows.length === 0) {
      return {
        success: false,
        datasetName: data.name,
        rows: 0,
        columns: data.columns.length,
        message: kowalskiSay("warning", "Dataset is empty. No rows to analyze."),
      };
    }

    // Perform analysis
    const { analysis, insights, edaReport } = performAnalysis(data);

    // Generate charts and KPIs
    const charts = generateCharts(data, analysis);
    const kpis = generateKPIs(data, analysis);

    // Spawn canvas if requested
    let canvasSpawned = false;
    if (shouldSpawnCanvas) {
      try {
        const result = await spawnAnalytics({
          title: `Analysis: ${data.name}`,
          data,
          analysis,
          charts,
          kpis,
          insights,
          phase: "eda",
        });

        canvasSpawned = result.success;
      } catch (err) {
        // Canvas spawn failed, continue with text output
        console.error("Canvas spawn failed:", err);
      }
    }

    // Format text summary
    const summary = formatAnalysisSummary(data, analysis, edaReport);

    return {
      success: true,
      datasetName: data.name,
      rows: data.rows.length,
      columns: data.columns.length,
      message: summary.join("\n"),
      canvasSpawned,
    };
  } catch (error) {
    return {
      success: false,
      datasetName: basename(filePath),
      rows: 0,
      columns: 0,
      message: kowalskiSay("error", (error as Error).message),
    };
  }
}
