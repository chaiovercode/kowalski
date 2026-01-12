// Kowalski Compare Command
// Compare two datasets and find relationships between them
//
// Implements Phase 4.3 of the implementation plan
// See specs/README.md Section 3.2.2 (REF: DU-002)

import { basename } from "path";
import type { CompareResult, Relationship } from "../types";
import { kowalskiSay } from "../personality";
import { loadDataFile } from "./analyze";
import {
  findRelationships,
  formatRelationshipKowalski,
  type Relationship as DiscoveredRelationship,
  type RelationshipDiscoveryResult,
} from "../../../canvases/analytics/relationships";
import type { DataSet } from "../../../canvases/analytics/types";

/**
 * Options for compare command
 */
export interface CompareOptions {
  /** Whether to show detailed orphan analysis */
  detailed?: boolean;
  /** Minimum confidence threshold to report (0-100) */
  minConfidence?: number;
}

/**
 * Convert internal relationship type to skill type format
 */
function convertRelationshipType(
  type: DiscoveredRelationship["type"]
): Relationship["type"] {
  switch (type) {
    case "one_to_one":
      return "one-to-one";
    case "one_to_many":
    case "many_to_one":
      return "one-to-many";
    case "many_to_many":
      return "many-to-many";
    default:
      return "many-to-many";
  }
}

/**
 * Convert discovered relationships to skill type format
 */
function convertRelationships(
  discovered: DiscoveredRelationship[],
  minConfidence: number = 0
): Relationship[] {
  return discovered
    .filter((r) => r.confidence >= minConfidence)
    .map((r) => ({
      type: convertRelationshipType(r.type),
      leftColumn: r.sourceColumn,
      rightColumn: r.targetColumn,
      confidence: r.confidence,
      matchPercentage: r.statistics.matchPercentage,
      orphanCount:
        r.statistics.sourceOrphanCount + r.statistics.targetOrphanCount,
    }));
}

/**
 * Format detailed comparison result with Kowalski voice
 */
function formatCompareResult(
  file1: string,
  file2: string,
  data1: DataSet,
  data2: DataSet,
  result: RelationshipDiscoveryResult,
  options: CompareOptions
): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(kowalskiSay("status", "Analyzing relationship topology..."));
  lines.push("");

  // Dataset overview
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("DATASETS UNDER ANALYSIS");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(
    `  ${basename(file1)}: ${data1.rows.length.toLocaleString()} rows, ${data1.columns.length} columns`
  );
  lines.push(
    `  ${basename(file2)}: ${data2.rows.length.toLocaleString()} rows, ${data2.columns.length} columns`
  );
  lines.push("");

  // Use the formatted Kowalski output
  lines.push(formatRelationshipKowalski(result));

  // Add diagram if relationships found
  if (result.relationships.length > 0 && options.detailed) {
    lines.push("");
    lines.push(result.diagram);
  }

  return lines.join("\n");
}

/**
 * Main compare command handler
 *
 * Loads two data files and discovers relationships between them
 */
export async function compareFiles(
  file1: string,
  file2: string,
  options: CompareOptions = {}
): Promise<CompareResult> {
  const { detailed = false, minConfidence = 30 } = options;

  try {
    // Load both datasets
    const [data1, data2] = await Promise.all([
      loadDataFile(file1),
      loadDataFile(file2),
    ]);

    // Validate datasets have data
    if (data1.rows.length === 0) {
      return {
        success: false,
        file1: basename(file1),
        file2: basename(file2),
        relationships: [],
        message: kowalskiSay(
          "warning",
          `Dataset ${basename(file1)} is empty. Cannot analyze relationships.`
        ),
      };
    }

    if (data2.rows.length === 0) {
      return {
        success: false,
        file1: basename(file1),
        file2: basename(file2),
        relationships: [],
        message: kowalskiSay(
          "warning",
          `Dataset ${basename(file2)} is empty. Cannot analyze relationships.`
        ),
      };
    }

    // Find relationships between datasets
    const discoveryResult = findRelationships([data1, data2]);

    // Convert to skill type format
    const relationships = convertRelationships(
      discoveryResult.relationships,
      minConfidence
    );

    // Format output message
    const message = formatCompareResult(
      file1,
      file2,
      data1,
      data2,
      discoveryResult,
      { detailed, minConfidence }
    );

    return {
      success: true,
      file1: basename(file1),
      file2: basename(file2),
      relationships,
      message,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      file1: basename(file1),
      file2: basename(file2),
      relationships: [],
      message: kowalskiSay("error", `Failed to compare files: ${errorMessage}`),
    };
  }
}
