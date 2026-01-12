// KPI Card Components for Kowalski Analytics

import React from "react";
import { Box, Text } from "ink";
import { KOWALSKI_COLORS, type KPI, formatPercent, getChangeIcon } from "../types";

interface KPICardProps {
  kpi: KPI;
  width?: number;
}

export function KPICard({ kpi, width = 20 }: KPICardProps) {
  const { label, value, change, changeType } = kpi;

  const changeColor =
    changeType === "increase"
      ? KOWALSKI_COLORS.success
      : changeType === "decrease"
      ? KOWALSKI_COLORS.danger
      : KOWALSKI_COLORS.textDim;

  const icon = getChangeIcon(changeType);

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={KOWALSKI_COLORS.border}
      paddingX={1}
      paddingY={0}
    >
      <Text color={KOWALSKI_COLORS.textDim} wrap="truncate">
        {label}
      </Text>
      <Text color={KOWALSKI_COLORS.primary} bold>
        {String(value)}
      </Text>
      {change !== undefined && (
        <Box flexDirection="row">
          <Text color={changeColor}>
            {icon} {formatPercent(change)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface KPIRowProps {
  kpis: KPI[];
  width?: number;
}

export function KPIRow({ kpis, width = 80 }: KPIRowProps) {
  const cardWidth = Math.floor((width - 4) / Math.min(kpis.length, 4)) - 2;

  return (
    <Box flexDirection="row" justifyContent="space-between">
      {kpis.slice(0, 4).map((kpi, i) => (
        <KPICard key={i} kpi={kpi} width={cardWidth} />
      ))}
    </Box>
  );
}

// Stats Summary Card
interface StatsSummaryProps {
  stats: {
    column: string;
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    std?: number;
  };
  width?: number;
}

export function StatsSummary({ stats, width = 30 }: StatsSummaryProps) {
  const formatStat = (value?: number) =>
    value !== undefined ? value.toFixed(2) : "—";

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.accent} bold>
        {stats.column}
      </Text>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={KOWALSKI_COLORS.textDim}>Mean:</Text>
        <Text color={KOWALSKI_COLORS.text}>{formatStat(stats.mean)}</Text>
      </Box>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={KOWALSKI_COLORS.textDim}>Median:</Text>
        <Text color={KOWALSKI_COLORS.text}>{formatStat(stats.median)}</Text>
      </Box>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={KOWALSKI_COLORS.textDim}>Min:</Text>
        <Text color={KOWALSKI_COLORS.text}>{formatStat(stats.min)}</Text>
      </Box>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={KOWALSKI_COLORS.textDim}>Max:</Text>
        <Text color={KOWALSKI_COLORS.text}>{formatStat(stats.max)}</Text>
      </Box>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={KOWALSKI_COLORS.textDim}>Std Dev:</Text>
        <Text color={KOWALSKI_COLORS.text}>{formatStat(stats.std)}</Text>
      </Box>
    </Box>
  );
}

// Correlation Badge
interface CorrelationBadgeProps {
  column1: string;
  column2: string;
  value: number;
  strength: "strong" | "moderate" | "weak" | "none";
}

export function CorrelationBadge({ column1, column2, value, strength }: CorrelationBadgeProps) {
  const colorMap = {
    strong: KOWALSKI_COLORS.success,
    moderate: KOWALSKI_COLORS.warning,
    weak: KOWALSKI_COLORS.textDim,
    none: KOWALSKI_COLORS.border,
  };

  const icon = value > 0 ? "↗" : value < 0 ? "↘" : "→";

  return (
    <Box flexDirection="row">
      <Text color={colorMap[strength]}>
        {icon} {column1} ↔ {column2}: {value.toFixed(2)} ({strength})
      </Text>
    </Box>
  );
}

// Trend Indicator
interface TrendIndicatorProps {
  column: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  description: string;
}

export function TrendIndicator({ column, direction, changePercent, description }: TrendIndicatorProps) {
  const iconMap = {
    up: "📈",
    down: "📉",
    stable: "➡️",
  };

  const colorMap = {
    up: KOWALSKI_COLORS.success,
    down: KOWALSKI_COLORS.danger,
    stable: KOWALSKI_COLORS.textDim,
  };

  return (
    <Box flexDirection="row">
      <Text>{iconMap[direction]} </Text>
      <Text color={KOWALSKI_COLORS.accent} bold>
        {column}
      </Text>
      <Text color={colorMap[direction]}>
        {" "}
        {changePercent >= 0 ? "+" : ""}
        {changePercent.toFixed(1)}%
      </Text>
      <Text color={KOWALSKI_COLORS.textDim}> - {description}</Text>
    </Box>
  );
}
