// Kowalski Session Memory
// "I remember everything, Skipper. EVERYTHING."
//
// Tracks analysis history across files and sessions for cross-dataset insights

import type { DataSet, AnalysisResult } from "./types";
import type { DeepAnalysisResult, DeepInsight } from "./deep-insights";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ============================================
// Types
// ============================================

export interface AnalysisMemory {
  id: string;
  timestamp: number;
  filename: string;
  filepath: string;
  summary: DatasetSummary;
  keyInsights: string[];
  columns: string[];
  rowCount: number;
  checksum: string; // To detect if file changed
}

export interface DatasetSummary {
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  topCorrelations: { col1: string; col2: string; value: number }[];
  qualityScore: number;
}

export interface CrossDatasetInsight {
  type: "common_columns" | "possible_join" | "value_overlap" | "schema_similarity" | "time_series";
  confidence: number;
  datasets: string[];
  description: string;
  details: string[];
  suggestion: string;
}

export interface SessionState {
  memories: AnalysisMemory[];
  lastAnalysis?: string;
  crossInsights: CrossDatasetInsight[];
}

// ============================================
// Memory Manager
// ============================================

const MEMORY_DIR = join(homedir(), ".kowalski");
const MEMORY_FILE = join(MEMORY_DIR, "session-memory.json");
const MAX_MEMORIES = 20;

/**
 * Load session state from disk
 */
