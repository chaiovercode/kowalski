// Relationship Discovery Engine for Kowalski Analytics
// "Skipper, I've mapped the connections between these datasets."
//
// Implements REF: DU-002 (Relationship Discovery)
// See specs/README.md Section 3.2.2

import type { DataSet } from "./types";
import { getColumnValues } from "./data-loader";

/**
 * Relationship type between two datasets
 */
export type RelationshipType = "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";

/**
 * Match type for column detection
 */
export type MatchType = "exact" | "fuzzy" | "value_overlap";

/**
 * A discovered relationship between two datasets
 */
export interface Relationship {
  sourceDataset: string;
  sourceColumn: string;
  targetDataset: string;
  targetColumn: string;
  type: RelationshipType;
  matchType: MatchType;
  confidence: number;        // 0-100
  statistics: RelationshipStatistics;
}

/**
 * Statistics about a relationship
 */
export interface RelationshipStatistics {
  sourceUniqueCount: number;
  targetUniqueCount: number;
  matchedCount: number;
  sourceOrphanCount: number;
  targetOrphanCount: number;
  matchPercentage: number;
}

/**
 * Result of relationship discovery between datasets
 */
export interface RelationshipDiscoveryResult {
  datasets: string[];
  relationships: Relationship[];
  orphanAnalysis: OrphanAnalysis[];
  diagram: string;
  summary: string;
}

/**
 * Analysis of orphan records
 */
export interface OrphanAnalysis {
  dataset: string;
  column: string;
  orphanCount: number;
  sampleOrphans: (string | number)[];
  possibleReasons: string[];
}

/**
 * Column candidate for relationship matching
 */
interface ColumnCandidate {
  dataset: string;
  column: string;
  values: Set<string>;
  uniqueCount: number;
  totalCount: number;
}

// Common ID column name patterns
const ID_PATTERNS = [
  /^id$/i,
  /^.*_id$/i,
  /^.*Id$/,
  /^pk$/i,
  /^fk_/i,
  /^.*_key$/i,
  /^.*_code$/i,
  /^uuid$/i,
  /^guid$/i,
];

// Common naming variations for fuzzy matching
const FUZZY_MAPPINGS: Record<string, string[]> = {
  "customer": ["cust", "client", "buyer"],
  "product": ["prod", "item", "sku"],
  "order": ["ord", "purchase", "transaction"],
  "employee": ["emp", "staff", "worker"],
  "department": ["dept", "div", "division"],
  "category": ["cat", "type", "class"],
  "user": ["usr", "account", "member"],
};

/**
 * Find relationships between multiple datasets
 */
export function findRelationships(datasets: DataSet[]): RelationshipDiscoveryResult {
  if (datasets.length < 2) {
    return {
      datasets: datasets.map((d) => d.name),
      relationships: [],
      orphanAnalysis: [],
      diagram: "Need at least 2 datasets for relationship discovery",
      summary: "No relationships to discover with a single dataset.",
    };
  }

  // Step 1: Extract candidate columns from each dataset
  const candidates = extractCandidateColumns(datasets);

  // Step 2: Find relationships between candidates
  const relationships = matchCandidates(candidates);

  // Step 3: Analyze orphan records
  const orphanAnalysis = analyzeOrphans(relationships);

  // Step 4: Generate diagram
  const diagram = generateDiagram(datasets, relationships);

  // Step 5: Generate summary
  const summary = generateSummary(datasets, relationships, orphanAnalysis);

  return {
    datasets: datasets.map((d) => d.name),
    relationships,
    orphanAnalysis,
    diagram,
    summary,
  };
}

/**
 * Extract candidate columns that might be relationship keys
 */
function extractCandidateColumns(datasets: DataSet[]): ColumnCandidate[] {
  const candidates: ColumnCandidate[] = [];

  for (const dataset of datasets) {
    const { columns, rows } = dataset;

    for (let i = 0; i < columns.length; i++) {
      const colName = columns[i];

      // Check if column name suggests it's a key
      const isLikelyKey = ID_PATTERNS.some((pattern) => pattern.test(colName));

      // Get column values
      const values = getColumnValues(dataset, i);
      const nonNullValues = values.filter((v) => v !== null);
      const stringValues = new Set(nonNullValues.map((v) => String(v)));
      const uniqueCount = stringValues.size;
      const totalCount = nonNullValues.length;

      // Consider as candidate if:
      // 1. Name suggests it's a key, OR
      // 2. High uniqueness ratio (potential primary key)
      const uniqueRatio = totalCount > 0 ? uniqueCount / totalCount : 0;

      if (isLikelyKey || uniqueRatio > 0.5) {
        candidates.push({
          dataset: dataset.name,
          column: colName,
          values: stringValues,
          uniqueCount,
          totalCount,
        });
      }
    }
  }

  return candidates;
}

