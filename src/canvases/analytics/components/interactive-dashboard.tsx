// Interactive Dashboard Wrapper
// "Kowalski, options! Arrow keys to navigate, numbers for charts."

import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { THEME, BOX, ARROWS } from "../theme";
import { EDADashboard } from "./eda-dashboard";
import { FilterPanel } from "./filter-panel";
import type { DataSet, AnalysisResult, ColumnStats } from "../types";
import type { EDAReport } from "../insights";
import type { DataFilter } from "../../../ipc/types";

interface InteractiveDashboardProps {
  data: DataSet;
  analysis: AnalysisResult;
  report: EDAReport;
  width: number;
  height: number;
  onExport?: (format: "csv" | "json") => void;
  onDrilldown?: (column: string, value: unknown) => void;
  onAskQuestion?: (question: string) => void;
  onKeyPressed?: (key: string) => void;
}

type PanelMode = "dashboard" | "filter" | "export" | "help";
type ChartType = "distribution" | "correlation" | "category" | "trend";

const CHART_TYPES: { key: string; type: ChartType; label: string }[] = [
  { key: "1", type: "distribution", label: "Distribution" },
  { key: "2", type: "correlation", label: "Correlation" },
  { key: "3", type: "category", label: "Category" },
  { key: "4", type: "trend", label: "Trend" },
];

// Apply filters to dataset
function applyFilters(data: DataSet, filters: DataFilter[]): DataSet {
  if (filters.length === 0) return data;

  const filteredRows = data.rows.filter((row) => {
    return filters.every((filter) => {
      const colIdx = data.columns.indexOf(filter.column);
      if (colIdx === -1) return true;

      const value = row[colIdx];

      if (filter.type === "numeric") {
        if (typeof value !== "number") return false;
        if (filter.min !== undefined && value < filter.min) return false;
        if (filter.max !== undefined && value > filter.max) return false;
        return true;
      }

      if (filter.type === "categorical") {
        return filter.values.includes(String(value));
      }

      if (filter.type === "date") {
        const dateValue = new Date(String(value)).getTime();
        if (filter.startDate && dateValue < new Date(filter.startDate).getTime()) return false;
        if (filter.endDate && dateValue > new Date(filter.endDate).getTime()) return false;
        return true;
      }

      return true;
    });
  });

  return {
    ...data,
    rows: filteredRows,
  };
}

