// Kowalski Analytics KPIs - Clean Data Cards

import React from "react";
import { Box, Text } from "ink";
import { THEME, ARROWS, formatPercent, formatNumber } from "../theme";
import { SectionHeader } from "./header";

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  sparkline?: number[];
  prefix?: string;
  suffix?: string;
}

interface KPICardProps {
  kpi: KPI;
  width?: number;
  compact?: boolean;
}

// Individual KPI Card
export function KPICard({ kpi, width = 20, compact = false }: KPICardProps) {
  const { label, value, change, changeType, prefix = "", suffix = "" } = kpi;

  const changeColor =
    changeType === "increase"
      ? THEME.positive
      : changeType === "decrease"
      ? THEME.negative
      : THEME.textDim;

  const changeIcon =
    changeType === "increase"
      ? ARROWS.up
      : changeType === "decrease"
      ? ARROWS.down
      : ARROWS.rightSmall;

  const displayValue = typeof value === "number" ? formatNumber(value, 1) : value;

  if (compact) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color={THEME.textDim}>{label}</Text>
        <Box flexDirection="row">
          <Text color={THEME.primary} bold>
            {prefix}{displayValue}{suffix}
          </Text>
          {change !== undefined && (
            <Text color={changeColor}> {changeIcon}{formatPercent(change, false)}</Text>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={THEME.border}
      paddingX={1}
      paddingY={0}
    >
      <Text color={THEME.textDim} wrap="truncate">
        {label.toUpperCase()}
      </Text>
      <Text color={THEME.primary} bold>
        {prefix}{displayValue}{suffix}
      </Text>
      {change !== undefined && (
        <Text color={changeColor}>
          {changeIcon} {formatPercent(change)}
        </Text>
      )}
    </Box>
  );
}

// KPI Row - Multiple KPIs in a row
interface KPIRowProps {
  kpis: KPI[];
  width: number;
}

export function KPIRow({ kpis, width }: KPIRowProps) {
  const cardWidth = Math.floor((width - kpis.length * 2) / Math.min(kpis.length, 4));

  return (
    <Box flexDirection="row" justifyContent="flex-start">
      {kpis.slice(0, 4).map((kpi, i) => (
        <Box key={`kpi-${i}`} marginRight={1}>
          <KPICard kpi={kpi} width={cardWidth} />
        </Box>
      ))}
    </Box>
  );
}

// Stats Summary Panel
interface StatsSummaryProps {
  title: string;
  stats: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  width?: number;
  focused?: boolean;
}

export function StatsSummary({ title, stats, width = 30, focused }: StatsSummaryProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title={title} focused={focused} />

      {stats.map((stat, i) => (
        <Box key={`stat-${i}`} flexDirection="row" justifyContent="space-between">
          <Text color={THEME.textDim}>{stat.label}</Text>
          <Text color={stat.color || THEME.primary} bold>
            {typeof stat.value === "number" ? formatNumber(stat.value, 2) : stat.value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// Correlation display
interface CorrelationProps {
  column1: string;
  column2: string;
  value: number;
  strength: "strong" | "moderate" | "weak" | "none";
}

export function CorrelationBadge({ column1, column2, value, strength }: CorrelationProps) {
  const strengthColors = {
    strong: THEME.positive,
    moderate: THEME.warning,
    weak: THEME.textDim,
    none: THEME.border,
  };

  const icon = value > 0 ? ARROWS.upSmall + ARROWS.rightSmall : value < 0 ? ARROWS.downSmall + ARROWS.rightSmall : ARROWS.rightSmall;

  return (
    <Box flexDirection="row">
      <Text color={strengthColors[strength]}>{icon} </Text>
      <Text color={THEME.text}>{column1}</Text>
      <Text color={THEME.textDim}> ↔ </Text>
      <Text color={THEME.text}>{column2}</Text>
      <Text color={strengthColors[strength]}> {value.toFixed(2)}</Text>
      <Text color={THEME.textDim}> ({strength})</Text>
    </Box>
  );
}

// Trend indicator
interface TrendProps {
  column: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  description?: string;
}

export function TrendIndicator({ column, direction, changePercent, description }: TrendProps) {
  const directionConfig = {
    up: { icon: ARROWS.up, color: THEME.positive },
    down: { icon: ARROWS.down, color: THEME.negative },
    stable: { icon: ARROWS.rightSmall, color: THEME.textDim },
  };

  const { icon, color } = directionConfig[direction];

  return (
    <Box flexDirection="row">
      <Text color={color}>{icon} </Text>
      <Text color={THEME.secondary} bold>{column}</Text>
      <Text color={color}> {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%</Text>
      {description && <Text color={THEME.textDim}> — {description}</Text>}
    </Box>
  );
}

// Insights panel
interface InsightsPanelProps {
  insights: string[];
  width: number;
  focused?: boolean;
}

export function InsightsPanel({ insights, width, focused }: InsightsPanelProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title="INSIGHTS" focused={focused} />

      {insights.map((insight, i) => (
        <Box key={`insight-${i}`} flexDirection="row" marginBottom={i < insights.length - 1 ? 0 : 0}>
          <Text color={THEME.warning}>{ARROWS.bullet} </Text>
          <Text color={THEME.text} wrap="wrap">
            {insight}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// Quick stats bar
interface QuickStatsProps {
  stats: { label: string; value: string | number }[];
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <Box flexDirection="row">
      {stats.map((stat, i) => (
        <Box key={`quick-${i}`} marginRight={3}>
          <Text color={THEME.textDim}>{stat.label}: </Text>
          <Text color={THEME.primary} bold>
            {typeof stat.value === "number" ? formatNumber(stat.value, 0) : stat.value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
