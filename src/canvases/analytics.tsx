// Kowalski Analytics Canvas - Interactive Analysis Dashboard
// "Kowalski, analysis!" - But first, what do you want to analyze?

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPC } from "./calendar/hooks/use-ipc";
import type { ViewState, HighlightTarget } from "../ipc/types";

// Theme and types
import { THEME, formatNumber, ARROWS, BOX } from "./analytics/theme";
import type {
  AnalyticsConfig,
  AnalyticsResult,
  ChartConfig,
  DataSet,
} from "./analytics/types";

// Intelligent insights
import { generateEDAReport, type EDAReport } from "./analytics/insights";

// Components
import {
  Header,
  StatusBar,
  LoadingSpinner,
  Mascot,
} from "./analytics/components/header";
import {
  Sparkline,
  BrailleBarChart,
  Distribution,
} from "./analytics/components/braille-charts";
import {
  Finding,
  Section,
  Ranking,
  ExecutiveSummary,
  StatSummary,
} from "./analytics/components/analysis-report";
import {
  KPIRow,
  CorrelationBadge,
  TrendIndicator,
  InsightsPanel,
} from "./analytics/components/kpis";
import { EDADashboard } from "./analytics/components/eda-dashboard";

interface Props {
  id: string;
  config?: AnalyticsConfig;
  socketPath?: string;
  scenario?: string;
}

// Analysis phases
type Phase = "loading" | "eda" | "selection" | "analysis" | "custom" | "browser";

// Analysis options the user can choose
interface AnalysisOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  { id: "correlations", label: "Correlations", description: "Find relationships between columns", icon: "⟷" },
  { id: "distributions", label: "Distributions", description: "See how values are spread", icon: "📊" },
  { id: "trends", label: "Trends", description: "Identify patterns over time", icon: "📈" },
  { id: "outliers", label: "Outliers", description: "Find unusual values", icon: "⚠" },
  { id: "comparisons", label: "Comparisons", description: "Compare groups or categories", icon: "⚖" },
  { id: "summary", label: "Executive Summary", description: "Key findings overview", icon: "📋" },
  { id: "browser", label: "Open in Browser", description: "Beautiful D3.js dashboard in browser", icon: "🌐" },
  { id: "custom", label: "Ask Claude", description: "Describe what you want to analyze", icon: "💬" },
];

