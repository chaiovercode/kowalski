// IPC Message Types for Canvas Communication

// ============================================================================
// VIEW STATE - What the canvas is currently displaying
// ============================================================================

export interface ViewState {
  phase: "loading" | "eda" | "selection" | "analysis" | "browser" | "custom";
  currentChart: string | null;          // "correlations", "distributions", etc.
  visibleData: {
    columns: string[];                  // Which columns are shown
    rowRange: [number, number];         // Visible row range [start, end]
    highlights: string[];               // Currently highlighted elements
  };
  insights: string[];                   // Current insights displayed on screen
  scrollPosition: number;               // Current scroll offset
  selectedAnalysis: string | null;      // Which analysis type is selected
}

// ============================================================================
// INTERACTIVE FILTER - For data filtering in dashboard
// ============================================================================

export interface NumericFilter {
  type: "numeric";
  column: string;
  min?: number;
  max?: number;
}

export interface CategoricalFilter {
  type: "categorical";
  column: string;
  values: string[];   // Selected values to include
}

export interface DateFilter {
  type: "date";
  column: string;
  startDate?: string;
  endDate?: string;
}

export type DataFilter = NumericFilter | CategoricalFilter | DateFilter;

// ============================================================================
// DRILLDOWN - For drilling into specific data points
// ============================================================================

export interface DrilldownContext {
  chartType: string;           // Which chart was drilled
  column: string;              // Primary column
  value: string | number;      // Selected value
  groupBy?: string;            // Optional grouping column
}

// ============================================================================
// USER QUESTION - When dashboard needs user input
// ============================================================================

export interface UserQuestion {
  id: string;
  question: string;
  type: "choice" | "text" | "confirm";
  options?: string[];          // For choice type
  default?: string;
}

// ============================================================================
// EXPORT OPTIONS - For exporting data from dashboard
// ============================================================================

export interface ExportOptions {
  format: "csv" | "json" | "png" | "svg";
  scope: "all" | "filtered" | "visible";
  includeAnalysis?: boolean;
}

// ============================================================================
// HIGHLIGHT TARGET - For Claude to point at specific elements
// ============================================================================

export interface HighlightTarget {
  type: "column" | "row" | "cell" | "chart" | "insight" | "kpi";
  id: string;                           // Element identifier
  style: "pulse" | "glow" | "border";   // Visual effect
  duration?: number;                    // ms, 0 = persistent until cleared
}

// ============================================================================
// MESSAGES: Controller (Claude) → Canvas
// ============================================================================

export type ControllerMessage =
  | { type: "close" }
  | { type: "update"; config: unknown }
  | { type: "ping" }
  | { type: "getSelection" }
  | { type: "getContent" }
  | { type: "getViewState" }                              // Request current view state
  | { type: "highlight"; target: HighlightTarget }        // Highlight an element
  | { type: "clearHighlights" }                           // Clear all highlights
  | { type: "focus"; element: string }                    // Scroll element into view
  // Phase 6: Interactive features
  | { type: "applyFilter"; filter: DataFilter }           // Apply a data filter
  | { type: "clearFilters" }                              // Clear all filters
  | { type: "drilldown"; context: DrilldownContext }      // Drill into specific data
  | { type: "switchChart"; chartType: string }            // Switch chart type
  | { type: "export"; options: ExportOptions }            // Export data
  | { type: "answerQuestion"; id: string; answer: string }; // Answer a user question

// ============================================================================
// MESSAGES: Canvas → Controller (Claude)
// ============================================================================

export type CanvasMessage =
  | { type: "ready"; scenario: string }
  | { type: "selected"; data: unknown }
  | { type: "cancelled"; reason?: string }
  | { type: "error"; message: string }
  | { type: "pong" }
  | { type: "selection"; data: { selectedText: string; startOffset: number; endOffset: number } | null }
  | { type: "content"; data: { content: string; cursorPosition: number } }
  | { type: "viewState"; data: ViewState }                // Canvas reports its current view
  // Phase 6: Interactive features
  | { type: "userQuestion"; question: UserQuestion }      // Dashboard asks user a question
  | { type: "filterApplied"; filters: DataFilter[]; matchedRows: number }  // Filter was applied
  | { type: "drilldownResult"; data: unknown }            // Drilldown data ready
  | { type: "exportComplete"; path: string; format: string }  // Export finished
  | { type: "keyPressed"; key: string };                  // User pressed a key

// Socket path convention
export function getSocketPath(id: string): string {
  return `/tmp/canvas-${id}.sock`;
}
