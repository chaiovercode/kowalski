// ASCII Chart Components for Kowalski Analytics

import React from "react";
import { Box, Text } from "ink";
import { KOWALSKI_COLORS, type ChartData, type ChartOptions, formatNumber } from "../types";

interface BaseChartProps {
  title: string;
  data: ChartData;
  options?: ChartOptions;
  width?: number;
  height?: number;
  focused?: boolean;
}

// Bar Chart (Vertical)
export function BarChart({ title, data, options, width = 60, height = 12, focused }: BaseChartProps) {
  const { labels = [], values } = data;
  const maxValue = Math.max(...values, 1);
  const barWidth = Math.max(3, Math.floor((width - 10) / values.length) - 1);
  const chartHeight = height - 4;

  const bars = values.map((value, i) => {
    const barHeight = Math.round((value / maxValue) * chartHeight);
    const color = KOWALSKI_COLORS.chartColors[i % KOWALSKI_COLORS.chartColors.length];

    return (
      <Box key={i} flexDirection="column" alignItems="center" marginRight={1}>
        {/* Bar */}
        <Box flexDirection="column" height={chartHeight} justifyContent="flex-end">
          {Array.from({ length: chartHeight }).map((_, rowIdx) => {
            const isBar = rowIdx >= chartHeight - barHeight;
            return (
              <Text key={rowIdx} color={isBar ? color : undefined}>
                {isBar ? "█".repeat(barWidth) : " ".repeat(barWidth)}
              </Text>
            );
          })}
        </Box>
        {/* Label */}
        <Text color={KOWALSKI_COLORS.textDim} wrap="truncate">
          {(labels[i] || "").slice(0, barWidth)}
        </Text>
        {/* Value */}
        <Text color={color} bold>
          {formatNumber(value, 0)}
        </Text>
      </Box>
    );
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? KOWALSKI_COLORS.borderFocus : KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.primary} bold>
        {title}
      </Text>
      <Box flexDirection="row" marginTop={1}>
        {bars}
      </Box>
    </Box>
  );
}