/**
 * Match candidate columns to find relationships
 */
function matchCandidates(candidates: ColumnCandidate[]): Relationship[] {
  const relationships: Relationship[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;

      const c1 = candidates[i];
      const c2 = candidates[j];

      // Skip if same dataset
      if (c1.dataset === c2.dataset) continue;

      // Skip if already processed this pair
      const pairKey = [c1.dataset, c1.column, c2.dataset, c2.column].sort().join("|");
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      // Check for relationship
      const relationship = checkRelationship(c1, c2);
      if (relationship) {
        relationships.push(relationship);
      }
    }
  }

  // Sort by confidence
  relationships.sort((a, b) => b.confidence - a.confidence);

  return relationships;
}

/**
 * Check if two columns have a relationship
 */
function checkRelationship(
  c1: ColumnCandidate,
  c2: ColumnCandidate
): Relationship | null {
  // Check match type
  const matchType = getMatchType(c1.column, c2.column);
  if (!matchType) return null;

  // Calculate value overlap
  const overlap = getValueOverlap(c1.values, c2.values);
  if (overlap.matchedCount === 0) return null;

  // Determine relationship type
  const type = determineRelationshipType(c1, c2, overlap);

  // Calculate confidence
  const confidence = calculateConfidence(matchType, overlap, c1, c2);

  // Only return if confidence is reasonable
  if (confidence < 30) return null;

  return {
    sourceDataset: c1.dataset,
    sourceColumn: c1.column,
    targetDataset: c2.dataset,
    targetColumn: c2.column,
    type,
    matchType,
    confidence,
    statistics: {
      sourceUniqueCount: c1.uniqueCount,
      targetUniqueCount: c2.uniqueCount,
      matchedCount: overlap.matchedCount,
      sourceOrphanCount: overlap.sourceOrphanCount,
      targetOrphanCount: overlap.targetOrphanCount,
      matchPercentage: overlap.matchPercentage,
    },
  };
}

/**
 * Determine if column names match and how
 */
function getMatchType(col1: string, col2: string): MatchType | null {
  const normalized1 = normalizeColumnName(col1);
  const normalized2 = normalizeColumnName(col2);

  // Exact match
  if (normalized1 === normalized2) {
    return "exact";
  }

  // Fuzzy match - check if they refer to same concept
  if (fuzzyMatch(normalized1, normalized2)) {
    return "fuzzy";
  }

  // Check for value overlap only if names are somewhat similar
  // (prevents matching unrelated columns with coincidental value overlap)
  if (hasSimilarStructure(col1, col2)) {
    return "value_overlap";
  }

  return null;
}

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\-\s]+/g, "_")
    .replace(/id$/i, "_id")
    .replace(/^(fk|pk)_/i, "");
}

/**
 * Check for fuzzy name match
 */
function fuzzyMatch(name1: string, name2: string): boolean {
  // Remove common suffixes for comparison
  const strip = (s: string) => s.replace(/_?(id|key|code|num|number)$/i, "");
  const base1 = strip(name1);
  const base2 = strip(name2);

  if (base1 === base2) return true;

  // Check fuzzy mappings
  for (const [canonical, variants] of Object.entries(FUZZY_MAPPINGS)) {
    const allForms = [canonical, ...variants];
    const match1 = allForms.some((f) => base1.includes(f));
    const match2 = allForms.some((f) => base2.includes(f));
    if (match1 && match2) return true;
  }

  return false;
}

/**
 * Check if columns have similar structure (both end in _id, etc.)
 */
