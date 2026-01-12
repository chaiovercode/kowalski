// Kowalski Analytics Charts - Beautiful Cyberpunk Visualizations

import React from "react";
import { Box, Text } from "ink";
import { THEME, BLOCKS, SPARK, ARROWS, formatNumber, truncate } from "../theme";
import { SectionHeader } from "./header";

interface ChartData {
  labels?: string[];
  values: number[];
  series?: { name: string; values: number[] }[];
}

interface ChartProps {
  title: string;
  data: ChartData;
  width?: number;
  height?: number;
  focused?: boolean;
  colorIndex?: number;
}

// Vertical Bar Chart - Beautiful and clean
export function BarChart({ title, data, width = 50, height = 12, focused, colorIndex = 0 }: ChartProps) {
  const { labels = [], values } = data;
  const maxValue = Math.max(...values, 1);
  const chartHeight = height - 5; // Reserve space for labels and values

  const barCount = values.length;
  const availableWidth = width - 4;
  const barWidth = Math.max(3, Math.floor(availableWidth / barCount) - 1);
  const gap = 1;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title={title} focused={focused} />

      {/* Chart area */}
      <Box flexDirection="row" height={chartHeight}>
        {values.map((value, i) => {
          const barHeight = Math.max(1, Math.round((value / maxValue) * chartHeight));
          const color = THEME.chart[i % THEME.chart.length];
          const emptyHeight = chartHeight - barHeight;

          return (
            <Box key={`bar-${i}`} flexDirection="column" marginRight={gap} alignItems="center">
              {/* Empty space above bar */}
              {emptyHeight > 0 && (
                <Box height={emptyHeight}>
                  <Text> </Text>
                </Box>
              )}
              {/* The bar itself */}
              <Box flexDirection="column">
                {Array.from({ length: barHeight }).map((_, row) => (
                  <Text key={`bar-${i}-${row}`} color={color}>
                    {BLOCKS.full.repeat(barWidth)}
                  </Text>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Labels */}
      <Box flexDirection="row" marginTop={0}>
        {labels.map((label, i) => (
          <Box key={`label-${i}`} width={barWidth + gap} marginRight={0}>
            <Text color={THEME.textDim}>
              {truncate(label, barWidth + gap).padEnd(barWidth + gap)}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Values */}
      <Box flexDirection="row">
        {values.map((value, i) => {
          const color = THEME.chart[i % THEME.chart.length];
          return (
            <Box key={`value-${i}`} width={barWidth + gap} marginRight={0}>
              <Text color={color} bold>
                {formatNumber(value, 0).padEnd(barWidth + gap)}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Horizontal Bar Chart - Great for rankings
export function HorizontalBarChart({ title, data, width = 50, height = 12, focused }: ChartProps) {
  const { labels = [], values } = data;
  const maxValue = Math.max(...values, 1);
  const labelWidth = Math.min(12, Math.max(...labels.map((l) => l.length)));
  const barMaxWidth = width - labelWidth - 12;
  const maxRows = height - 3;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title={title} focused={focused} />

      <Box flexDirection="column">
        {values.slice(0, maxRows).map((value, i) => {
          const barWidth = Math.max(1, Math.round((value / maxValue) * barMaxWidth));
          const color = THEME.chart[i % THEME.chart.length];
          const label = truncate(labels[i] || `Item ${i + 1}`, labelWidth);

          return (
            <Box key={`hbar-${i}`} flexDirection="row">
              <Text color={THEME.textDim}>{label.padEnd(labelWidth)} </Text>
              <Text color={color}>{BLOCKS.full.repeat(barWidth)}</Text>
              <Text color={color} bold> {formatNumber(value, 0)}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Line Chart with proper ASCII rendering
export function LineChart({ title, data, width = 50, height = 12, focused }: ChartProps) {
  const { values } = data;
  const chartWidth = width - 10;
  const chartHeight = height - 4;

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  // Sample values to fit width
  const step = Math.max(1, Math.floor(values.length / chartWidth));
  const sampledValues = values.filter((_, i) => i % step === 0).slice(0, chartWidth);

  // Build grid
  const grid: string[][] = Array.from({ length: chartHeight }, () =>
    Array.from({ length: chartWidth }, () => " ")
  );

  // Plot points and connect with lines
  sampledValues.forEach((value, x) => {
    const y = chartHeight - 1 - Math.round(((value - minValue) / range) * (chartHeight - 1));
    if (y >= 0 && y < chartHeight && x < chartWidth) {
      grid[y][x] = ARROWS.circle;
    }
  });

  // Connect points
  for (let x = 0; x < sampledValues.length - 1; x++) {
    const y1 = chartHeight - 1 - Math.round(((sampledValues[x] - minValue) / range) * (chartHeight - 1));
    const y2 = chartHeight - 1 - Math.round(((sampledValues[x + 1] - minValue) / range) * (chartHeight - 1));

    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let y = minY + 1; y < maxY; y++) {
      if (grid[y] && grid[y][x] === " ") {
        grid[y][x] = "│";
      }
    }
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title={title} focused={focused} />

      <Box flexDirection="row">
        {/* Y-axis labels */}
        <Box flexDirection="column" width={6} marginRight={1}>
          <Text color={THEME.textDim}>{formatNumber(maxValue, 0).padStart(5)}</Text>
          {Array.from({ length: chartHeight - 2 }).map((_, i) => (
            <Text key={`yaxis-${i}`}> </Text>
          ))}
          <Text color={THEME.textDim}>{formatNumber(minValue, 0).padStart(5)}</Text>
        </Box>

        {/* Chart area */}
        <Box flexDirection="column">
          {grid.map((row, i) => (
            <Text key={`line-row-${i}`} color={THEME.primary}>
              {row.join("")}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// Sparkline - Inline mini chart
export function Sparkline({ values, width = 20, color = THEME.primary }: {
  values: number[];
  width?: number;
  color?: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const step = Math.max(1, Math.floor(values.length / width));
  const sampledValues = values.filter((_, i) => i % step === 0).slice(0, width);

  const sparkline = sampledValues.map((v) => {
    const normalized = (v - min) / range;
    const charIndex = Math.min(SPARK.length - 1, Math.floor(normalized * SPARK.length));
    return SPARK[charIndex];
  }).join("");

  return <Text color={color}>{sparkline}</Text>;
}

// Pie Chart (Distribution display)
export function PieChart({ title, data, width = 40, focused }: ChartProps) {
  const { labels = [], values } = data;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const barMaxWidth = width - 25;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title={title} focused={focused} />

      <Box flexDirection="column">
        {values.map((value, i) => {
          const percent = (value / total) * 100;
          const barWidth = Math.max(1, Math.round((percent / 100) * barMaxWidth));
          const color = THEME.chart[i % THEME.chart.length];
          const label = truncate(labels[i] || `Item ${i + 1}`, 10);

          return (
            <Box key={`pie-${i}`} flexDirection="row">
              <Text color={color}>{ARROWS.square} </Text>
              <Text color={THEME.text}>{label.padEnd(10)} </Text>
              <Text color={color}>{BLOCKS.full.repeat(barWidth)}</Text>
              <Text color={THEME.textDim}> {percent.toFixed(1)}%</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Data Table
export function DataTable({
  title,
  columns,
  rows,
  width = 80,
  maxRows = 8,
  focused,
}: {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
  width?: number;
  maxRows?: number;
  focused?: boolean;
}) {
  const colCount = columns.length;
  const colWidth = Math.floor((width - 4) / colCount);

  const formatCell = (value: string | number | null, colIdx: number): string => {
    if (value === null) return "—".padEnd(colWidth - 1);
    const str = typeof value === "number" ? formatNumber(value, 2) : String(value);
    return truncate(str, colWidth - 1).padEnd(colWidth - 1);
  };

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? THEME.borderFocus : THEME.border}
      paddingX={1}
    >
      <SectionHeader title={title} focused={focused} />

      {/* Header row */}
      <Box flexDirection="row">
        {columns.map((col, i) => (
          <Text key={`col-${i}`} color={THEME.secondary} bold>
            {truncate(col, colWidth - 1).padEnd(colWidth)}
          </Text>
        ))}
      </Box>

      {/* Separator */}
      <Text color={THEME.border}>{"─".repeat(width - 4)}</Text>

      {/* Data rows */}
      {rows.slice(0, maxRows).map((row, rowIdx) => (
        <Box key={`row-${rowIdx}`} flexDirection="row">
          {row.map((cell, colIdx) => (
            <Text
              key={`cell-${rowIdx}-${colIdx}`}
              color={typeof cell === "number" ? THEME.primary : THEME.text}
            >
              {formatCell(cell, colIdx)}
            </Text>
          ))}
        </Box>
      ))}

      {rows.length > maxRows && (
        <Text color={THEME.textDim}>
          {ARROWS.bullet} {rows.length - maxRows} more rows...
        </Text>
      )}
    </Box>
  );
}
