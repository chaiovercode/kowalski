// Analytics Canvas Types - "Kowalski, Analysis!"

export interface AnalyticsConfig {
  title?: string;
  data?: DataSet;
  analysis?: AnalysisResult;
  charts?: ChartConfig[];
  insights?: string[];
  kpis?: KPI[];
  // Interactive flow support
  phase?: "loading" | "eda" | "selection" | "analysis" | "custom";
  selectedAnalysis?: string;
}

export interface DataSet {
  name: string;
  columns: string[];
  rows: (string | number | null)[][];
  types?: ("string" | "number" | "date")[];
}

export interface AnalysisResult {
  summary?: DataSummary;
  statistics?: Statistics;
  correlations?: Correlation[];
  trends?: Trend[];
  outliers?: Outlier[];
}

export interface DataSummary {
  totalRows: number;
  totalColumns: number;
  numericColumns?: number;
  categoricalColumns?: number;
  missingPercent?: number;
  duplicateRows?: number;
  nullCounts: Record<string, number>;
  uniqueCounts: Record<string, number>;
}

export interface Outlier {
  column: string;
  rowIndex: number;
  value: number;
  expectedMin: number;
  expectedMax: number;
  zscore?: number;
}

export interface Statistics {
  [column: string]: ColumnStats;
}

export interface ColumnStats {
  type: "numeric" | "categorical";
  count: number;
  nullCount: number;
  // Numeric stats
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  std?: number;
  q1?: number;
  q3?: number;
  percentiles?: { p25: number; p50: number; p75: number };
  // Categorical stats
  uniqueCount?: number;
  uniqueValues?: number;
  topValues?: { value: string; count: number }[];
}

export interface Correlation {
  column1: string;
  column2: string;
  value: number;
  strength: "strong" | "moderate" | "weak" | "none";
}

export interface Trend {
  column: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  description: string;
}

export interface ChartConfig {
  type: "line" | "bar" | "horizontal-bar" | "pie" | "scatter" | "table" | "histogram";
  title: string;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels?: string[];
  values: number[];
  series?: { name: string; values: number[] }[];
}

export interface ChartOptions {
  width?: number;
  height?: number;
  showLegend?: boolean;
  colors?: string[];
  xLabel?: string;
  yLabel?: string;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon?: string;
}

export interface AnalyticsResult {
  action: "export" | "drill-down" | "filter" | "cancelled" | "select_analysis";
  selection?: {
    chartIndex?: number;
    dataPoint?: { label: string; value: number };
    analysisType?: string;
  };
}

// Kowalski Color Theme - Military/Tech aesthetic
export const KOWALSKI_COLORS = {
  // Primary
  primary: "#00ff88", // Penguin green
  secondary: "#00d4ff", // Ice blue
  accent: "#ffa500", // Orange (Kowalski's notepad)

  // Status colors
  success: "#00ff88",
  warning: "#ffa500",
  danger: "#ff4444",
  info: "#00d4ff",

  // Chart colors
  chartColors: [
    "#00ff88", // green
    "#00d4ff", // cyan
    "#ffa500", // orange
    "#ff6b9d", // pink
    "#a855f7", // purple
    "#ffff00", // yellow
  ],

  // UI colors
  border: "#444444",
  borderFocus: "#00ff88",
  text: "#ffffff",
  textDim: "#888888",
  background: "#1a1a2e",
  headerBg: "#16213e",
};

// Kowalski ASCII Art
export const KOWALSKI_ASCII = `
    ▄▄▄▄▄▄▄▄▄▄▄
   █░░░░░░░░░░░█
   █░░▀░░░░▀░░░█
   █░░░░░░░░░░░█
   █░░░░▄▄▄░░░░█
   █░░░░░░░░░░░█
    ▀▀▀▀▀▀▀▀▀▀▀
   ╔═══════════╗
   ║ KOWALSKI  ║
   ║ ANALYSIS! ║
   ╚═══════════╝
`;

export const KOWALSKI_MINI = `🐧`;

export const KOWALSKI_BANNER = `
╔════════════════════════════════════════════════════════════════╗
║  █▄▀ █▀█ █░█░█ ▄▀█ █░░ █▀ █▄▀ █   ▄▀█ █▄░█ ▄▀█ █░░ █▄█ █▀ █ █▀ ║
║  █░█ █▄█ ▀▄▀▄▀ █▀█ █▄▄ ▄█ █░█ █   █▀█ █░▀█ █▀█ █▄▄ ░█░ ▄█ █ ▄█ ║
╚════════════════════════════════════════════════════════════════╝
`;

// Helper functions
export function formatNumber(n: number, decimals = 2): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(decimals) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(decimals) + "K";
  return n.toFixed(decimals);
}

export function formatPercent(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return sign + (n * 100).toFixed(1) + "%";
}

export function getChangeIcon(changeType?: "increase" | "decrease" | "neutral"): string {
  switch (changeType) {
    case "increase": return "▲";
    case "decrease": return "▼";
    default: return "─";
  }
}

export function getCorrelationStrength(value: number): "strong" | "moderate" | "weak" | "none" {
  const abs = Math.abs(value);
  if (abs >= 0.7) return "strong";
  if (abs >= 0.4) return "moderate";
  if (abs >= 0.2) return "weak";
  return "none";
}
