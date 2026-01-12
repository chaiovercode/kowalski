// Analysis Brain for Kowalski Analytics
// "Kowalski, engage full analytical capabilities!"
//
// Central orchestrator that coordinates all analysis modules:
// - Data Understanding (understanding.ts)
// - Statistical Analysis (stats.ts)
// - Hypothesis Generation (hypotheses.ts)
// - EDA Report Generation (insights.ts)
//
// Implements Spec §5.3 Analysis Brain Interface

import type {
  DataSet,
  AnalysisResult,
  ChangePoint,
  SeasonalityResult,
} from "./types";
import type {
  SchemaInference,
  ColumnTypeInference,
  ClarifyingQuestion,
} from "./understanding";
import type {
  Hypothesis,
  HypothesisTestResult,
} from "./hypotheses";
import type { EDAReport } from "./insights";

import { analyzeDataSet, detectChangePoints, detectSeasonality } from "./stats";
import { inferSchema } from "./understanding";
import { generateHypotheses, testHypothesis, formatHypothesisKowalski } from "./hypotheses";
import { generateEDAReport } from "./insights";
import { getNumericColumnValues } from "./data-loader";

/**
 * Extended analysis result including all brain capabilities
 */
export interface BrainAnalysisResult extends AnalysisResult {
  schemaInference: SchemaInference;
  hypotheses: Hypothesis[];
  edaReport: EDAReport;
  timeSeriesAnalysis?: TimeSeriesAnalysis;
}

/**
 * Time series specific analysis
 */
export interface TimeSeriesAnalysis {
  changePoints: Map<string, ChangePoint[]>;
  seasonality: Map<string, SeasonalityResult>;
  columns: string[];
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /** Skip hypothesis generation (faster) */
  skipHypotheses?: boolean;
  /** Skip time series analysis (faster) */
  skipTimeSeries?: boolean;
  /** Maximum hypotheses to generate */
  maxHypotheses?: number;
  /** Confidence threshold for questions */
  questionThreshold?: number;
}

/**
 * Analysis Brain - Central orchestrator for Kowalski Analytics
 */
export class AnalysisBrain {
  private options: AnalysisOptions;

  constructor(options: AnalysisOptions = {}) {
    this.options = {
      skipHypotheses: false,
      skipTimeSeries: false,
      maxHypotheses: 10,
      questionThreshold: 70,
      ...options,
    };
  }

  /**
   * Full analysis pipeline with all capabilities
   */
  async analyze(data: DataSet): Promise<BrainAnalysisResult> {
    // Step 1: Infer schema with confidence scoring
    const schemaInference = await this.inferSchema(data);

    // Step 2: Run statistical analysis
    const baseAnalysis = analyzeDataSet(data);

    // Step 3: Generate EDA report
    const edaReport = generateEDAReport(data, baseAnalysis);

    // Step 4: Generate hypotheses (optional)
    let hypotheses: Hypothesis[] = [];
    if (!this.options.skipHypotheses) {
      hypotheses = generateHypotheses(data, baseAnalysis);
      if (this.options.maxHypotheses && hypotheses.length > this.options.maxHypotheses) {
        // Keep highest confidence hypotheses
        hypotheses = hypotheses
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, this.options.maxHypotheses);
      }
    }

    // Step 5: Time series analysis (optional)
    let timeSeriesAnalysis: TimeSeriesAnalysis | undefined;
    if (!this.options.skipTimeSeries) {
      timeSeriesAnalysis = this.analyzeTimeSeries(data);
    }

