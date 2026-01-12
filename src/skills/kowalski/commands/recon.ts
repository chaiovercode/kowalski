// Kowalski Recon Command
// Directory scanning and status reporting

import { readdir, stat, readFile } from "fs/promises";
import { join, extname } from "path";
import type { DataFile, ReconResult } from "../types";
import {
  kowalskiSay,
  formatReconSweep,
  KOWALSKI_BANNER,
} from "../personality";

const DATA_EXTENSIONS = [".csv", ".json", ".tsv"];

/**
 * Count lines in a file (fast heuristic for row count)
 */
async function countLines(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    // Subtract 1 for header row (assuming most CSV/TSV files have headers)
    return Math.max(0, lines.length - 1);
  } catch {
    return 0;
  }
}

/**
 * Check if file is a JSON array (to estimate row count)
 */
async function countJsonRows(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data.length;
    }
    // Try to find first array in object
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        return (value as unknown[]).length;
      }
    }
    return 1;
  } catch {
    return 0;
  }
}

/**
 * Scan a directory for data files
 */
export async function scanDirectory(dir: string): Promise<DataFile[]> {
  const files: DataFile[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (DATA_EXTENSIONS.includes(ext)) {
          const filePath = join(dir, entry.name);
          const fileExt = ext.slice(1) as "csv" | "json" | "tsv";

          let rows: number | undefined;
          if (fileExt === "json") {
            rows = await countJsonRows(filePath);
          } else {
            rows = await countLines(filePath);
          }

          files.push({
            name: entry.name,
            path: filePath,
            extension: fileExt,
            rows,
            status: "new", // TODO: Check against memory
          });
        }
      }
    }
  } catch (error) {
    // Directory might not exist or be inaccessible
    console.error(`Error scanning directory: ${error}`);
  }

  // Sort by name
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Perform recon sweep and return result
 */
export async function reconSweep(dir: string): Promise<ReconResult> {
  const files = await scanDirectory(dir);

  // TODO: Check memory for previous missions
  const memoryStatus: "empty" | "loaded" = "empty";

  return {
    files,
    memoryStatus,
  };
}

/**
 * Format recon result for display
 */
export function formatReconResult(result: ReconResult): string {
  const lines: string[] = [KOWALSKI_BANNER];

  lines.push("");
  lines.push(kowalskiSay("greeting", ""));
  lines.push("");

  if (result.files.length === 0) {
    lines.push("No data files detected in the current sector.");
    lines.push("To analyze data, provide a file path:");
    lines.push("  /kowalski analyze <path/to/file.csv>");
    lines.push("");
    lines.push("Supported formats: CSV, JSON, TSV");
  } else {
    lines.push(
      formatReconSweep(
        result.files.map((f) => ({
          name: f.name,
          rows: f.rows,
          status: f.status,
        })),
        result.memoryStatus,
        result.previousMissions
      )
    );
  }

  return lines.join("\n");
}
