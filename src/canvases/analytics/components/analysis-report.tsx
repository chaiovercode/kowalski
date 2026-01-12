// Analysis Report Component - The Heart of Kowalski
// Shows Claude's analysis prominently with supporting visualizations

import React from "react";
import { Box, Text } from "ink";
import { THEME, ARROWS } from "../theme";
import { Sparkline, BrailleLineChart, BrailleBarChart, Gauge } from "./braille-charts";

// Main Analysis Finding
interface FindingProps {
  title: string;
  description: string;
  metric?: {
    value: string | number;
    change?: number;
    trend?: number[];
  };
  severity?: "info" | "success" | "warning" | "critical";
}

export function Finding({ title, description, metric, severity = "info" }: FindingProps) {
  const severityConfig = {
    info: { color: THEME.primary, icon: "◆" },
    success: { color: THEME.positive, icon: "✓" },
    warning: { color: THEME.warning, icon: "!" },
    critical: { color: THEME.negative, icon: "✗" },
  };

  const { color, icon } = severityConfig[severity];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row">
        <Text color={color} bold>
          {icon} {title}
        </Text>
        {metric?.change !== undefined && (
          <Text color={metric.change >= 0 ? THEME.positive : THEME.negative}>
            {" "}
            {metric.change >= 0 ? ARROWS.up : ARROWS.down}
            {Math.abs(metric.change * 100).toFixed(1)}%
          </Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text color={THEME.text} wrap="wrap">
          {description}
        </Text>
      </Box>
      {metric?.trend && metric.trend.length > 0 && (
        <Box marginLeft={2} marginTop={0}>
          <Sparkline values={metric.trend} width={30} color={color} />
        </Box>
      )}
    </Box>
  );
}

// Key Metric Display (large, prominent)
interface KeyMetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  change?: number;
  trend?: number[];
  width?: number;
}

export function KeyMetric({ label, value, subtext, change, trend, width = 25 }: KeyMetricProps) {
  const changeColor = change === undefined ? THEME.textDim : change >= 0 ? THEME.positive : THEME.negative;

  return (
    <Box flexDirection="column" width={width}>
      <Text color={THEME.textDim}>{label}</Text>
      <Box flexDirection="row" alignItems="flex-end">
        <Text color={THEME.primary} bold>
          {value}
        </Text>
        {change !== undefined && (
          <Text color={changeColor}>
            {" "}
            {change >= 0 ? "+" : ""}
            {(change * 100).toFixed(1)}%
          </Text>
        )}
      </Box>
      {subtext && <Text color={THEME.textDim}>{subtext}</Text>}
      {trend && trend.length > 0 && (
        <Sparkline values={trend} width={Math.min(20, width - 2)} color={THEME.secondary} />
      )}
    </Box>
  );
}

// Section with border and title
interface SectionProps {
  title: string;
  children: React.ReactNode;
  width?: number;
  color?: string;
}

export function Section({ title, children, width, color = THEME.secondary }: SectionProps) {
  return (
    <Box flexDirection="column" width={width} marginBottom={1}>
      <Box flexDirection="row" marginBottom={1}>
        <Text color={color} bold>
          {"─── "}
        </Text>
        <Text color={color} bold>
          {title.toUpperCase()}
        </Text>
        <Text color={color} bold>
          {" ───"}
        </Text>
      </Box>
      <Box marginLeft={1}>{children}</Box>
    </Box>
  );
}

// Comparison (before/after, A vs B)
interface ComparisonProps {
  label: string;
  before: { value: number; label?: string };
  after: { value: number; label?: string };
  format?: (n: number) => string;
}

export function Comparison({ label, before, after, format = (n) => n.toFixed(0) }: ComparisonProps) {
  const change = ((after.value - before.value) / before.value) * 100;
  const changeColor = change >= 0 ? THEME.positive : THEME.negative;

  return (
    <Box flexDirection="row" marginBottom={0}>
      <Text color={THEME.textDim}>{label}: </Text>
      <Text color={THEME.textDim}>{before.label || "Before"} </Text>
      <Text color={THEME.text}>{format(before.value)}</Text>
      <Text color={THEME.textDim}> → </Text>
      <Text color={THEME.text}>{format(after.value)}</Text>
      <Text color={changeColor}>
        {" "}
        ({change >= 0 ? "+" : ""}
        {change.toFixed(1)}%)
      </Text>
    </Box>
  );
}

// Ranking/Leaderboard
interface RankingProps {
  title: string;
  items: { label: string; value: number; change?: number }[];
  format?: (n: number) => string;
  maxItems?: number;
  showBars?: boolean;
  width?: number;
}

