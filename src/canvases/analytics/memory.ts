// Kowalski Memory Manager
// "I never forget a dataset, Skipper. It's all up here."
//
// Implements REF: MEM-001, MEM-002 (Memory Storage and Retrieval)
// See specs/README.md Section 3.4

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { DataSet, AnalysisResult, Correlation, Trend } from "./types";
import type { SchemaInference, SemanticType } from "./understanding";
import type { Relationship } from "./relationships";
import crypto from "crypto";

/**
 * Dataset fingerprint for identification
 */
export interface DatasetFingerprint {
  name: string;
  rowCount: number;
  columns: string[];
  columnHash: string;  // Hash of column names for quick matching
  sampleHash: string;  // Hash of first 100 rows for content matching
}

/**
 * Stored column semantic information
 */
export interface ColumnMemo {
  name: string;
  semanticType: SemanticType;
  confidence: number;
  userProvided: boolean;  // True if user explicitly set this
  notes?: string;
}

/**
 * Stored dataset information
 */
export interface DatasetMemo {
  fingerprint: DatasetFingerprint;
  firstSeen: string;
  lastAnalyzed: string;
  analysisCount: number;
  columnSemantics: ColumnMemo[];
  relationships: StoredRelationship[];
  findings: StoredFinding[];
  notes?: string;
}

/**
 * Stored relationship between datasets
 */
export interface StoredRelationship {
  targetDataset: string;
  sourceColumn: string;
  targetColumn: string;
  type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  confidence: number;
}

/**
 * Stored analysis finding
 */
export interface StoredFinding {
  type: "correlation" | "trend" | "anomaly" | "insight";
  summary: string;
  details?: string;
  confidence: number;
  timestamp: string;
}

/**
 * User preferences for Kowalski
 */
export interface UserPreferences {
  chartType: "bar" | "line" | "scatter" | "pie" | "auto";
  colorScheme: "dark" | "light" | "kowalski";
  exportFormat: "png" | "svg" | "csv" | "json";
  autoSpawnDashboard: boolean;
  verbosityLevel: "brief" | "normal" | "detailed";
}

/**
 * Complete memory structure for Kowalski
 */
export interface KowalskiMemory {
  version: string;
  lastUpdated: string;
  datasets: DatasetMemo[];
  preferences: UserPreferences;
  missionCount: number;
}

/**
 * Default user preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  chartType: "auto",
  colorScheme: "kowalski",
  exportFormat: "png",
  autoSpawnDashboard: true,
  verbosityLevel: "normal",
};

/**
 * Empty memory structure
 */
const EMPTY_MEMORY: KowalskiMemory = {
  version: "1.0",
  lastUpdated: new Date().toISOString(),
  datasets: [],
  preferences: DEFAULT_PREFERENCES,
  missionCount: 0,
};

/**
 * Memory section header in CLAUDE.md
 */
const MEMORY_SECTION_START = "## Kowalski Intel";
const MEMORY_SECTION_END = "<!-- /Kowalski Intel -->";

/**
 * Memory Manager class for cross-session persistence
 */
export class MemoryManager {
  private memory: KowalskiMemory;
  private claudeMdPath: string;
  private dirty: boolean = false;

  constructor(projectRoot?: string) {
    this.claudeMdPath = projectRoot
      ? join(projectRoot, "CLAUDE.md")
      : this.findClaudeMd();
    // Create a fresh copy of empty memory to avoid shared state
    this.memory = this.createFreshMemory();
  }

  /**
   * Find CLAUDE.md by walking up directories
   */
  private findClaudeMd(): string {
    let dir = process.cwd();
    while (dir !== "/") {
      const candidate = join(dir, "CLAUDE.md");
      if (existsSync(candidate)) {
        return candidate;
      }
      dir = dirname(dir);
    }
    // Default to current directory if not found
    return join(process.cwd(), "CLAUDE.md");
  }

  /**
   * Load memory from CLAUDE.md
   */
  async load(): Promise<void> {
    if (!existsSync(this.claudeMdPath)) {
      this.memory = this.createFreshMemory();
      return;
    }

    try {
      const content = readFileSync(this.claudeMdPath, "utf-8");
      const parsed = this.parseMemoryFromMarkdown(content);
      if (parsed) {
        this.memory = parsed;
      } else {
        this.memory = this.createFreshMemory();
      }
    } catch {
      this.memory = this.createFreshMemory();
    }
  }