// Horizontal Bar Chart
export function HorizontalBarChart({ title, data, options, width = 60, height = 12, focused }: BaseChartProps) {
  const { labels = [], values } = data;
  const maxValue = Math.max(...values, 1);
  const labelWidth = Math.min(15, Math.max(...labels.map(l => l.length)));
  const barMaxWidth = width - labelWidth - 15;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? KOWALSKI_COLORS.borderFocus : KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.primary} bold>
        {title}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {values.slice(0, height - 3).map((value, i) => {
          const barWidth = Math.round((value / maxValue) * barMaxWidth);
          const color = KOWALSKI_COLORS.chartColors[i % KOWALSKI_COLORS.chartColors.length];
          const label = (labels[i] || "").padEnd(labelWidth).slice(0, labelWidth);

          return (
            <Box key={i} flexDirection="row">
              <Text color={KOWALSKI_COLORS.textDim}>{label} </Text>
              <Text color={color}>{"█".repeat(barWidth)}</Text>
              <Text color={KOWALSKI_COLORS.text}> {formatNumber(value, 0)}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Line Chart (ASCII)
export function LineChart({ title, data, options, width = 60, height = 12, focused }: BaseChartProps) {
  const { labels = [], values } = data;
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const chartWidth = width - 12;
  const chartHeight = height - 4;

  // Build the chart grid
  const grid: string[][] = Array.from({ length: chartHeight }, () =>
    Array.from({ length: chartWidth }, () => " ")
  );

  // Plot points
  const step = Math.max(1, Math.floor(values.length / chartWidth));
  const sampledValues = values.filter((_, i) => i % step === 0).slice(0, chartWidth);

  sampledValues.forEach((value, x) => {
    const y = chartHeight - 1 - Math.round(((value - minValue) / range) * (chartHeight - 1));
    if (y >= 0 && y < chartHeight && x < chartWidth) {
      grid[y][x] = "●";
    }
  });

  // Connect points with lines
  for (let x = 0; x < sampledValues.length - 1; x++) {
    const y1 = chartHeight - 1 - Math.round(((sampledValues[x] - minValue) / range) * (chartHeight - 1));
    const y2 = chartHeight - 1 - Math.round(((sampledValues[x + 1] - minValue) / range) * (chartHeight - 1));

    if (x < chartWidth - 1) {
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      for (let y = minY; y <= maxY; y++) {
        if (grid[y] && grid[y][x] === " ") {
          grid[y][x] = "│";
        }
      }
    }
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? KOWALSKI_COLORS.borderFocus : KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.primary} bold>
        {title}
      </Text>
      <Box flexDirection="row" marginTop={1}>
        {/* Y-axis labels */}
        <Box flexDirection="column" marginRight={1}>
          <Text color={KOWALSKI_COLORS.textDim}>{formatNumber(maxValue, 0).padStart(6)}</Text>
          {Array.from({ length: chartHeight - 2 }).map((_, i) => (
            <Text key={i}> </Text>
          ))}
          <Text color={KOWALSKI_COLORS.textDim}>{formatNumber(minValue, 0).padStart(6)}</Text>
        </Box>
        {/* Chart area */}
        <Box flexDirection="column">
          {grid.map((row, i) => (
            <Text key={i} color={KOWALSKI_COLORS.secondary}>
              {row.join("")}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// Pie Chart (ASCII representation)
export function PieChart({ title, data, options, width = 40, focused }: BaseChartProps) {
  const { labels = [], values } = data;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const pieChars = ["█", "▓", "▒", "░", "▪", "▫"];

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? KOWALSKI_COLORS.borderFocus : KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.primary} bold>
        {title}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {values.map((value, i) => {
          const percent = (value / total) * 100;
          const barWidth = Math.round((percent / 100) * (width - 25));
          const color = KOWALSKI_COLORS.chartColors[i % KOWALSKI_COLORS.chartColors.length];
          const char = pieChars[i % pieChars.length];

          return (
            <Box key={i} flexDirection="row">
              <Text color={color}>{char} </Text>
              <Text color={KOWALSKI_COLORS.text}>
                {(labels[i] || `Item ${i}`).padEnd(12).slice(0, 12)}
              </Text>
              <Text color={color}>{char.repeat(barWidth)} </Text>
              <Text color={KOWALSKI_COLORS.textDim}>
                {percent.toFixed(1)}%
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Sparkline (mini inline chart)
export function Sparkline({ values, width = 20, color = KOWALSKI_COLORS.secondary }: {
  values: number[];
  width?: number;
  color?: string;
}) {
  const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const step = Math.max(1, Math.floor(values.length / width));
  const sampledValues = values.filter((_, i) => i % step === 0).slice(0, width);

  const sparkline = sampledValues.map(v => {
    const normalized = (v - min) / range;
    const charIndex = Math.min(chars.length - 1, Math.floor(normalized * chars.length));
    return chars[charIndex];
  }).join("");

  return <Text color={color}>{sparkline}</Text>;
}

// Data Table
export function DataTable({
  title,
  columns,
  rows,
  width = 80,
  maxRows = 10,
  focused
}: {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
  width?: number;
  maxRows?: number;
  focused?: boolean;
}) {
  const colWidth = Math.floor((width - 4) / columns.length);

  const formatCell = (value: string | number | null): string => {
    if (value === null) return "—";
    const str = typeof value === "number" ? formatNumber(value, 2) : String(value);
    return str.slice(0, colWidth - 1).padEnd(colWidth - 1);
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? KOWALSKI_COLORS.borderFocus : KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.primary} bold>
        {title}
      </Text>
      {/* Header */}
      <Box flexDirection="row" marginTop={1}>
        {columns.map((col, i) => (
          <Text key={i} color={KOWALSKI_COLORS.accent} bold>
            {col.slice(0, colWidth - 1).padEnd(colWidth - 1)}
          </Text>
        ))}
      </Box>
      {/* Separator */}
      <Text color={KOWALSKI_COLORS.border}>{"─".repeat(width - 4)}</Text>
      {/* Rows */}
      {rows.slice(0, maxRows).map((row, i) => (
        <Box key={i} flexDirection="row">
          {row.map((cell, j) => (
            <Text key={j} color={KOWALSKI_COLORS.text}>
              {formatCell(cell)}
            </Text>
          ))}
        </Box>
      ))}
      {rows.length > maxRows && (
        <Text color={KOWALSKI_COLORS.textDim}>
          ... and {rows.length - maxRows} more rows
        </Text>
      )}
    </Box>
  );
}