    return {
      ...baseAnalysis,
      schemaInference,
      hypotheses,
      edaReport,
      timeSeriesAnalysis,
    };
  }

  /**
   * Infer schema with confidence scoring
   */
  async inferSchema(data: DataSet): Promise<SchemaInference> {
    return inferSchema(data);
  }

  /**
   * Generate hypotheses from analysis
   */
  generateHypotheses(data: DataSet, analysis: AnalysisResult): Hypothesis[] {
    return generateHypotheses(data, analysis);
  }

  /**
   * Test a specific hypothesis
   */
  testHypothesis(data: DataSet, hypothesis: Hypothesis): HypothesisTestResult {
    return testHypothesis(data, hypothesis);
  }

  /**
   * Get clarifying questions based on schema inference
   */
  getClarifyingQuestions(schemaInference: SchemaInference): ClarifyingQuestion[] {
    const threshold = this.options.questionThreshold || 70;
    return schemaInference.suggestedQuestions.filter(
      (q) => q.confidence < threshold
    );
  }

  /**
   * Format hypothesis in Kowalski's voice
   */
  formatHypothesis(hypothesis: Hypothesis): string {
    return formatHypothesisKowalski(hypothesis);
  }

  /**
   * Analyze time series aspects of numeric columns
   */
  private analyzeTimeSeries(data: DataSet): TimeSeriesAnalysis {
    const { columns, types } = data;
    const numericCols = columns.filter((_, i) => types?.[i] === "number");

    const changePoints = new Map<string, ChangePoint[]>();
    const seasonality = new Map<string, SeasonalityResult>();

    for (const col of numericCols) {
      const idx = columns.indexOf(col);
      const values = getNumericColumnValues(data, idx);

      // Only analyze if enough data points
      if (values.length >= 20) {
        // Detect change points
        const colChangePoints = detectChangePoints(values);
        if (colChangePoints.length > 0) {
          changePoints.set(col, colChangePoints);
        }

        // Detect seasonality
        const colSeasonality = detectSeasonality(values);
        if (colSeasonality.detected) {
          seasonality.set(col, colSeasonality);
        }
      }
    }

    return {
      changePoints,
      seasonality,
      columns: numericCols,
    };
  }

  /**
   * Get a summary of the analysis in Kowalski's voice
   */
  getSummary(result: BrainAnalysisResult): string {
    const { schemaInference, hypotheses, edaReport, timeSeriesAnalysis } = result;

    const lines: string[] = [
      "═══════════════════════════════════════════",
      "  KOWALSKI ANALYSIS COMPLETE",
      "═══════════════════════════════════════════",
      "",
      `Skipper, I've completed my analysis. Here's the intel:`,
      "",
      "📊 DATA OVERVIEW:",
      `   • ${edaReport.overview.rows.toLocaleString()} records across ${edaReport.overview.columns} columns`,
      `   • ${edaReport.overview.numericCols} numeric, ${edaReport.overview.categoricalCols} categorical`,
    ];

    // Schema confidence
    const avgConfidence = Math.round(
      schemaInference.columns.reduce(
        (sum, col) => sum + col.semanticTypeConfidence.value,
        0
      ) / schemaInference.columns.length
    );
    lines.push(`   • Schema confidence: ${avgConfidence}%`);

    // Synthetic data warning
    if (edaReport.isSynthetic) {
      lines.push("");
      lines.push("⚠️  WARNING: Data appears to be SYNTHETIC");
      for (const reason of edaReport.syntheticReasons.slice(0, 3)) {
        lines.push(`   • ${reason}`);
      }
    }

    // Bottom line
    lines.push("");
    lines.push("💡 BOTTOM LINE:");
    lines.push(`   ${edaReport.bottomLine}`);

    // Hypotheses
    if (hypotheses.length > 0) {
      lines.push("");
      lines.push("🔬 TOP HYPOTHESES:");
      for (const h of hypotheses.slice(0, 3)) {
        lines.push(`   • ${h.title} (${h.confidence}% confidence)`);
      }
    }

    // Time series findings
    if (timeSeriesAnalysis) {
      const cpCount = Array.from(timeSeriesAnalysis.changePoints.values())
        .reduce((sum, arr) => sum + arr.length, 0);
      const seasonCount = timeSeriesAnalysis.seasonality.size;

      if (cpCount > 0 || seasonCount > 0) {
        lines.push("");
        lines.push("📈 TIME SERIES PATTERNS:");
        if (cpCount > 0) {
          lines.push(`   • ${cpCount} significant change point(s) detected`);
        }
        if (seasonCount > 0) {
          lines.push(`   • Seasonality detected in ${seasonCount} column(s)`);
        }
      }
    }

    // Questions
    const questions = this.getClarifyingQuestions(schemaInference);
    if (questions.length > 0) {
      lines.push("");
      lines.push("❓ CLARIFICATION NEEDED:");
      for (const q of questions.slice(0, 2)) {
        lines.push(`   • ${q.question}`);
      }
    }

    lines.push("");
    lines.push("═══════════════════════════════════════════");
    lines.push("  Awaiting further orders, Skipper.");
    lines.push("═══════════════════════════════════════════");

    return lines.join("\n");
  }
}

/**
 * Create a new Analysis Brain instance
 */
export function createAnalysisBrain(options?: AnalysisOptions): AnalysisBrain {
  return new AnalysisBrain(options);
}

/**
 * Quick analysis - runs full pipeline with default options
 */
export async function quickAnalysis(data: DataSet): Promise<BrainAnalysisResult> {
  const brain = createAnalysisBrain();
  return brain.analyze(data);
}

/**
 * Fast analysis - skips expensive operations
 */
export async function fastAnalysis(data: DataSet): Promise<BrainAnalysisResult> {
  const brain = createAnalysisBrain({
    skipHypotheses: true,
    skipTimeSeries: true,
  });
  return brain.analyze(data);
}