  /**
   * Create a fresh memory object (avoids shared state)
   */
  private createFreshMemory(): KowalskiMemory {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      datasets: [],
      preferences: { ...DEFAULT_PREFERENCES },
      missionCount: 0,
    };
  }

  /**
   * Save memory to CLAUDE.md
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    this.memory.lastUpdated = new Date().toISOString();

    let content = "";
    if (existsSync(this.claudeMdPath)) {
      content = readFileSync(this.claudeMdPath, "utf-8");
    }

    const memoryMarkdown = this.serializeMemoryToMarkdown();
    content = this.insertOrReplaceMemorySection(content, memoryMarkdown);

    writeFileSync(this.claudeMdPath, content, "utf-8");
    this.dirty = false;
  }

  /**
   * Parse memory from CLAUDE.md content
   */
  private parseMemoryFromMarkdown(content: string): KowalskiMemory | null {
    const startIdx = content.indexOf(MEMORY_SECTION_START);
    const endIdx = content.indexOf(MEMORY_SECTION_END);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      return null;
    }

    const section = content.slice(startIdx + MEMORY_SECTION_START.length, endIdx).trim();

    // Look for JSON block
    const jsonMatch = section.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      return null;
    }

    try {
      const data = JSON.parse(jsonMatch[1]);
      return {
        version: data.version || "1.0",
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        datasets: data.datasets || [],
        preferences: { ...DEFAULT_PREFERENCES, ...data.preferences },
        missionCount: data.missionCount || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Serialize memory to markdown format
   */
  private serializeMemoryToMarkdown(): string {
    const lines: string[] = [
      MEMORY_SECTION_START,
      "",
      "### Known Datasets",
      "",
    ];

    // Human-readable dataset summaries
    for (const ds of this.memory.datasets) {
      const cols = ds.fingerprint.columns.slice(0, 5).join(", ");
      const colsSuffix = ds.fingerprint.columns.length > 5
        ? `, ... +${ds.fingerprint.columns.length - 5} more`
        : "";
      lines.push(`- \`${ds.fingerprint.name}\`: ${ds.fingerprint.rowCount.toLocaleString()} rows, columns: ${cols}${colsSuffix}`);

      // Show relationships
      if (ds.relationships.length > 0) {
        lines.push(`  - Relationships: ${ds.relationships.map(r => `${r.sourceColumn} → ${r.targetDataset}.${r.targetColumn}`).join(", ")}`);
      }

      // Show key findings
      const recentFindings = ds.findings.slice(-2);
      for (const finding of recentFindings) {
        lines.push(`  - ${finding.summary}`);
      }
    }

    if (this.memory.datasets.length === 0) {
      lines.push("*No datasets analyzed yet*");
    }

    lines.push("");
    lines.push("### User Preferences");
    lines.push("");
    lines.push(`- Chart type: ${this.memory.preferences.chartType}`);
    lines.push(`- Export format: ${this.memory.preferences.exportFormat}`);
    lines.push(`- Color scheme: ${this.memory.preferences.colorScheme}`);

    lines.push("");
    lines.push("### Mission Log");
    lines.push("");
    lines.push(`- Total missions: ${this.memory.missionCount}`);
    lines.push(`- Last updated: ${this.memory.lastUpdated}`);

    // Include full JSON for programmatic access
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(this.memory, null, 2));
    lines.push("```");
    lines.push("");
    lines.push(MEMORY_SECTION_END);

    return lines.join("\n");
  }

  /**
   * Insert or replace memory section in CLAUDE.md content
   */
  private insertOrReplaceMemorySection(content: string, memorySection: string): string {
    const startIdx = content.indexOf(MEMORY_SECTION_START);
    const endIdx = content.indexOf(MEMORY_SECTION_END);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      // Replace existing section
      return (
        content.slice(0, startIdx) +
        memorySection +
        content.slice(endIdx + MEMORY_SECTION_END.length)
      );
    } else {
      // Append new section
      return content.trimEnd() + "\n\n" + memorySection + "\n";
    }
  }

  // === Dataset Memory Methods ===

  /**
   * Create a fingerprint for a dataset
   */
  createFingerprint(data: DataSet): DatasetFingerprint {
    const columnHash = crypto
      .createHash("md5")
      .update(data.columns.join("|"))
      .digest("hex")
      .slice(0, 8);

    // Sample first 100 rows for content hash
    const sampleRows = data.rows.slice(0, 100);
    const sampleHash = crypto
      .createHash("md5")
      .update(JSON.stringify(sampleRows))
      .digest("hex")
      .slice(0, 8);

    return {
      name: data.name,
      rowCount: data.rows.length,
      columns: [...data.columns],
      columnHash,
      sampleHash,
    };
  }

  /**
   * Remember a dataset
   */
  rememberDataset(data: DataSet, schema?: SchemaInference): DatasetMemo {
    const fingerprint = this.createFingerprint(data);
    const existing = this.findDatasetByFingerprint(fingerprint);

    if (existing) {
      // Update existing memo
      existing.lastAnalyzed = new Date().toISOString();
      existing.analysisCount++;

      // Update schema if provided
      if (schema) {
        this.updateColumnSemantics(existing, schema);
      }

      this.dirty = true;
      return existing;
    }

    // Create new memo
    const memo: DatasetMemo = {
      fingerprint,
      firstSeen: new Date().toISOString(),
      lastAnalyzed: new Date().toISOString(),
      analysisCount: 1,
      columnSemantics: schema
        ? schema.columns.map((col) => ({
            name: col.column,
            semanticType: col.semanticType,
            confidence: col.semanticTypeConfidence.value,
            userProvided: false,
          }))
        : [],
      relationships: [],
      findings: [],
    };

    this.memory.datasets.push(memo);
    this.memory.missionCount++;
    this.dirty = true;

    return memo;
  }

  /**
   * Update column semantics for a dataset
   */
  private updateColumnSemantics(memo: DatasetMemo, schema: SchemaInference): void {
    for (const col of schema.columns) {
      const existing = memo.columnSemantics.find((c) => c.name === col.column);
      if (existing) {
        // Only update if new inference is higher confidence and not user-provided
        if (!existing.userProvided && col.semanticTypeConfidence.value > existing.confidence) {
          existing.semanticType = col.semanticType;
          existing.confidence = col.semanticTypeConfidence.value;
        }
      } else {
        memo.columnSemantics.push({
          name: col.column,
          semanticType: col.semanticType,
          confidence: col.semanticTypeConfidence.value,
          userProvided: false,
        });
      }
    }
  }

  /**
   * Find a dataset by fingerprint (exact or fuzzy match)
   */
  findDatasetByFingerprint(fingerprint: DatasetFingerprint): DatasetMemo | null {
    // Try exact match first
    const exact = this.memory.datasets.find(
      (d) =>
        d.fingerprint.name === fingerprint.name &&
        d.fingerprint.columnHash === fingerprint.columnHash
    );
    if (exact) return exact;

    // Try fuzzy match by column hash (same structure, different name)
    const byColumns = this.memory.datasets.find(
      (d) => d.fingerprint.columnHash === fingerprint.columnHash
    );
    if (byColumns) return byColumns;

    // Try match by name with similar row count (same file, updated data)
    const byName = this.memory.datasets.find(
      (d) =>
        d.fingerprint.name === fingerprint.name &&
        Math.abs(d.fingerprint.rowCount - fingerprint.rowCount) <
          d.fingerprint.rowCount * 0.2  // Within 20% row count
    );
    if (byName) return byName;

    return null;
  }

  /**
   * Recall a dataset by name
   */
  recallDataset(name: string): DatasetMemo | null {
    return this.memory.datasets.find((d) => d.fingerprint.name === name) || null;
  }

  /**
   * Recall column meaning
   */
  recallColumnMeaning(datasetName: string, columnName: string): ColumnMemo | null {
    const dataset = this.recallDataset(datasetName);
    if (!dataset) return null;

    return dataset.columnSemantics.find((c) => c.name === columnName) || null;
  }

  /**
   * Store user-provided column meaning
   */
  setColumnMeaning(datasetName: string, columnName: string, semanticType: SemanticType, notes?: string): void {
    const dataset = this.recallDataset(datasetName);
    if (!dataset) return;

    const existing = dataset.columnSemantics.find((c) => c.name === columnName);
    if (existing) {
      existing.semanticType = semanticType;
      existing.confidence = 100;
      existing.userProvided = true;
      existing.notes = notes;
    } else {
      dataset.columnSemantics.push({
        name: columnName,
        semanticType,
        confidence: 100,
        userProvided: true,
        notes,
      });
    }
    this.dirty = true;
  }

  // === Relationship Memory ===

  /**
   * Remember a relationship between datasets
   */
  rememberRelationship(relationship: Relationship): void {
    const dataset = this.recallDataset(relationship.sourceDataset);
    if (!dataset) return;

    // Check if this relationship already exists
    const existing = dataset.relationships.find(
      (r) =>
        r.targetDataset === relationship.targetDataset &&
        r.sourceColumn === relationship.sourceColumn &&
        r.targetColumn === relationship.targetColumn
    );

    if (existing) {
      // Update confidence if higher
      if (relationship.confidence > existing.confidence) {
        existing.confidence = relationship.confidence;
        existing.type = relationship.type;
      }
    } else {
      dataset.relationships.push({
        targetDataset: relationship.targetDataset,
        sourceColumn: relationship.sourceColumn,
        targetColumn: relationship.targetColumn,
        type: relationship.type,
        confidence: relationship.confidence,
      });
    }
    this.dirty = true;
  }

  /**
   * Recall relationships for a dataset
   */
  recallRelationships(datasetName: string): StoredRelationship[] {
    const dataset = this.recallDataset(datasetName);
    return dataset?.relationships || [];
  }

  // === Findings Memory ===

  /**
   * Record a finding from analysis
   */
  recordFinding(datasetName: string, finding: Omit<StoredFinding, "timestamp">): void {
    const dataset = this.recallDataset(datasetName);
    if (!dataset) return;

    // Limit stored findings to last 10
    if (dataset.findings.length >= 10) {
      dataset.findings.shift();
    }

    dataset.findings.push({
      ...finding,
      timestamp: new Date().toISOString(),
    });
    this.dirty = true;
  }

  /**
   * Record findings from an analysis result
   */
  recordAnalysisFindings(datasetName: string, analysis: AnalysisResult): void {
    // Record strong correlations
    if (analysis.correlations) {
      const strongCorrs = analysis.correlations.filter((c) => Math.abs(c.value) > 0.5);
      for (const corr of strongCorrs.slice(0, 3)) {
        this.recordFinding(datasetName, {
          type: "correlation",
          summary: `${corr.strength} correlation (r=${corr.value.toFixed(2)}) between ${corr.column1} and ${corr.column2}`,
          confidence: Math.abs(corr.value) * 100,
        });
      }
    }

    // Record significant trends
    if (analysis.trends) {
      const significantTrends = analysis.trends.filter((t) => Math.abs(t.changePercent) > 10);
      for (const trend of significantTrends.slice(0, 2)) {
        this.recordFinding(datasetName, {
          type: "trend",
          summary: `${trend.column}: ${trend.direction} trend (${trend.changePercent.toFixed(1)}%)`,
          confidence: 70,
        });
      }
    }
  }

  /**
   * Recall findings for a dataset
   */
  recallFindings(datasetName: string): StoredFinding[] {
    const dataset = this.recallDataset(datasetName);
    return dataset?.findings || [];
  }

  // === User Preferences ===

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.memory.preferences };
  }

  /**
   * Update user preferences
   */
  updatePreferences(prefs: Partial<UserPreferences>): void {
    this.memory.preferences = { ...this.memory.preferences, ...prefs };
    this.dirty = true;
  }

  // === Status and Info ===

  /**
   * Get memory status
   */
  getStatus(): { isEmpty: boolean; datasetCount: number; missionCount: number } {
    return {
      isEmpty: this.memory.datasets.length === 0,
      datasetCount: this.memory.datasets.length,
      missionCount: this.memory.missionCount,
    };
  }

  /**
   * Get all known datasets
   */
  getKnownDatasets(): DatasetMemo[] {
    return [...this.memory.datasets];
  }

  /**
   * Check if dataset is recognized
   */
  isKnownDataset(data: DataSet): boolean {
    const fingerprint = this.createFingerprint(data);
    return this.findDatasetByFingerprint(fingerprint) !== null;
  }

  /**
   * Generate Kowalski-style recognition message
   */
  getRecognitionMessage(data: DataSet): string | null {
    const fingerprint = this.createFingerprint(data);
    const memo = this.findDatasetByFingerprint(fingerprint);

    if (!memo) return null;

    const timeSince = this.timeSince(memo.lastAnalyzed);
    const missionWord = memo.analysisCount === 1 ? "mission" : "missions";

    if (memo.fingerprint.name === fingerprint.name) {
      return `Ah, I recognize this dataset from ${memo.analysisCount} previous ${missionWord}, Skipper! Last analyzed ${timeSince}.`;
    } else {
      return `Skipper, this looks like "${memo.fingerprint.name}" from previous ops - same column structure, different name.`;
    }
  }

  /**
   * Format time since last analysis
   */
  private timeSince(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    } else {
      return "just now";
    }
  }

  /**
   * Clear all memory (for testing)
   */
  clear(): void {
    this.memory = this.createFreshMemory();
    this.dirty = true;
  }

  /**
   * Get raw memory (for testing)
   */
  getRawMemory(): KowalskiMemory {
    return { ...this.memory };
  }
}

/**
 * Singleton instance for the memory manager
 */
let memoryManagerInstance: MemoryManager | null = null;

/**
 * Get or create the memory manager instance
 */
export function getMemoryManager(projectRoot?: string): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager(projectRoot);
  }
  return memoryManagerInstance;
}

/**
 * Reset the memory manager (for testing)
 */
export function resetMemoryManager(): void {
  memoryManagerInstance = null;
}