// Status bar component
function StatusBar({
  mode,
  chartType,
  filterCount,
  filteredRows,
  totalRows,
  width,
}: {
  mode: PanelMode;
  chartType: ChartType;
  filterCount: number;
  filteredRows: number;
  totalRows: number;
  width: number;
}) {
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const chartLabel = CHART_TYPES.find((c) => c.type === chartType)?.label || "Unknown";
  const filterInfo = filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? "s" : ""}` : "";
  const rowInfo = filteredRows < totalRows ? `${filteredRows}/${totalRows}` : `${totalRows}`;

  return (
    <Box flexDirection="row" width={width} paddingX={1}>
      <Text color={THEME.secondary}>{BOX.horizontal.repeat(2)} </Text>
      <Text color={THEME.primary} bold>
        [{modeLabel}]
      </Text>
      <Text color={THEME.textDim}> Chart: </Text>
      <Text color={THEME.text}>{chartLabel}</Text>
      {filterInfo && (
        <>
          <Text color={THEME.textDim}> | </Text>
          <Text color={THEME.positive}>{filterInfo}</Text>
        </>
      )}
      <Text color={THEME.textDim}> | Rows: </Text>
      <Text color={filteredRows < totalRows ? THEME.warning : THEME.text}>{rowInfo}</Text>
      <Box flexGrow={1} />
      <Text color={THEME.textDim}>? for help</Text>
    </Box>
  );
}

// Help overlay
function HelpOverlay({ width, height }: { width: number; height: number }) {
  const helpItems = [
    ["1-4", "Switch chart type"],
    ["f", "Open filter panel"],
    ["e", "Export data"],
    ["c", "Clear all filters"],
    ["r", "Refresh analysis"],
    [ARROWS.upSmall + ARROWS.downSmall, "Navigate/scroll"],
    ["Enter", "Drill down into selection"],
    ["Esc", "Close panel/exit"],
    ["?", "Toggle this help"],
  ];

  return (
    <Box
      flexDirection="column"
      width={Math.min(width - 4, 50)}
      height={Math.min(height - 4, 15)}
      borderStyle="round"
      borderColor={THEME.primary}
      padding={1}
    >
      <Text color={THEME.primary} bold>
        Keyboard Shortcuts
      </Text>
      <Box marginTop={1} flexDirection="column">
        {helpItems.map(([key, desc], i) => (
          <Box key={i}>
            <Text color={THEME.secondary}>{key.padEnd(8)}</Text>
            <Text color={THEME.text}>{desc}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={THEME.textDim}>Press any key to close</Text>
      </Box>
    </Box>
  );
}

// Export menu
function ExportMenu({
  onExport,
  onClose,
  width,
}: {
  onExport: (format: "csv" | "json") => void;
  onClose: () => void;
  width: number;
}) {
  const [selected, setSelected] = useState(0);
  const options = [
    { key: "csv", label: "Export as CSV", desc: "Comma-separated values" },
    { key: "json", label: "Export as JSON", desc: "JavaScript Object Notation" },
  ];

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelected((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelected((prev) => Math.min(options.length - 1, prev + 1));
    } else if (key.return) {
      onExport(options[selected].key as "csv" | "json");
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      width={Math.min(width - 4, 40)}
      borderStyle="round"
      borderColor={THEME.secondary}
      padding={1}
    >
      <Text color={THEME.secondary} bold>
        Export Data
      </Text>
      <Box marginTop={1} flexDirection="column">
        {options.map((opt, i) => (
          <Box key={opt.key} marginBottom={0}>
            <Text color={i === selected ? THEME.primary : THEME.textDim}>
              {i === selected ? ARROWS.right : " "}{" "}
            </Text>
            <Text color={i === selected ? THEME.primary : THEME.text} bold={i === selected}>
              {opt.label}
            </Text>
            {i === selected && <Text color={THEME.textDim}> - {opt.desc}</Text>}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={THEME.textDim}>Enter to export | Esc to cancel</Text>
      </Box>
    </Box>
  );
}

// Main interactive dashboard
export function InteractiveDashboard({
  data,
  analysis,
  report,
  width,
  height,
  onExport,
  onDrilldown,
  onAskQuestion,
  onKeyPressed,
}: InteractiveDashboardProps) {
  const [mode, setMode] = useState<PanelMode>("dashboard");
  const [chartType, setChartType] = useState<ChartType>("distribution");
  const [filters, setFilters] = useState<DataFilter[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Apply filters to data
  const filteredData = useMemo(() => applyFilters(data, filters), [data, filters]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      // Notify external handler
      if (onKeyPressed) {
        if (key.return) onKeyPressed("enter");
        else if (key.escape) onKeyPressed("escape");
        else if (key.upArrow) onKeyPressed("up");
        else if (key.downArrow) onKeyPressed("down");
        else if (input) onKeyPressed(input);
      }

      // Mode-specific handling
      if (mode === "help") {
        setMode("dashboard");
        return;
      }

      if (mode === "dashboard") {
        // Chart type switching (1-4)
        const chartSwitch = CHART_TYPES.find((c) => c.key === input);
        if (chartSwitch) {
          setChartType(chartSwitch.type);
          return;
        }

        switch (input?.toLowerCase()) {
          case "f":
            setMode("filter");
            break;
          case "e":
            setMode("export");
            break;
          case "c":
            setFilters([]);
            break;
          case "?":
            setMode("help");
            break;
        }

        // Scrolling
        if (key.upArrow) {
          setScrollOffset((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow) {
          setScrollOffset((prev) => prev + 1);
        }

        // Exit on Escape
        if (key.escape) {
          // Could trigger onClose if needed
        }
      }
    },
    { isActive: mode !== "filter" && mode !== "export" }
  );

  const handleFilterChange = useCallback((newFilters: DataFilter[]) => {
    setFilters(newFilters);
  }, []);

  const handleExport = useCallback(
    (format: "csv" | "json") => {
      if (onExport) {
        onExport(format);
      }
    },
    [onExport]
  );

  // Calculate dimensions for panels
  const statusBarHeight = 1;
  const contentHeight = height - statusBarHeight;

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Main content area */}
      <Box flexGrow={1} position="relative">
        {/* Dashboard always renders in background */}
        <EDADashboard
          data={filteredData}
          analysis={analysis}
          report={report}
          width={width}
          height={contentHeight}
          scrollOffset={scrollOffset}
        />

        {/* Overlay panels */}
        {mode === "filter" && (
          <Box position="absolute" marginLeft={2} marginTop={2}>
            <FilterPanel
              data={data}
              statistics={analysis.statistics || {}}
              activeFilters={filters}
              onFilterChange={handleFilterChange}
              onClose={() => setMode("dashboard")}
              width={Math.min(width - 4, 50)}
              height={Math.min(contentHeight - 4, 20)}
            />
          </Box>
        )}

        {mode === "export" && (
          <Box position="absolute" marginLeft={2} marginTop={2}>
            <ExportMenu
              onExport={handleExport}
              onClose={() => setMode("dashboard")}
              width={width}
            />
          </Box>
        )}

        {mode === "help" && (
          <Box position="absolute" marginLeft={2} marginTop={2}>
            <HelpOverlay width={width} height={contentHeight} />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <StatusBar
        mode={mode}
        chartType={chartType}
        filterCount={filters.length}
        filteredRows={filteredData.rows.length}
        totalRows={data.rows.length}
        width={width}
      />
    </Box>
  );
}

export default InteractiveDashboard;