export function AnalyticsCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "dashboard",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Config and data
  const [config, setConfig] = useState<AnalyticsConfig | undefined>(initialConfig);

  // UI State - initialize phase from config if available
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialConfig?.phase) return initialConfig.phase as Phase;
    if (initialConfig?.analysis) return "eda";
    return "loading";
  });
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  // Generate intelligent EDA report when data is available
  const edaReport = useMemo<EDAReport | null>(() => {
    if (config?.data && config?.analysis) {
      return generateEDAReport(config.data, config.analysis);
    }
    return null;
  }, [config?.data, config?.analysis]);

  // Highlight state for Claude to point at things
  const [highlights, setHighlights] = useState<HighlightTarget[]>([]);

  // Build current view state - this is what Claude "sees"
  const buildViewState = useCallback((): ViewState => {
    const data = config?.data;
    const insights = edaReport?.findings.map(f => f.title) || [];

    return {
      phase,
      currentChart: selectedAnalysis,
      visibleData: {
        columns: data?.columns.slice(0, 10) || [],  // First 10 visible columns
        rowRange: [0, Math.min(100, data?.rows.length || 0)] as [number, number],
        highlights: highlights.map(h => `${h.type}:${h.id}`),
      },
      insights: insights.slice(0, 5),  // Top 5 insights
      scrollPosition: scrollOffset,
      selectedAnalysis,
    };
  }, [phase, selectedAnalysis, config?.data, edaReport, highlights, scrollOffset]);

  // Handle highlight commands from Claude
  const handleHighlight = useCallback((target: HighlightTarget) => {
    setHighlights(prev => {
      // Remove any existing highlight of the same type/id
      const filtered = prev.filter(h => !(h.type === target.type && h.id === target.id));
      return [...filtered, target];
    });

    // Auto-clear after duration (if specified and not persistent)
    if (target.duration && target.duration > 0) {
      setTimeout(() => {
        setHighlights(prev => prev.filter(h => !(h.type === target.type && h.id === target.id)));
      }, target.duration);
    }
  }, []);

  const handleClearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  const handleFocus = useCallback((element: string) => {
    // TODO: Implement scroll-to-element logic
    console.log("Focus requested:", element);
  }, []);

  // IPC connection
  const ipc = useIPC({
    socketPath,
    scenario,
    onClose: () => exit(),
    onUpdate: (newConfig) => {
      const cfg = newConfig as AnalyticsConfig;
      setConfig(cfg);

      // Determine phase based on config
      if (cfg.phase) {
        setPhase(cfg.phase as Phase);
      } else if (cfg.analysis && !cfg.selectedAnalysis) {
        setPhase("eda");
      } else if (cfg.selectedAnalysis) {
        setSelectedAnalysis(cfg.selectedAnalysis);
        setPhase("analysis");
      }
    },
    onGetViewState: buildViewState,
    onHighlight: handleHighlight,
    onClearHighlights: handleClearHighlights,
    onFocus: handleFocus,
  });

  // Send viewState whenever it changes
  const lastViewStateRef = useRef<string>("");
  useEffect(() => {
    const viewState = buildViewState();
    const viewStateJson = JSON.stringify(viewState);

    // Only send if changed
    if (viewStateJson !== lastViewStateRef.current) {
      lastViewStateRef.current = viewStateJson;
      ipc.sendViewState(viewState);
    }
  }, [phase, selectedAnalysis, scrollOffset, config?.data, edaReport, buildViewState, ipc]);

  // Listen for terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 120,
        height: stdout?.rows || 40,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Handle analysis selection
  const handleSelectAnalysis = useCallback((optionId: string) => {
    const result: AnalyticsResult = {
      action: "select_analysis",
      selection: { analysisType: optionId },
    };
    setSelectedAnalysis(optionId);

    if (optionId === "custom") {
      setPhase("custom");
    } else if (optionId === "browser") {
      setPhase("browser");
    } else {
      setPhase("loading");
    }

    ipc.sendSelected(result);
  }, [ipc]);

  // Keyboard controls
  useInput((input, key) => {
    if (input === "q" || key.escape) {
      ipc.sendCancelled("User cancelled");
      exit();
      return;
    }

    // Navigation in selection phase
    if (phase === "selection") {
      if (key.upArrow) {
        setSelectedOptionIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow) {
        setSelectedOptionIndex((i) => Math.min(ANALYSIS_OPTIONS.length - 1, i + 1));
      }
      if (key.return || input === " ") {
        const selectedOption = ANALYSIS_OPTIONS[selectedOptionIndex];
        if (selectedOption) {
          handleSelectAnalysis(selectedOption.id);
        }
      }
      // Number shortcuts
      const num = parseInt(input);
      if (num >= 1 && num <= ANALYSIS_OPTIONS.length) {
        const optionIndex = num - 1;
        const option = ANALYSIS_OPTIONS[optionIndex];
        if (option) {
          setSelectedOptionIndex(optionIndex);
          handleSelectAnalysis(option.id);
        }
      }
    }

    // Navigation in EDA/analysis phases
    if (phase === "eda" || phase === "analysis") {
      if (key.upArrow) {
        setScrollOffset((o) => Math.max(0, o - 1));
      }
      if (key.downArrow) {
        setScrollOffset((o) => o + 1);
      }
      if (key.return && phase === "eda") {
        setPhase("selection");
      }
    }

    // Back to selection
    if (input === "b" && phase === "analysis") {
      setPhase("selection");
      setSelectedAnalysis(null);
    }
  });

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusHeight = 3;
  const contentHeight = termHeight - headerHeight - statusHeight;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: EDA (Exploratory Data Analysis) - Intelligent Analysis Dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  const renderEDA = () => {
    const { data, analysis } = config || {};
    if (!data || !analysis || !edaReport) return null;

    return (
      <Box flexDirection="column" height={contentHeight}>
        {/* Main Dashboard */}
        <EDADashboard
          data={data}
          analysis={analysis}
          report={edaReport}
          width={termWidth - 2}
          height={contentHeight - 3}
          scrollOffset={scrollOffset}
        />

        {/* Call to Action */}
        <Box marginTop={1} justifyContent="center">
          <Text color={THEME.border}>{"─".repeat(12)} </Text>
          <Text color={THEME.warning} bold>ENTER: Choose Analysis </Text>
          <Text color={THEME.border}>{BOX.vertical} </Text>
          <Text color={THEME.textDim}>↑↓: Scroll </Text>
          <Text color={THEME.border}>{BOX.vertical} </Text>
          <Text color={THEME.textDim}>Q: Quit </Text>
          <Text color={THEME.border}>{" ─".repeat(6)}</Text>
        </Box>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: SELECTION (What do you want to analyze?)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSelection = () => {
    const optionWidth = Math.floor((termWidth - 10) / 2);

    return (
      <Box flexDirection="column" height={contentHeight}>
        {/* Header */}
        <Box flexDirection="column" alignItems="center" marginBottom={2}>
          <Text color={THEME.primary} bold>
            ╔══════════════════════════════════════════╗
          </Text>
          <Text color={THEME.primary} bold>
            ║   What would you like to analyze?        ║
          </Text>
          <Text color={THEME.primary} bold>
            ╚══════════════════════════════════════════╝
          </Text>
        </Box>

        {/* Options Grid */}
        <Box flexDirection="column" alignItems="center">
          {ANALYSIS_OPTIONS.map((option, i) => {
            const isSelected = i === selectedOptionIndex;
            const bgColor = isSelected ? THEME.primary : undefined;
            const textColor = isSelected ? "#000000" : THEME.text;

            return (
              <Box
                key={option.id}
                width={optionWidth}
                paddingX={2}
                paddingY={0}
                marginBottom={0}
                borderStyle={isSelected ? "bold" : "single"}
                borderColor={isSelected ? THEME.primary : THEME.border}
              >
                <Box flexDirection="row">
                  <Text color={isSelected ? THEME.warning : THEME.textDim}>{i + 1}. </Text>
                  <Text color={isSelected ? THEME.primary : THEME.secondary} bold>
                    {option.icon} {option.label}
                  </Text>
                </Box>
                <Text color={THEME.textDim}> — {option.description}</Text>
              </Box>
            );
          })}
        </Box>

        {/* Instructions */}
        <Box marginTop={2} justifyContent="center">
          <Text color={THEME.textDim}>Use </Text>
          <Text color={THEME.primary}>↑↓</Text>
          <Text color={THEME.textDim}> to navigate, </Text>
          <Text color={THEME.primary}>ENTER</Text>
          <Text color={THEME.textDim}> to select, or press </Text>
          <Text color={THEME.primary}>1-8</Text>
          <Text color={THEME.textDim}> for quick access</Text>
        </Box>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: ANALYSIS RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderAnalysis = () => {
    const { analysis, insights, charts } = config || {};
    if (!analysis) return null;

    const halfWidth = Math.floor((termWidth - 6) / 2);

    // Render based on selected analysis type
    switch (selectedAnalysis) {
      case "correlations":
        return renderCorrelationAnalysis(halfWidth);
      case "distributions":
        return renderDistributionAnalysis(halfWidth);
      case "trends":
        return renderTrendAnalysis(halfWidth);
      case "outliers":
        return renderOutlierAnalysis(halfWidth);
      case "comparisons":
        return renderComparisonAnalysis(halfWidth);
      case "summary":
        return renderExecutiveSummary(halfWidth);
      default:
        return renderGenericAnalysis(halfWidth);
    }
  };

  const renderCorrelationAnalysis = (halfWidth: number) => {
    const { analysis } = config || {};
    const correlations = analysis?.correlations || [];

    return (
      <Box flexDirection="column" height={contentHeight}>
        <Section title="CORRELATION ANALYSIS" width={termWidth - 4}>
          <Box flexDirection="column">
            {correlations.length === 0 ? (
              <Text color={THEME.textDim}>No significant correlations found.</Text>
            ) : (
              correlations.slice(0, 10).map((corr, i) => (
                <Box key={`corr-${i}`} marginBottom={0}>
                  <CorrelationBadge
                    column1={corr.column1}
                    column2={corr.column2}
                    value={corr.value}
                    strength={corr.strength}
                  />
                </Box>
              ))
            )}
          </Box>
        </Section>

        {correlations.length > 0 && (
          <Box marginTop={1}>
            <Finding
              title="Key Finding"
              description={`The strongest correlation (${correlations[0]?.value.toFixed(2)}) exists between ${correlations[0]?.column1} and ${correlations[0]?.column2}.`}
              severity={Math.abs(correlations[0]?.value || 0) > 0.7 ? "success" : "info"}
            />
          </Box>
        )}
      </Box>
    );
  };

  const renderDistributionAnalysis = (halfWidth: number) => {
    const { analysis, data } = config || {};
    const statistics = analysis?.statistics || {};
    const numericCols = Object.entries(statistics).filter(([_, s]) => s.type === "numeric");

    return (
      <Box flexDirection="column" height={contentHeight}>
        <Section title="DISTRIBUTION ANALYSIS" width={termWidth - 4}>
          <Box flexDirection="row" flexWrap="wrap">
            {numericCols.slice(0, 4).map(([col, stats]) => {
              // Get values for this column
              const colIndex = data?.columns.indexOf(col) ?? -1;
              const values = colIndex >= 0
                ? data?.rows.map(r => r[colIndex]).filter((v): v is number => typeof v === "number")
                : [];

              return (
                <Box key={`dist-${col}`} width={halfWidth} marginRight={2} marginBottom={1}>
                  <StatSummary
                    column={col}
                    stats={{
                      mean: stats.mean || 0,
                      median: stats.median || 0,
                      std: stats.std || 0,
                      min: stats.min || 0,
                      max: stats.max || 0,
                      q1: stats.q1,
                      q3: stats.q3,
                    }}
                    distribution={values?.slice(0, 100)}
                  />
                </Box>
              );
            })}
          </Box>
        </Section>
      </Box>
    );
  };

  const renderTrendAnalysis = (halfWidth: number) => {
    const { analysis } = config || {};
    const trends = analysis?.trends || [];

    return (
      <Box flexDirection="column" height={contentHeight}>
        <Section title="TREND ANALYSIS" width={termWidth - 4}>
          {trends.length === 0 ? (
            <Text color={THEME.textDim}>No significant trends detected.</Text>
          ) : (
            <Box flexDirection="column">
              {trends.map((trend, i) => (
                <Box key={`trend-${i}`} marginBottom={1}>
                  <TrendIndicator
                    column={trend.column}
                    direction={trend.direction}
                    changePercent={trend.changePercent}
                    description={trend.description}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Section>
      </Box>
    );
  };

  const renderOutlierAnalysis = (halfWidth: number) => {
    const { analysis } = config || {};
    const outliers = analysis?.outliers || [];

    return (
      <Box flexDirection="column" height={contentHeight}>
        <Section title="OUTLIER DETECTION" width={termWidth - 4}>
          {outliers.length === 0 ? (
            <Text color={THEME.textDim}>No significant outliers detected.</Text>
          ) : (
            <Box flexDirection="column">
              {outliers.slice(0, 10).map((outlier, i) => (
                <Box key={`outlier-${i}`} flexDirection="row" marginBottom={0}>
                  <Text color={THEME.warning}>⚠ </Text>
                  <Text color={THEME.text}>{outlier.column}: </Text>
                  <Text color={THEME.negative} bold>{formatNumber(outlier.value, 2)}</Text>
                  <Text color={THEME.textDim}>
                    {" "}(expected {formatNumber(outlier.expectedMin, 0)}–{formatNumber(outlier.expectedMax, 0)})
                  </Text>
                  <Text color={THEME.textDim}> row {outlier.rowIndex}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Section>

        {outliers.length > 0 && (
          <Box marginTop={1}>
            <Finding
              title="Outlier Summary"
              description={`Found ${outliers.length} outliers across your data. These may indicate data quality issues or genuinely unusual observations.`}
              severity="warning"
            />
          </Box>
        )}
      </Box>
    );
  };

  const renderComparisonAnalysis = (halfWidth: number) => {
    const { analysis, data } = config || {};
    const statistics = analysis?.statistics || {};

    // Find categorical columns for grouping
    const categoricalCols = Object.entries(statistics).filter(([_, s]) => s.type === "categorical");
    const numericCols = Object.entries(statistics).filter(([_, s]) => s.type === "numeric");

    return (
      <Box flexDirection="column" height={contentHeight}>
        <Section title="COMPARISON ANALYSIS" width={termWidth - 4}>
          {categoricalCols.length === 0 ? (
            <Text color={THEME.textDim}>No categorical columns found for grouping.</Text>
          ) : (
            <Box flexDirection="column">
              {categoricalCols.slice(0, 2).map(([col, stats]) => (
                <Box key={`compare-${col}`} marginBottom={1}>
                  <Ranking
                    title={`BY ${col.toUpperCase()}`}
                    items={(stats.topValues || []).map(tv => ({
                      label: String(tv.value),
                      value: tv.count,
                    }))}
                    width={halfWidth}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Section>
      </Box>
    );
  };

  const renderExecutiveSummary = (halfWidth: number) => {
    const { analysis, insights, data } = config || {};
    const summary = analysis?.summary;

    const highlights = insights?.slice(0, 4) || [
      `Dataset contains ${formatNumber(summary?.totalRows || 0, 0)} rows and ${summary?.totalColumns || 0} columns`,
      `${summary?.numericColumns || 0} numeric and ${summary?.categoricalColumns || 0} categorical columns`,
      `Data completeness: ${((1 - (summary?.missingPercent || 0)) * 100).toFixed(1)}%`,
    ];

    return (
      <Box flexDirection="column" height={contentHeight}>
        <ExecutiveSummary
          title={`${data?.name || "Data"} Analysis Summary`}
          highlights={highlights}
          bottomLine="Analysis complete. Select another analysis type or press Q to exit."
          width={termWidth - 4}
        />

        {/* KPIs */}
        {config?.kpis && config.kpis.length > 0 && (
          <Box marginTop={2}>
            <KPIRow kpis={config.kpis} width={termWidth - 4} />
          </Box>
        )}
      </Box>
    );
  };

  const renderGenericAnalysis = (halfWidth: number) => {
    const { insights, charts } = config || {};

    return (
      <Box flexDirection="column" height={contentHeight}>
        {insights && insights.length > 0 && (
          <InsightsPanel insights={insights} width={termWidth - 4} />
        )}
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: BROWSER (Open D3.js Dashboard)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderBrowser = () => {
    return (
      <Box flexDirection="column" height={contentHeight} alignItems="center" justifyContent="center">
        <Text color={THEME.primary} bold>
          ╔══════════════════════════════════════════════════════╗
        </Text>
        <Text color={THEME.primary} bold>
          ║  🌐 Opening Interactive Dashboard in Browser...      ║
        </Text>
        <Text color={THEME.primary} bold>
          ╚══════════════════════════════════════════════════════╝
        </Text>
        <Box marginTop={2} flexDirection="column" alignItems="center">
          <LoadingSpinner message="Generating D3.js visualizations..." />
          <Box marginTop={1}>
            <Text color={THEME.textDim}>Beautiful charts powered by Plotly and D3.js</Text>
          </Box>
        </Box>
        <Box marginTop={3} flexDirection="column" alignItems="center">
          <Text color={THEME.secondary}>Features:</Text>
          <Text color={THEME.textDim}>• Interactive scatter matrix</Text>
          <Text color={THEME.textDim}>• Correlation heatmap</Text>
          <Text color={THEME.textDim}>• Distribution histograms</Text>
          <Text color={THEME.textDim}>• Trend analysis</Text>
          <Text color={THEME.textDim}>• Category breakdowns</Text>
        </Box>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: CUSTOM (Ask Claude)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderCustom = () => {
    return (
      <Box flexDirection="column" height={contentHeight} alignItems="center" justifyContent="center">
        <Text color={THEME.primary} bold>
          ╔══════════════════════════════════════════════════════╗
        </Text>
        <Text color={THEME.primary} bold>
          ║  Describe what you want to analyze in the terminal   ║
        </Text>
        <Text color={THEME.primary} bold>
          ║  Claude will process your request and update here    ║
        </Text>
        <Text color={THEME.primary} bold>
          ╚══════════════════════════════════════════════════════╝
        </Text>
        <Box marginTop={2}>
          <LoadingSpinner message="Waiting for your input in the terminal..." />
        </Box>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "loading" || !config) {
    return (
      <Box
        flexDirection="column"
        width={termWidth}
        height={termHeight}
        justifyContent="center"
        alignItems="center"
      >
        <Mascot variant="kowalski" color={THEME.primary} />
        <Box marginTop={2}>
          <LoadingSpinner message="Kowalski analyzing... Stand by!" />
        </Box>
      </Box>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  const getStatusText = () => {
    switch (phase) {
      case "eda":
        return "EDA | Press ENTER to select analysis";
      case "selection":
        return "SELECT ANALYSIS | ↑↓:Navigate │ ENTER:Select";
      case "analysis":
        return `${selectedAnalysis?.toUpperCase()} | B:Back │ Q:Quit`;
      case "browser":
        return "BROWSER | Opening D3.js dashboard...";
      case "custom":
        return "CUSTOM | Describe your analysis in terminal";
      default:
        return "KOWALSKI READY";
    }
  };

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Header
        title={config?.title || "KOWALSKI ANALYSIS"}
        subtitle={config?.data?.name}
        width={termWidth}
      />

      {/* Content area */}
      <Box flexDirection="column" paddingX={1} height={contentHeight}>
        {phase === "eda" && renderEDA()}
        {phase === "selection" && renderSelection()}
        {phase === "analysis" && renderAnalysis()}
        {phase === "browser" && renderBrowser()}
        {phase === "custom" && renderCustom()}
      </Box>

      {/* Status bar */}
      <StatusBar
        left={getStatusText()}
        right={`${config?.data?.name || "No data"} │ Q:Quit`}
        width={termWidth}
      />
    </Box>
  );
}
