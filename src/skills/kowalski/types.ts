// Kowalski Skill Types

export type KowalskiCommand =
  | "analyze"
  | "compare"
  | "query"
  | "memory"
  | "dashboard"
  | "help"
  | "recon"; // default when no args

export interface KowalskiArgs {
  command: KowalskiCommand;
  files?: string[];
  options?: Record<string, string | boolean>;
}

export interface DataFile {
  name: string;
  path: string;
  extension: "csv" | "json" | "tsv";
  rows?: number;
  status: "new" | "known";
}

export interface ReconResult {
  files: DataFile[];
  memoryStatus: "empty" | "loaded";
  previousMissions?: number;
}

export interface AnalyzeResult {
  success: boolean;
  datasetName: string;
  rows: number;
  columns: number;
  message?: string;
  canvasSpawned?: boolean;
}

export interface CompareResult {
  success: boolean;
  file1: string;
  file2: string;
  relationships: Relationship[];
  message?: string;
}

export interface Relationship {
  type: "one-to-one" | "one-to-many" | "many-to-many";
  leftColumn: string;
  rightColumn: string;
  confidence: number;
  matchPercentage: number;
  orphanCount: number;
}

export interface MemoryEntry {
  datasetId: string;
  name: string;
  columns: string[];
  rowCountHash: string;
  lastAnalyzed: string;
  columnSemantics?: Record<string, string>;
  relationships?: Array<{ target: string; column: string }>;
  findings?: string[];
}

export interface KowalskiMemoryData {
  datasets: MemoryEntry[];
  preferences: {
    chartType?: string;
    exportFormat?: string;
    colorScheme?: string;
  };
  customThresholds?: Record<string, number>;
}

// Confidence thresholds from spec
export const CONFIDENCE_THRESHOLDS = {
  AUTO_PROCEED: 90, // >= 90%: Proceed automatically
  NOTE_UNCERTAINTY: 70, // 70-89%: Note uncertainty, proceed
  ASK_QUESTION: 50, // 50-69%: Ask clarifying question
  REQUIRE_INPUT: 0, // < 50%: Require user input
} as const;

export type ConfidenceLevel =
  | "auto"
  | "proceed_with_note"
  | "ask_question"
  | "require_input";

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_PROCEED) return "auto";
  if (confidence >= CONFIDENCE_THRESHOLDS.NOTE_UNCERTAINTY)
    return "proceed_with_note";
  if (confidence >= CONFIDENCE_THRESHOLDS.ASK_QUESTION) return "ask_question";
  return "require_input";
}