export function loadSession(): SessionState {
  try {
    if (existsSync(MEMORY_FILE)) {
      const content = readFileSync(MEMORY_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignore errors, start fresh
  }
  return { memories: [], crossInsights: [] };
}

/**
 * Save session state to disk
 */
export function saveSession(state: SessionState): void {
  try {
    if (!existsSync(MEMORY_DIR)) {
      mkdirSync(MEMORY_DIR, { recursive: true });
    }
    writeFileSync(MEMORY_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Remember an analysis
 */
export function rememberAnalysis(
  data: DataSet,
  analysis: AnalysisResult,
  deepAnalysis: DeepAnalysisResult,
  filepath: string
): AnalysisMemory {
  const session = loadSession();

  // Create checksum from first few rows
  const checksum = simpleHash(JSON.stringify(data.rows.slice(0, 10)));

  // Check if we already have this file
  const existingIndex = session.memories.findIndex(m => m.filepath === filepath);

  const memory: AnalysisMemory = {
    id: `analysis-${Date.now()}`,
    timestamp: Date.now(),
    filename: data.name,
    filepath,
    summary: {
      numericColumns: Object.entries(analysis.statistics)
        .filter(([_, s]) => s.type === "numeric")
        .map(([col, _]) => col),
      categoricalColumns: Object.entries(analysis.statistics)
        .filter(([_, s]) => s.type === "categorical")
        .map(([col, _]) => col),
      dateColumns: Object.entries(analysis.statistics)
        .filter(([_, s]) => s.type === "date")
        .map(([col, _]) => col),
      topCorrelations: (analysis.correlations || []).slice(0, 5).map(c => ({
        col1: c.column1,
        col2: c.column2,
        value: c.value,
      })),
      qualityScore: deepAnalysis.dataQuality.score,
    },
    keyInsights: deepAnalysis.insights.slice(0, 5).map(i => i.title),
    columns: data.columns,
    rowCount: data.rows.length,
    checksum,
  };

  // Update or add memory
  if (existingIndex >= 0) {
    session.memories[existingIndex] = memory;
  } else {
    session.memories.unshift(memory);
    // Keep only recent memories
    if (session.memories.length > MAX_MEMORIES) {
      session.memories = session.memories.slice(0, MAX_MEMORIES);
    }
  }

  session.lastAnalysis = memory.id;

  // Find cross-dataset insights
  session.crossInsights = findCrossDatasetInsights(session.memories);

  saveSession(session);
  return memory;
}

/**
 * Get recent analyses
 */
export function getRecentAnalyses(limit = 5): AnalysisMemory[] {
  const session = loadSession();
  return session.memories.slice(0, limit);
}

/**
 * Get cross-dataset insights
 */
export function getCrossDatasetInsights(): CrossDatasetInsight[] {
  const session = loadSession();
  return session.crossInsights;
}

/**
 * Clear session memory
 */
export function clearMemory(): void {
  saveSession({ memories: [], crossInsights: [] });
}

// ============================================
// Cross-Dataset Analysis
// ============================================

function findCrossDatasetInsights(memories: AnalysisMemory[]): CrossDatasetInsight[] {
  const insights: CrossDatasetInsight[] = [];

  if (memories.length < 2) return insights;

  // Compare each pair of datasets
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const m1 = memories[i];
      const m2 = memories[j];

      // Check for common columns
      const commonCols = m1.columns.filter(c => m2.columns.includes(c));
      if (commonCols.length > 0) {
        insights.push({
          type: "common_columns",
          confidence: Math.min(90, 50 + commonCols.length * 10),
          datasets: [m1.filename, m2.filename],
          description: `${commonCols.length} common column${commonCols.length > 1 ? "s" : ""} between "${m1.filename}" and "${m2.filename}"`,
          details: [`Common columns: ${commonCols.slice(0, 5).join(", ")}${commonCols.length > 5 ? "..." : ""}`],
          suggestion: commonCols.length >= 2
            ? `These datasets may be joinable on: ${commonCols.slice(0, 2).join(", ")}`
            : `Possible join key: ${commonCols[0]}`,
        });
      }

      // Check for possible ID column matches
      const idPatterns = ["id", "_id", "key", "code"];
      const m1IdCols = m1.columns.filter(c => idPatterns.some(p => c.toLowerCase().includes(p)));
      const m2IdCols = m2.columns.filter(c => idPatterns.some(p => c.toLowerCase().includes(p)));

      for (const id1 of m1IdCols) {
        for (const id2 of m2IdCols) {
          const similar = areSimilarNames(id1, id2);
          if (similar && id1 !== id2) {
            insights.push({
              type: "possible_join",
              confidence: 70,
              datasets: [m1.filename, m2.filename],
              description: `Possible join relationship: "${m1.filename}.${id1}" ↔ "${m2.filename}.${id2}"`,
              details: ["Column names suggest a foreign key relationship"],
              suggestion: `Try joining on ${id1} = ${id2}`,
            });
          }
        }
      }

      // Check for schema similarity
      const schemaSimilarity = commonCols.length / Math.max(m1.columns.length, m2.columns.length);
      if (schemaSimilarity > 0.7) {
        insights.push({
          type: "schema_similarity",
          confidence: 85,
          datasets: [m1.filename, m2.filename],
          description: `"${m1.filename}" and "${m2.filename}" have ${(schemaSimilarity * 100).toFixed(0)}% schema overlap`,
          details: [
            "These might be the same data from different time periods or sources",
            `${m1.filename}: ${m1.columns.length} columns, ${m1.rowCount} rows`,
            `${m2.filename}: ${m2.columns.length} columns, ${m2.rowCount} rows`,
          ],
          suggestion: "Consider combining these datasets or comparing their differences",
        });
      }
    }
  }

  // Sort by confidence
  insights.sort((a, b) => b.confidence - a.confidence);

  return insights.slice(0, 10);
}

function areSimilarNames(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().replace(/[_\-\s]/g, "");
  const n2 = name2.toLowerCase().replace(/[_\-\s]/g, "");

  if (n1 === n2) return true;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check for common variations
  const variations: Record<string, string[]> = {
    "customerid": ["custid", "customer_id", "cust_id", "clientid"],
    "productid": ["prodid", "product_id", "prod_id", "itemid"],
    "orderid": ["ordid", "order_id", "ord_id"],
    "userid": ["user_id", "uid", "accountid"],
  };

  for (const [base, vars] of Object.entries(variations)) {
    const allForms = [base, ...vars];
    if (allForms.includes(n1) && allForms.includes(n2)) {
      return true;
    }
  }

  return false;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ============================================
// Format for Display
// ============================================

/**
 * Format memory state for display
 */
export function formatMemoryStatus(): string {
  const session = loadSession();
  const lines: string[] = [];

  if (session.memories.length === 0) {
    return "No previous analyses remembered. Run /kowalski <file> to start.";
  }

  lines.push(`📊 KOWALSKI MEMORY: ${session.memories.length} dataset${session.memories.length > 1 ? "s" : ""} remembered`);
  lines.push("");

  for (const memory of session.memories.slice(0, 5)) {
    const age = formatAge(memory.timestamp);
    lines.push(`• ${memory.filename} (${memory.rowCount.toLocaleString()} rows) - ${age}`);
  }

  if (session.crossInsights.length > 0) {
    lines.push("");
    lines.push("🔗 CROSS-DATASET INSIGHTS:");
    for (const insight of session.crossInsights.slice(0, 3)) {
      lines.push(`• ${insight.description}`);
    }
  }

  return lines.join("\n");
}

function formatAge(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format comparison between two datasets
 */
export function formatDatasetComparison(file1: string, file2: string): string {
  const session = loadSession();
  const m1 = session.memories.find(m => m.filename === file1 || m.filepath.includes(file1));
  const m2 = session.memories.find(m => m.filename === file2 || m.filepath.includes(file2));

  if (!m1 || !m2) {
    return `Cannot compare: ${!m1 ? file1 : file2} not found in memory. Run /kowalski on both files first.`;
  }

  const lines: string[] = [];
  lines.push(`📊 COMPARISON: ${m1.filename} vs ${m2.filename}`);
  lines.push("");

  // Size comparison
  lines.push("SIZE:");
  lines.push(`• ${m1.filename}: ${m1.rowCount.toLocaleString()} rows, ${m1.columns.length} columns`);
  lines.push(`• ${m2.filename}: ${m2.rowCount.toLocaleString()} rows, ${m2.columns.length} columns`);
  lines.push("");

  // Schema comparison
  const commonCols = m1.columns.filter(c => m2.columns.includes(c));
  const onlyIn1 = m1.columns.filter(c => !m2.columns.includes(c));
  const onlyIn2 = m2.columns.filter(c => !m1.columns.includes(c));

  lines.push("SCHEMA:");
  lines.push(`• Common columns (${commonCols.length}): ${commonCols.slice(0, 5).join(", ")}${commonCols.length > 5 ? "..." : ""}`);
  if (onlyIn1.length > 0) {
    lines.push(`• Only in ${m1.filename} (${onlyIn1.length}): ${onlyIn1.slice(0, 3).join(", ")}${onlyIn1.length > 3 ? "..." : ""}`);
  }
  if (onlyIn2.length > 0) {
    lines.push(`• Only in ${m2.filename} (${onlyIn2.length}): ${onlyIn2.slice(0, 3).join(", ")}${onlyIn2.length > 3 ? "..." : ""}`);
  }
  lines.push("");

  // Quality comparison
  lines.push("DATA QUALITY:");
  lines.push(`• ${m1.filename}: ${m1.summary.qualityScore}/100`);
  lines.push(`• ${m2.filename}: ${m2.summary.qualityScore}/100`);

  // Suggestion
  lines.push("");
  if (commonCols.length > 0) {
    lines.push(`💡 These datasets share ${commonCols.length} column${commonCols.length > 1 ? "s" : ""} and may be joinable.`);
  } else {
    lines.push("💡 No common columns found. These datasets appear unrelated.");
  }

  return lines.join("\n");
}