function hasSimilarStructure(col1: string, col2: string): boolean {
  const suffixes = ["_id", "_key", "_code", "_num"];
  for (const suffix of suffixes) {
    if (col1.toLowerCase().endsWith(suffix) && col2.toLowerCase().endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate value overlap between two columns
 */
function getValueOverlap(
  values1: Set<string>,
  values2: Set<string>
): {
  matchedCount: number;
  sourceOrphanCount: number;
  targetOrphanCount: number;
  matchPercentage: number;
} {
  let matchedCount = 0;

  for (const v of values1) {
    if (values2.has(v)) {
      matchedCount++;
    }
  }

  const sourceOrphanCount = values1.size - matchedCount;
  const targetOrphanCount = values2.size - matchedCount;
  const totalUnique = values1.size + values2.size - matchedCount;
  const matchPercentage = totalUnique > 0 ? (matchedCount / Math.min(values1.size, values2.size)) * 100 : 0;

  return {
    matchedCount,
    sourceOrphanCount,
    targetOrphanCount,
    matchPercentage,
  };
}

/**
 * Determine relationship type based on uniqueness
 */
function determineRelationshipType(
  c1: ColumnCandidate,
  c2: ColumnCandidate,
  overlap: { matchedCount: number }
): RelationshipType {
  const c1UniqueRatio = c1.uniqueCount / c1.totalCount;
  const c2UniqueRatio = c2.uniqueCount / c2.totalCount;

  const c1IsPK = c1UniqueRatio > 0.95; // Likely primary key
  const c2IsPK = c2UniqueRatio > 0.95;

  if (c1IsPK && c2IsPK) {
    return "one_to_one";
  } else if (c1IsPK && !c2IsPK) {
    return "one_to_many";
  } else if (!c1IsPK && c2IsPK) {
    return "many_to_one";
  } else {
    return "many_to_many";
  }
}

/**
 * Calculate confidence in the relationship
 */
function calculateConfidence(
  matchType: MatchType,
  overlap: { matchPercentage: number; matchedCount: number },
  c1: ColumnCandidate,
  c2: ColumnCandidate
): number {
  let confidence = 0;

  // Base confidence from match type
  switch (matchType) {
    case "exact":
      confidence = 70;
      break;
    case "fuzzy":
      confidence = 50;
      break;
    case "value_overlap":
      confidence = 30;
      break;
  }

  // Adjust for value overlap
  if (overlap.matchPercentage > 80) {
    confidence += 20;
  } else if (overlap.matchPercentage > 50) {
    confidence += 10;
  } else if (overlap.matchPercentage < 20) {
    confidence -= 20;
  }

  // Adjust for matched count (more matches = more confident)
  if (overlap.matchedCount > 100) {
    confidence += 10;
  } else if (overlap.matchedCount < 10) {
    confidence -= 10;
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Analyze orphan records in relationships
 */
function analyzeOrphans(relationships: Relationship[]): OrphanAnalysis[] {
  const analyses: OrphanAnalysis[] = [];

  for (const rel of relationships) {
    // Source orphans
    if (rel.statistics.sourceOrphanCount > 0) {
      analyses.push({
        dataset: rel.sourceDataset,
        column: rel.sourceColumn,
        orphanCount: rel.statistics.sourceOrphanCount,
        sampleOrphans: [], // Would need actual data to populate
        possibleReasons: getPossibleOrphanReasons(rel, "source"),
      });
    }

    // Target orphans
    if (rel.statistics.targetOrphanCount > 0) {
      analyses.push({
        dataset: rel.targetDataset,
        column: rel.targetColumn,
        orphanCount: rel.statistics.targetOrphanCount,
        sampleOrphans: [],
        possibleReasons: getPossibleOrphanReasons(rel, "target"),
      });
    }
  }

  return analyses;
}

/**
 * Get possible reasons for orphan records
 */
function getPossibleOrphanReasons(rel: Relationship, side: "source" | "target"): string[] {
  const reasons: string[] = [];
  const orphanCount = side === "source"
    ? rel.statistics.sourceOrphanCount
    : rel.statistics.targetOrphanCount;

  const orphanPercent = (orphanCount / (side === "source"
    ? rel.statistics.sourceUniqueCount
    : rel.statistics.targetUniqueCount)) * 100;

  if (orphanPercent > 50) {
    reasons.push("Data export timing mismatch");
    reasons.push("Different data periods or filters applied");
  } else if (orphanPercent > 10) {
    reasons.push("Records deleted from related table");
    reasons.push("Data entry errors or inconsistencies");
  } else {
    reasons.push("Recent records not yet synced");
    reasons.push("Test/demo data mixed with production");
  }

  return reasons;
}

/**
 * Generate ASCII diagram of relationships
 */
function generateDiagram(datasets: DataSet[], relationships: Relationship[]): string {
  if (relationships.length === 0) {
    return "No relationships detected between datasets.";
  }

  const lines: string[] = [
    "┌─────────────────────────────────────────────────────────────┐",
    "│              RELATIONSHIP DIAGRAM                           │",
    "└─────────────────────────────────────────────────────────────┘",
    "",
  ];

  // Group relationships by dataset pair
  const pairs = new Map<string, Relationship[]>();
  for (const rel of relationships) {
    const key = `${rel.sourceDataset}|${rel.targetDataset}`;
    if (!pairs.has(key)) {
      pairs.set(key, []);
    }
    pairs.get(key)!.push(rel);
  }

  // Draw each relationship
  for (const [key, rels] of pairs) {
    const [ds1, ds2] = key.split("|");
    const mainRel = rels[0]; // Use highest confidence relationship

    const arrow = getArrowForType(mainRel.type);
    const matchPct = mainRel.statistics.matchPercentage.toFixed(0);

    lines.push(`  ┌────────────────┐           ┌────────────────┐`);
    lines.push(`  │ ${ds1.padEnd(14)} │           │ ${ds2.padEnd(14)} │`);
    lines.push(`  └───────┬────────┘           └───────┬────────┘`);
    lines.push(`          │                           │`);
    lines.push(`   ${mainRel.sourceColumn.padEnd(14)}  ${arrow}  ${mainRel.targetColumn.padEnd(14)}`);
    lines.push(`          │    (${matchPct}% match)     │`);
    lines.push(``);
  }

  return lines.join("\n");
}

/**
 * Get arrow symbol for relationship type
 */
function getArrowForType(type: RelationshipType): string {
  switch (type) {
    case "one_to_one":
      return "──────";
    case "one_to_many":
      return "──────<";
    case "many_to_one":
      return ">──────";
    case "many_to_many":
      return ">────<";
    default:
      return "──────";
  }
}

/**
 * Generate summary of relationship discovery
 */
function generateSummary(
  datasets: DataSet[],
  relationships: Relationship[],
  orphanAnalysis: OrphanAnalysis[]
): string {
  const lines: string[] = [
    `Analyzed ${datasets.length} datasets for relationships.`,
  ];

  if (relationships.length === 0) {
    lines.push("No relationships detected between the datasets.");
    lines.push("");
    lines.push("Possible reasons:");
    lines.push("  • No common column names or patterns");
    lines.push("  • Completely different value ranges");
    lines.push("  • Datasets are not related");
  } else {
    lines.push(`Found ${relationships.length} potential relationship(s):`);
    lines.push("");

    for (const rel of relationships.slice(0, 5)) {
      const typeStr = rel.type.replace(/_/g, "-");
      lines.push(`  • ${rel.sourceDataset}.${rel.sourceColumn} → ${rel.targetDataset}.${rel.targetColumn}`);
      lines.push(`    Type: ${typeStr}, Confidence: ${rel.confidence}%, Match: ${rel.statistics.matchPercentage.toFixed(1)}%`);
    }

    if (orphanAnalysis.length > 0) {
      const totalOrphans = orphanAnalysis.reduce((sum, a) => sum + a.orphanCount, 0);
      lines.push("");
      lines.push(`⚠️ Found ${totalOrphans} orphan records across ${orphanAnalysis.length} column(s).`);
    }
  }

  return lines.join("\n");
}

/**
 * Format relationship discovery result in Kowalski's voice
 */
export function formatRelationshipKowalski(result: RelationshipDiscoveryResult): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════",
    "  KOWALSKI RELATIONSHIP INTEL",
    "═══════════════════════════════════════════════════════════",
    "",
  ];

  if (result.relationships.length === 0) {
    lines.push("Skipper, my analysis shows no detectable relationships");
    lines.push("between these datasets. They appear to be independent.");
    lines.push("");
    lines.push("Recommendations:");
    lines.push("  1. Verify these are the correct datasets");
    lines.push("  2. Check if a join column exists with different naming");
    lines.push("  3. Consider if data was filtered differently");
  } else {
    lines.push(`Skipper, I've mapped ${result.relationships.length} relationship(s):`);
    lines.push("");

    for (const rel of result.relationships) {
      const confidence = rel.confidence >= 80 ? "HIGH" : rel.confidence >= 50 ? "MEDIUM" : "LOW";
      lines.push(`📊 ${rel.sourceDataset}.${rel.sourceColumn} ↔ ${rel.targetDataset}.${rel.targetColumn}`);
      lines.push(`   Type: ${rel.type.replace(/_/g, " ")} | Confidence: ${confidence} (${rel.confidence}%)`);
      lines.push(`   Match: ${rel.statistics.matchPercentage.toFixed(1)}% | Orphans: ${rel.statistics.sourceOrphanCount + rel.statistics.targetOrphanCount}`);
      lines.push("");
    }

    if (result.orphanAnalysis.length > 0) {
      lines.push("⚠️ DATA INTEGRITY NOTE:");
      for (const orphan of result.orphanAnalysis.slice(0, 3)) {
        lines.push(`   ${orphan.dataset}.${orphan.column}: ${orphan.orphanCount} orphan records`);
      }
      lines.push("");
    }

    // Suggest join strategy
    const bestRel = result.relationships[0];
    lines.push("💡 RECOMMENDED JOIN:");
    lines.push(`   SELECT * FROM ${bestRel.sourceDataset}`);
    lines.push(`   ${bestRel.type === "one_to_many" ? "LEFT" : "INNER"} JOIN ${bestRel.targetDataset}`);
    lines.push(`   ON ${bestRel.sourceColumn} = ${bestRel.targetColumn}`);
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}
