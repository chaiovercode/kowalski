// Export utilities for Kowalski Analytics
// "The data is ready for extraction, Skipper."

import { writeFileSync } from "fs";
import { join } from "path";
import type { DataSet, AnalysisResult } from "./types";
import type { EDAReport } from "./insights";

export interface ExportResult {
  success: boolean;
  path: string;
  format: "csv" | "json";
  rowCount: number;
  message: string;
}

/**
 * Export dataset to CSV format
 */
export function exportToCSV(
  data: DataSet,
  outputPath: string
): ExportResult {
  try {
    const lines: string[] = [];

    // Header row
    lines.push(data.columns.map(escapeCSV).join(","));

    // Data rows
    for (const row of data.rows) {
      lines.push(row.map((cell) => escapeCSV(String(cell ?? ""))).join(","));
    }

    const content = lines.join("\n");
    writeFileSync(outputPath, content, "utf-8");

    return {
      success: true,
      path: outputPath,
      format: "csv",
      rowCount: data.rows.length,
      message: `Exported ${data.rows.length} rows to ${outputPath}`,
    };
  } catch (error) {
    return {
      success: false,
      path: outputPath,
      format: "csv",
      rowCount: 0,
      message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Export dataset and analysis to JSON format
 */
export function exportToJSON(
  data: DataSet,
  analysis: AnalysisResult,
  report: EDAReport,
  outputPath: string
): ExportResult {
  try {
    const exportData = {
      metadata: {
        name: data.name,
        exportedAt: new Date().toISOString(),
        rowCount: data.rows.length,
        columnCount: data.columns.length,
      },
      schema: {
        columns: data.columns,
        types: data.types,
      },
      analysis: {
        summary: analysis.summary,
        correlations: analysis.correlations?.slice(0, 10),
        trends: analysis.trends,
        outliers: analysis.outliers?.slice(0, 50),
      },
      report: {
        overview: report.overview,
        findings: report.findings,
        interpretation: report.interpretation,
        bottomLine: report.bottomLine,
        isSynthetic: report.isSynthetic,
      },
      data: data.rows.slice(0, 1000).map((row) => {
        const obj: Record<string, unknown> = {};
        data.columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }),
      truncated: data.rows.length > 1000,
    };

    const content = JSON.stringify(exportData, null, 2);
    writeFileSync(outputPath, content, "utf-8");

    return {
      success: true,
      path: outputPath,
      format: "json",
      rowCount: data.rows.length,
      message: `Exported ${data.rows.length} rows with analysis to ${outputPath}`,
    };
  } catch (error) {
    return {
      success: false,
      path: outputPath,
      format: "json",
      rowCount: 0,
      message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Generate default export path
 */
export function getDefaultExportPath(dataName: string, format: "csv" | "json"): string {
  const baseName = dataName.replace(/\.[^.]+$/, ""); // Remove extension
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(process.cwd(), `${baseName}_export_${timestamp}.${format}`);
}

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export filtered data
 */
export function exportFilteredData(
  data: DataSet,
  analysis: AnalysisResult,
  report: EDAReport,
  format: "csv" | "json",
  outputPath?: string
): ExportResult {
  const path = outputPath || getDefaultExportPath(data.name, format);

  if (format === "csv") {
    return exportToCSV(data, path);
  } else {
    return exportToJSON(data, analysis, report, path);
  }
}
