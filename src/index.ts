// Kowalski Analytics - Main Entry Point
// "Kowalski, analysis!" - Skipper

// Data parsing and loading
export {
  parseCSV,
  parseJSON,
  parseData,
  type ParseOptions,
} from "./canvases/analytics/data-loader";

// Core analysis
export {
  analyzeDataSet,
  type AnalysisResult,
} from "./canvases/analytics/stats";

export type {
  DataSet,
  ColumnStatistics,
  Correlation,
  AnalyticsConfig,
  AnalyticsResult,
} from "./canvases/analytics/types";

// Intelligent insights (EDA)
export {
  generateEDAReport,
  type EDAReport,
  type EDAFinding,
} from "./canvases/analytics/insights";

// Schema inference
export {
  inferSchema,
  type SchemaInference,
} from "./canvases/analytics/understanding";

// Hypothesis generation
export {
  generateHypotheses,
  testHypothesis,
  type Hypothesis,
} from "./canvases/analytics/hypotheses";

// Relationship discovery
export {
  findRelationships,
  type RelationshipResult,
  type DataRelationship,
} from "./canvases/analytics/relationships";

// Browser visualization
export {
  generateBrowserViz,
  openBrowserViz,
  type BrowserVizOptions,
} from "./canvases/analytics/browser-viz";

// Data export
export {
  exportToCSV,
  exportToJSON,
  type ExportResult,
} from "./canvases/analytics/export";

// Performance optimization
export {
  prepareForAnalysis,
  PerformanceTimer,
  type ProcessingStrategy,
} from "./canvases/analytics/performance";

// Memory/persistence
export {
  MemoryManager,
} from "./canvases/analytics/memory";

// API/MCP integration
export {
  parseFromMCPResult,
  fetchFromAPI,
  fetchPaginated,
  getAuthFromEnv,
} from "./canvases/analytics/api-loader";

// Canvas spawning API
export {
  spawnAnalytics,
  createAnalyticsSession,
  showAnalyticsCharts,
  showAnalyticsData,
  showAnalyticsInsights,
  type CanvasResult,
  type CanvasSession,
  type SpawnOptions,
} from "./api/canvas-api";
