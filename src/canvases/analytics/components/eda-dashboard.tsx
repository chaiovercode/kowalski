// EDA Dashboard - State of the Art Terminal Visualization
// Combines Claude's intelligent analysis with inline data visualizations

import React from "react";
import { Box, Text } from "ink";
import { THEME, BOX, ARROWS, formatNumber, truncate } from "../theme";
import type { EDAReport } from "../insights";
import type { DataSet, AnalysisResult } from "../types";
import { BrailleBarChart, Distribution, Sparkline, HeatmapRow, Gauge } from "./braille-charts";
import { KowalskiHeader } from "./kowalski-header";

interface EDADashboardProps {
  data: DataSet;
  analysis: AnalysisResult;
  report: EDAReport;
  width: number;
  height: number;
  scrollOffset?: number;
}

// Mini correlation heatmap using colored blocks
function CorrelationHeatmap({
  correlations,
  width = 30,
}: {
  correlations: { column1: string; column2: string; value: number }[];
  width?: number;
}) {
  if (!correlations || correlations.length === 0) {
    return (
      <Box>
        <Text color={THEME.textDim}>No correlations</Text>
      </Box>
    );
  }

  // Get unique columns and build matrix
  const cols = new Set<string>();
  correlations.forEach((c) => {
    cols.add(c.column1);
    cols.add(c.column2);
  });
  const colList = Array.from(cols).slice(0, 5); // Max 5 columns

  const getCorrelation = (c1: string, c2: string) => {
    if (c1 === c2) return 1;
    const corr = correlations.find(
      (c) =>
        (c.column1 === c1 && c.column2 === c2) ||
        (c.column1 === c2 && c.column2 === c1)
    );
    return corr?.value || 0;
  };

  const getColor = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 0.7) return v > 0 ? THEME.positive : THEME.negative;
    if (abs >= 0.4) return THEME.warning;
    if (abs >= 0.2) return THEME.primary;
    return THEME.textDim;
  };

  const labelWidth = 8;

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        <Text color={THEME.textDim}>{" ".repeat(labelWidth)}</Text>
        {colList.map((col, i) => (
          <Text key={i} color={THEME.textDim}>
            {truncate(col, 4).slice(0, 4).padStart(5)}
          </Text>
        ))}
      </Box>
      {/* Data rows */}
      {colList.map((rowCol, ri) => (
        <Box key={ri}>
          <Text color={THEME.text}>{truncate(rowCol, labelWidth - 1).padEnd(labelWidth)}</Text>
          {colList.map((colCol, ci) => {
            const val = getCorrelation(rowCol, colCol);
            return (
              <Text key={ci} color={getColor(val)}>
                {val > 0.8 ? "████ " : val > 0.5 ? "▓▓▓  " : val > 0.2 ? "▒▒   " : val < -0.5 ? "---  " : "░    "}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

// Category distribution bar chart
function CategoryBars({
  data,
  column,
  metric,
  width = 35,
  maxBars = 6,
}: {
  data: DataSet;
  column: string;
  metric?: string;
  width?: number;
  maxBars?: number;
}) {
  const { columns, rows, types } = data;
  const colIdx = columns.indexOf(column);
  if (colIdx === -1) return null;

  // Aggregate by category
  const metricIdx = metric ? columns.indexOf(metric) : -1;
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const key = String(row[colIdx] || "Unknown");
    if (!groups.has(key)) groups.set(key, []);
    if (metricIdx >= 0 && typeof row[metricIdx] === "number") {
      groups.get(key)!.push(row[metricIdx] as number);
    } else {
      groups.get(key)!.push(1);
    }
  }

  // Calculate aggregates and sort
  const aggregated = Array.from(groups.entries())
    .map(([label, values]) => ({
      label: truncate(label, 10),
      value: metric
        ? values.reduce((a, b) => a + b, 0) / values.length
        : values.length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars);

  // Format values for display
  const maxVal = Math.max(...aggregated.map(a => a.value));
  const barWidth = Math.max(10, width - 20);

  return (
    <Box flexDirection="column">
      {aggregated.map((item, i) => {
        const barLen = Math.max(1, Math.round((item.value / maxVal) * barWidth));
        const colors = [THEME.primary, THEME.secondary, "#50fa7b", "#ffb86c", "#bd93f9"];
        return (
          <Box key={i}>
            <Text color={THEME.textDim}>{item.label.padEnd(10)}</Text>
            <Text color={THEME.border}>{BOX.vertical}</Text>
            <Text color={colors[i % colors.length]}>{"█".repeat(barLen)}</Text>
            <Text color={colors[i % colors.length]} bold> {formatNumber(item.value)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// Quick stats sparkline row
function QuickStatRow({
  label,
  value,
  sparklineData,
  trend,
  width = 40,
}: {
  label: string;
  value: string | number;
  sparklineData?: number[];
  trend?: number;
  width?: number;
}) {
  return (
    <Box flexDirection="row">
      <Text color={THEME.textDim}>{label.padEnd(10)}</Text>
      <Text color={THEME.primary} bold>
        {String(value).padEnd(8)}
      </Text>
      {sparklineData && sparklineData.length > 0 && (
        <Sparkline values={sparklineData} width={15} color={THEME.secondary} />
      )}
      {trend !== undefined && (
        <Text color={trend >= 0 ? THEME.positive : THEME.negative}>
          {" "}
          {trend >= 0 ? ARROWS.upSmall : ARROWS.downSmall}
          {Math.abs(trend).toFixed(1)}%
        </Text>
      )}
    </Box>
  );
}

// Section header with line
function SectionHeader({ title, color = THEME.secondary }: { title: string; color?: string }) {
  return (
    <Box marginBottom={0} marginTop={1}>
      <Text color={color} bold>
        {BOX.horizontal}
        {BOX.horizontal} {title.toUpperCase()} {BOX.horizontal}
        {BOX.horizontal}
      </Text>
    </Box>
  );
}

// Main EDA Dashboard Component
export function EDADashboard({
  data,
  analysis,
  report,
  width,
  height,
  scrollOffset = 0,
}: EDADashboardProps) {
  const { statistics, correlations, trends } = analysis;

  // Adjust dimensions for the outer border
  const innerWidth = width - 2;
  const innerHeight = height - 2;
  const leftWidth = Math.floor(innerWidth * 0.55);
  const rightWidth = innerWidth - leftWidth - 1;

  // Find best columns for visualization
  const numericCols = data.columns.filter((_, i) => data.types?.[i] === "number");
  const categoricalCols = report.variables
    .filter((v) => v.type === "categorical" && !v.notable?.includes("garbage"))
    .map((v) => v.name);

  const primaryMetric = numericCols.find(
    (c) =>
      c.toLowerCase().includes("rate") ||
      c.toLowerCase().includes("revenue") ||
      c.toLowerCase().includes("value")
  ) || numericCols[0];

  const primaryCategory = categoricalCols[0];
  const secondaryCategory = categoricalCols[1];

  // Get sample values for sparklines
  const getColumnSample = (col: string, sampleSize = 50) => {
    const idx = data.columns.indexOf(col);
    if (idx === -1) return [];
    return data.rows
      .slice(0, sampleSize)
      .map((r) => r[idx])
      .filter((v): v is number => typeof v === "number");
  };

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="double"
      borderColor={THEME.border}
    >
      <KowalskiHeader
        title={`EDA: ${data.name}`}
        width={innerWidth}
        subtitle="Automated Insight Generation"
      />

      <Box flexDirection="row" height={innerHeight - 5}>
        {/* LEFT PANEL: Claude's Analysis */}
        <Box flexDirection="column" width={leftWidth} paddingRight={1} paddingLeft={1}>

          {/* The Basics */}
          <Box flexDirection="column" marginBottom={1}>
            <SectionHeader title="The Basics" />
            <Text color={THEME.text} wrap="wrap">
              {report.overview.rows.toLocaleString()} rows {ARROWS.bullet} {report.overview.columns} columns
              {report.overview.suspiciouslyClean && (
                <Text color={THEME.warning}> {ARROWS.bullet} suspiciously clean</Text>
              )}
            </Text>
          </Box>

          {/* Variables Summary */}
          <Box flexDirection="column" marginBottom={1}>
            <SectionHeader title="Variables" />
            {report.variables.slice(0, 7).map((v, i) => {
              const icon = v.type === "numeric" ? "#" : ARROWS.diamond;
              const color = v.type === "numeric" ? THEME.primary : THEME.tertiary;
              // More compact description
              const desc = v.type === "numeric"
                ? v.description.replace(/μ=|σ=|range=\[|\]/g, '').replace(/, /g, ' ').replace('-', '→')
                : v.description;
              return (
                <Box key={i}>
                  <Text color={color}>{icon} </Text>
                  <Text color={THEME.text}>{truncate(v.name, 14).padEnd(15)}</Text>
                  <Text color={THEME.textDim}>{truncate(desc, leftWidth - 22)}</Text>
                  {v.notable && <Text color={THEME.warning}> !</Text>}
                </Box>
              );
            })}
            {report.variables.length > 7 && (
              <Text color={THEME.textDim}>  +{report.variables.length - 7} more...</Text>
            )}
          </Box>

          {/* Findings */}
          {report.isSynthetic && (
            <Box flexDirection="column" marginBottom={1}>
              <Text color={THEME.warning} bold>
                {ARROWS.cross} SYNTHETIC DATA DETECTED
              </Text>
              {report.syntheticReasons.slice(0, 3).map((reason, i) => (
                <Box key={i} marginLeft={1}>
                  <Text color={THEME.textDim}>{i + 1}. </Text>
                  <Text color={THEME.text} wrap="wrap">
                    {truncate(reason, leftWidth - 5)}
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          {/* Key Findings */}
          <Box flexDirection="column" marginBottom={1}>
            <SectionHeader title="Key Findings" />
            {report.findings.slice(0, 4).map((finding, i) => {
              const icon =
                finding.severity === "warning"
                  ? ARROWS.cross
                  : finding.severity === "success"
                    ? ARROWS.check
                    : ARROWS.bullet;
              const color =
                finding.severity === "warning"
                  ? THEME.warning
                  : finding.severity === "success"
                    ? THEME.positive
                    : THEME.textDim;
              return (
                <Box key={i} marginLeft={1}>
                  <Text color={color}>{icon} </Text>
                  <Text color={THEME.text} bold>
                    {truncate(finding.title, 20)}:
                  </Text>
                  <Text color={THEME.textDim}> {truncate(finding.description, leftWidth - 25)}</Text>
                </Box>
              );
            })}
          </Box>

          {/* Bottom Line */}
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={report.isSynthetic ? THEME.warning : THEME.positive}
            paddingX={1}
            marginTop={1}
          >
            <Text color={report.isSynthetic ? THEME.warning : THEME.positive} bold>
              BOTTOM LINE
            </Text>
            <Text color={THEME.text} wrap="wrap">
              {report.bottomLine}
            </Text>
          </Box>
        </Box>

        {/* DIVIDER */}
        <Box flexDirection="column">
          <Text color={THEME.border}>{BOX.vertical}</Text>
          {Array.from({ length: innerHeight - 6 }).map((_, i) => (
            <Text key={i} color={THEME.border}>
              {BOX.vertical}
            </Text>
          ))}
        </Box>

        {/* RIGHT PANEL: Visualizations */}
        <Box flexDirection="column" width={rightWidth} paddingLeft={1}>
          {/* Quick Stats */}
          <Box flexDirection="column" marginBottom={1}>
            <SectionHeader title="Quick Stats" />
            {numericCols.slice(0, 3).map((col, i) => {
              const stats = statistics?.[col];
              if (!stats || stats.type !== "numeric") return null;
              const sample = getColumnSample(col);
              const trend = trends?.find((t) => t.column === col);
              return (
                <QuickStatRow
                  key={i}
                  label={truncate(col, 9)}
                  value={formatNumber(stats.mean || 0)}
                  sparklineData={sample}
                  trend={trend?.changePercent}
                  width={rightWidth - 2}
                />
              );
            })}
          </Box>

          {/* Distribution */}
          {primaryMetric && (
            <Box flexDirection="column" marginBottom={1}>
              <SectionHeader title={`DIST: ${truncate(primaryMetric, 10)}`} />
              <Distribution
                values={getColumnSample(primaryMetric, 500)}
                bins={15}
                width={Math.min(rightWidth - 4, 35)}
                height={3}
                color={THEME.primary}
              />
            </Box>
          )}

          {/* Category Breakdown */}
          {primaryCategory && (
            <Box flexDirection="column" marginBottom={1}>
              <SectionHeader title={`BY ${truncate(primaryCategory, 10)}`} />
              <CategoryBars
                data={data}
                column={primaryCategory}
                metric={primaryMetric}
                width={rightWidth - 4}
                maxBars={5}
              />
            </Box>
          )}

          {/* Correlation Mini-Matrix */}
          {correlations && correlations.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <SectionHeader title="Correlations" />
              <CorrelationHeatmap correlations={correlations} width={rightWidth - 2} />
            </Box>
          )}

          {/* Data Quality Gauge */}
          <Box flexDirection="column">
            <SectionHeader title="Data Quality" />
            <Gauge
              value={100 - (analysis.summary?.missingPercent || 0) * 100}
              max={100}
              width={Math.min(rightWidth - 10, 20)}
              label="Complete"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default EDADashboard;