export function Ranking({
  title,
  items,
  format = (n) => n.toFixed(0),
  maxItems = 5,
  showBars = true,
  width = 40,
}: RankingProps) {
  const max = Math.max(...items.map((i) => i.value));
  const labelWidth = Math.max(...items.map((i) => i.label.length), 10);
  const barWidth = width - labelWidth - 15;

  return (
    <Box flexDirection="column">
      <Text color={THEME.secondary} bold>
        {title}
      </Text>
      {items.slice(0, maxItems).map((item, i) => {
        const bar = showBars ? Math.round((item.value / max) * barWidth) : 0;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

        return (
          <Box key={i} flexDirection="row">
            <Text color={THEME.textDim}>{medal.padEnd(3)}</Text>
            <Text color={THEME.text}>{item.label.padEnd(labelWidth)} </Text>
            {showBars && <Text color={THEME.primary}>{"█".repeat(bar)}</Text>}
            <Text color={THEME.primary} bold>
              {" "}
              {format(item.value)}
            </Text>
            {item.change !== undefined && (
              <Text color={item.change >= 0 ? THEME.positive : THEME.negative}>
                {" "}
                {item.change >= 0 ? "↑" : "↓"}
                {Math.abs(item.change).toFixed(0)}%
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// Data Quality Indicator
interface DataQualityProps {
  completeness: number; // 0-100
  nullPercentage: number;
  duplicates: number;
  outliers: number;
}

export function DataQuality({ completeness, nullPercentage, duplicates, outliers }: DataQualityProps) {
  return (
    <Box flexDirection="column">
      <Text color={THEME.secondary} bold>
        DATA QUALITY
      </Text>
      <Gauge value={completeness} label="Complete" width={15} />
      <Box flexDirection="row">
        <Text color={THEME.textDim}>Nulls: </Text>
        <Text color={nullPercentage > 10 ? THEME.warning : THEME.text}>
          {nullPercentage.toFixed(1)}%
        </Text>
        <Text color={THEME.textDim}> │ Duplicates: </Text>
        <Text color={duplicates > 0 ? THEME.warning : THEME.text}>{duplicates}</Text>
        <Text color={THEME.textDim}> │ Outliers: </Text>
        <Text color={outliers > 5 ? THEME.warning : THEME.text}>{outliers}</Text>
      </Box>
    </Box>
  );
}

// Statistical Summary
interface StatSummaryProps {
  column: string;
  stats: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q1?: number;
    q3?: number;
  };
  distribution?: number[];
}

export function StatSummary({ column, stats, distribution }: StatSummaryProps) {
  const format = (n: number) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toFixed(1));

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={THEME.secondary} bold>
        {column}
      </Text>
      <Box flexDirection="row">
        <Text color={THEME.textDim}>μ </Text>
        <Text color={THEME.primary}>{format(stats.mean)}</Text>
        <Text color={THEME.textDim}> │ σ </Text>
        <Text color={THEME.primary}>{format(stats.std)}</Text>
        <Text color={THEME.textDim}> │ med </Text>
        <Text color={THEME.primary}>{format(stats.median)}</Text>
      </Box>
      <Box flexDirection="row">
        <Text color={THEME.textDim}>range </Text>
        <Text color={THEME.text}>
          [{format(stats.min)} – {format(stats.max)}]
        </Text>
        {stats.q1 !== undefined && stats.q3 !== undefined && (
          <>
            <Text color={THEME.textDim}> │ IQR </Text>
            <Text color={THEME.text}>
              [{format(stats.q1)} – {format(stats.q3)}]
            </Text>
          </>
        )}
      </Box>
      {distribution && distribution.length > 0 && (
        <Box marginTop={0}>
          <Sparkline values={distribution} width={25} color={THEME.textDim} />
        </Box>
      )}
    </Box>
  );
}

// Correlation Matrix Row
interface CorrelationRowProps {
  variable: string;
  correlations: { variable: string; value: number }[];
}

export function CorrelationRow({ variable, correlations }: CorrelationRowProps) {
  const getCorrelationColor = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 0.7) return v > 0 ? THEME.positive : THEME.negative;
    if (abs >= 0.4) return THEME.warning;
    return THEME.textDim;
  };

  return (
    <Box flexDirection="row">
      <Text color={THEME.text}>{variable.padEnd(12)}</Text>
      {correlations.map((c, i) => (
        <Text key={i} color={getCorrelationColor(c.value)}>
          {c.value >= 0 ? " " : ""}
          {c.value.toFixed(2)}{" "}
        </Text>
      ))}
    </Box>
  );
}

// Executive Summary Box
interface ExecutiveSummaryProps {
  title: string;
  highlights: string[];
  bottomLine: string;
  width?: number;
}

export function ExecutiveSummary({ title, highlights, bottomLine, width = 60 }: ExecutiveSummaryProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="double"
      borderColor={THEME.secondary}
      paddingX={2}
      paddingY={1}
    >
      <Text color={THEME.primary} bold>
        {title}
      </Text>
      <Box marginY={1} flexDirection="column">
        {highlights.map((h, i) => (
          <Box key={i} flexDirection="row">
            <Text color={THEME.warning}>{ARROWS.bullet} </Text>
            <Text color={THEME.text} wrap="wrap">
              {h}
            </Text>
          </Box>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderColor={THEME.border}
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingTop={1}
      >
        <Text color={THEME.positive} bold>
          ◆ {bottomLine}
        </Text>
      </Box>
    </Box>
  );
}

// Anomaly/Outlier Alert
interface AnomalyAlertProps {
  column: string;
  value: number;
  expected: { min: number; max: number };
  severity: "low" | "medium" | "high";
}

export function AnomalyAlert({ column, value, expected, severity }: AnomalyAlertProps) {
  const colors = {
    low: THEME.textDim,
    medium: THEME.warning,
    high: THEME.negative,
  };

  return (
    <Box flexDirection="row">
      <Text color={colors[severity]}>{severity === "high" ? "⚠" : "○"} </Text>
      <Text color={THEME.text}>{column}: </Text>
      <Text color={colors[severity]} bold>
        {value.toFixed(1)}
      </Text>
      <Text color={THEME.textDim}>
        {" "}
        (expected {expected.min.toFixed(0)}–{expected.max.toFixed(0)})
      </Text>
    </Box>
  );
}
