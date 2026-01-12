// High-Resolution Braille Charts for Kowalski Analytics
// Uses Unicode braille patterns for 2x4 pixel resolution per character

import React from "react";
import { Box, Text } from "ink";
import { THEME } from "../theme";

// Braille character mapping (2 columns × 4 rows per character)
// Dot positions: 1 4
//                2 5
//                3 6
//                7 8
const BRAILLE_BASE = 0x2800;
const DOT_MAP = [
  [0x01, 0x08], // Row 0: dots 1, 4
  [0x02, 0x10], // Row 1: dots 2, 5
  [0x04, 0x20], // Row 2: dots 3, 6
  [0x40, 0x80], // Row 3: dots 7, 8
];

// Convert a 2x4 pixel grid to a braille character
function pixelsToBraille(pixels: boolean[][]): string {
  let code = BRAILLE_BASE;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      if (pixels[row]?.[col]) {
        code |= DOT_MAP[row][col];
      }
    }
  }
  return String.fromCharCode(code);
}

// High-resolution line chart using braille
export function BrailleLineChart({
  values,
  width = 60,
  height = 8,
  color = THEME.primary,
  showAxis = true,
  title,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  showAxis?: boolean;
  title?: string;
}) {
  const pixelWidth = width * 2; // 2 pixels per character
  const pixelHeight = height * 4; // 4 pixels per character

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Create pixel grid
  const grid: boolean[][] = Array.from({ length: pixelHeight }, () =>
    Array.from({ length: pixelWidth }, () => false)
  );

  // Sample and plot values
  const step = Math.max(1, values.length / pixelWidth);
  for (let px = 0; px < pixelWidth; px++) {
    const idx = Math.min(Math.floor(px * step), values.length - 1);
    const value = values[idx];
    const py = pixelHeight - 1 - Math.round(((value - min) / range) * (pixelHeight - 1));
    if (py >= 0 && py < pixelHeight) {
      grid[py][px] = true;
      // Fill below for area chart effect (optional)
      // for (let y = py; y < pixelHeight; y++) grid[y][px] = true;
    }
  }

  // Connect points with lines
  for (let px = 0; px < pixelWidth - 1; px++) {
    const idx1 = Math.min(Math.floor(px * step), values.length - 1);
    const idx2 = Math.min(Math.floor((px + 1) * step), values.length - 1);
    const py1 = pixelHeight - 1 - Math.round(((values[idx1] - min) / range) * (pixelHeight - 1));
    const py2 = pixelHeight - 1 - Math.round(((values[idx2] - min) / range) * (pixelHeight - 1));

    // Bresenham's line algorithm
    const dy = Math.abs(py2 - py1);
    const sy = py1 < py2 ? 1 : -1;
    let y = py1;
    for (let i = 0; i <= dy; i++) {
      if (y >= 0 && y < pixelHeight) {
        grid[y][px] = true;
      }
      y += sy;
    }
  }

  // Convert to braille characters
  const lines: string[] = [];
  for (let charRow = 0; charRow < height; charRow++) {
    let line = "";
    for (let charCol = 0; charCol < width; charCol++) {
      const pixels: boolean[][] = [];
      for (let py = 0; py < 4; py++) {
        pixels.push([
          grid[charRow * 4 + py]?.[charCol * 2] || false,
          grid[charRow * 4 + py]?.[charCol * 2 + 1] || false,
        ]);
      }
      line += pixelsToBraille(pixels);
    }
    lines.push(line);
  }

  const formatNum = (n: number) => {
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toFixed(0);
  };

  return (
    <Box flexDirection="column">
      {title && (
        <Text color={THEME.secondary} bold>
          {title}
        </Text>
      )}
      <Box flexDirection="row">
        {showAxis && (
          <Box flexDirection="column" marginRight={1} width={5}>
            <Text color={THEME.textDim}>{formatNum(max).padStart(5)}</Text>
            {Array.from({ length: height - 2 }).map((_, i) => (
              <Text key={i}> </Text>
            ))}
            <Text color={THEME.textDim}>{formatNum(min).padStart(5)}</Text>
          </Box>
        )}
        <Box flexDirection="column">
          {lines.map((line, i) => (
            <Text key={i} color={color}>
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// Sparkline - inline mini chart
export function Sparkline({
  values,
  width = 20,
  color = THEME.primary,
  showMinMax = false,
}: {
  values: number[];
  width?: number;
  color?: string;
  showMinMax?: boolean;
}) {
  const height = 1; // Single row
  const pixelWidth = width * 2;
  const pixelHeight = 4;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const grid: boolean[][] = Array.from({ length: pixelHeight }, () =>
    Array.from({ length: pixelWidth }, () => false)
  );

  const step = Math.max(1, values.length / pixelWidth);
  for (let px = 0; px < pixelWidth; px++) {
    const idx = Math.min(Math.floor(px * step), values.length - 1);
    const value = values[idx];
    const py = pixelHeight - 1 - Math.round(((value - min) / range) * (pixelHeight - 1));
    if (py >= 0 && py < pixelHeight) {
      grid[py][px] = true;
    }
  }

  let sparkline = "";
  for (let charCol = 0; charCol < width; charCol++) {
    const pixels: boolean[][] = [];
    for (let py = 0; py < 4; py++) {
      pixels.push([
        grid[py]?.[charCol * 2] || false,
        grid[py]?.[charCol * 2 + 1] || false,
      ]);
    }
    sparkline += pixelsToBraille(pixels);
  }

  return (
    <Box flexDirection="row">
      {showMinMax && <Text color={THEME.textDim}>{min.toFixed(0)} </Text>}
      <Text color={color}>{sparkline}</Text>
      {showMinMax && <Text color={THEME.textDim}> {max.toFixed(0)}</Text>}
    </Box>
  );
}

// Bar chart with better rendering
export function BrailleBarChart({
  labels,
  values,
  width = 50,
  height = 6,
  color = THEME.primary,
  horizontal = false,
  showValues = true,
}: {
  labels: string[];
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  horizontal?: boolean;
  showValues?: boolean;
}) {
  const max = Math.max(...values, 1);
  const colors = [THEME.primary, THEME.secondary, "#50fa7b", "#ffb86c", "#bd93f9", "#ff79c6"];

  if (horizontal) {
    const labelWidth = Math.max(...labels.map((l) => l.length), 8);
    const barMaxWidth = width - labelWidth - 10;

    return (
      <Box flexDirection="column">
        {values.map((value, i) => {
          const barWidth = Math.max(1, Math.round((value / max) * barMaxWidth));
          const barColor = colors[i % colors.length];
          // Use full blocks for cleaner look
          const bar = "█".repeat(barWidth);

          return (
            <Box key={i} flexDirection="row">
              <Text color={THEME.textDim}>
                {labels[i]?.slice(0, labelWidth).padEnd(labelWidth)}
              </Text>
              <Text color={THEME.border}> │</Text>
              <Text color={barColor}>{bar}</Text>
              {showValues && (
                <Text color={barColor} bold>
                  {" "}
                  {value >= 1000 ? (value / 1000).toFixed(1) + "K" : value}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  // Vertical bars
  const barCount = values.length;
  const barWidth = Math.max(3, Math.floor((width - 2) / barCount) - 1);
  const chartHeight = height - 2;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" height={chartHeight}>
        {values.map((value, i) => {
          const barHeight = Math.max(1, Math.round((value / max) * chartHeight));
          const barColor = colors[i % colors.length];
          const emptyHeight = chartHeight - barHeight;

          return (
            <Box key={i} flexDirection="column" marginRight={1}>
              {emptyHeight > 0 && <Box height={emptyHeight} />}
              <Box flexDirection="column">
                {Array.from({ length: barHeight }).map((_, row) => (
                  <Text key={row} color={barColor}>
                    {"█".repeat(barWidth)}
                  </Text>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
      {/* Labels */}
      <Box flexDirection="row">
        {labels.map((label, i) => (
          <Text key={i} color={THEME.textDim}>
            {label.slice(0, barWidth).padEnd(barWidth + 1)}
          </Text>
        ))}
      </Box>
      {/* Values */}
      {showValues && (
        <Box flexDirection="row">
          {values.map((value, i) => {
            const barColor = colors[i % colors.length];
            const display = value >= 1000 ? (value / 1000).toFixed(0) + "K" : value.toString();
            return (
              <Text key={i} color={barColor} bold>
                {display.padEnd(barWidth + 1)}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// Distribution/Histogram using braille
export function Distribution({
  values,
  bins = 20,
  width = 40,
  height = 4,
  color = THEME.primary,
}: {
  values: number[];
  bins?: number;
  width?: number;
  height?: number;
  color?: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;

  // Count values in each bin
  const counts = Array(bins).fill(0);
  for (const v of values) {
    const binIdx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[binIdx]++;
  }

  const maxCount = Math.max(...counts);

  // Create braille representation
  const pixelWidth = width * 2;
  const pixelHeight = height * 4;
  const grid: boolean[][] = Array.from({ length: pixelHeight }, () =>
    Array.from({ length: pixelWidth }, () => false)
  );

  const pxPerBin = Math.max(1, Math.floor(pixelWidth / bins));
  for (let b = 0; b < bins; b++) {
    const barHeight = Math.round((counts[b] / maxCount) * pixelHeight);
    for (let py = pixelHeight - barHeight; py < pixelHeight; py++) {
      for (let px = b * pxPerBin; px < (b + 1) * pxPerBin && px < pixelWidth; px++) {
        grid[py][px] = true;
      }
    }
  }

  const lines: string[] = [];
  for (let charRow = 0; charRow < height; charRow++) {
    let line = "";
    for (let charCol = 0; charCol < width; charCol++) {
      const pixels: boolean[][] = [];
      for (let py = 0; py < 4; py++) {
        pixels.push([
          grid[charRow * 4 + py]?.[charCol * 2] || false,
          grid[charRow * 4 + py]?.[charCol * 2 + 1] || false,
        ]);
      }
      line += pixelsToBraille(pixels);
    }
    lines.push(line);
  }

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} color={color}>
          {line}
        </Text>
      ))}
      <Box flexDirection="row" justifyContent="space-between" width={width}>
        <Text color={THEME.textDim}>{min.toFixed(0)}</Text>
        <Text color={THEME.textDim}>{max.toFixed(0)}</Text>
      </Box>
    </Box>
  );
}

// Gauge/Progress indicator
export function Gauge({
  value,
  max = 100,
  width = 20,
  label,
  showPercent = true,
}: {
  value: number;
  max?: number;
  width?: number;
  label?: string;
  showPercent?: boolean;
}) {
  const percent = Math.min(100, (value / max) * 100);
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const color =
    percent >= 80 ? THEME.positive : percent >= 50 ? THEME.warning : THEME.negative;

  return (
    <Box flexDirection="row">
      {label && <Text color={THEME.textDim}>{label} </Text>}
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color={THEME.border}>{"░".repeat(empty)}</Text>
      {showPercent && (
        <Text color={color} bold>
          {" "}
          {percent.toFixed(0)}%
        </Text>
      )}
    </Box>
  );
}

// Heatmap row (for correlation matrices, etc.)
export function HeatmapRow({
  values,
  labels,
  min = -1,
  max = 1,
}: {
  values: number[];
  labels?: string[];
  min?: number;
  max?: number;
}) {
  const range = max - min;

  const getColor = (v: number) => {
    const normalized = (v - min) / range;
    if (normalized < 0.25) return "#3b82f6"; // Blue (low)
    if (normalized < 0.5) return "#8b5cf6"; // Purple
    if (normalized < 0.75) return "#f59e0b"; // Orange
    return "#ef4444"; // Red (high)
  };

  return (
    <Box flexDirection="row">
      {values.map((v, i) => (
        <Box key={i} marginRight={0}>
          <Text color={getColor(v)} backgroundColor={getColor(v)}>
            {"  "}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
