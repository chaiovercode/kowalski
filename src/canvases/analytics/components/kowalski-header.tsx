// Kowalski Header Component

import React from "react";
import { Box, Text } from "ink";
import { KOWALSKI_COLORS } from "../types";

interface KowalskiHeaderProps {
  title?: string;
  subtitle?: string;
  width: number;
  showPenguin?: boolean;
}

// Compact Kowalski ASCII art
const PENGUIN_SMALL = [
  "   ▄█▀▀▀█▄   ",
  "  █▀ ◉ ◉ ▀█  ",
  "  █   ▽   █  ",
  "  ▀█▄▄▄▄▄█▀  ",
  "    ██ ██    ",
];

const PENGUIN_MINI = "🐧";

export function KowalskiHeader({ title, subtitle, width, showPenguin = true }: KowalskiHeaderProps) {
  const headerTitle = title || "KOWALSKI ANALYSIS";
  const headerWidth = width - 4;

  // Create the stylized header text
  const createBanner = () => {
    const padding = Math.max(0, Math.floor((headerWidth - headerTitle.length - 20) / 2));
    return "═".repeat(padding) + `[ ${headerTitle} ]` + "═".repeat(padding);
  };

  return (
    <Box flexDirection="column" width={width}>
      {/* Top border */}
      <Box flexDirection="row">
        <Text color={KOWALSKI_COLORS.primary}>╔{"═".repeat(width - 2)}╗</Text>
      </Box>

      {/* Header content */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={KOWALSKI_COLORS.primary}>║</Text>

        {showPenguin && width > 60 ? (
          <Box flexDirection="row" width={width - 4}>
            {/* Penguin ASCII */}
            <Box flexDirection="column" marginRight={2}>
              {PENGUIN_SMALL.map((line, i) => (
                <Text key={`penguin-${i}`} color={KOWALSKI_COLORS.secondary}>
                  {line}
                </Text>
              ))}
            </Box>

            {/* Title area */}
            <Box flexDirection="column" justifyContent="center">
              <Text color={KOWALSKI_COLORS.primary} bold>
                ╔══════════════════════════════════╗
              </Text>
              <Text color={KOWALSKI_COLORS.primary} bold>
                ║  {PENGUIN_MINI} KOWALSKI ANALYSIS! {PENGUIN_MINI}       ║
              </Text>
              <Text color={KOWALSKI_COLORS.primary} bold>
                ╚══════════════════════════════════╝
              </Text>
              {subtitle && (
                <Text color={KOWALSKI_COLORS.textDim}> {subtitle}</Text>
              )}
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column" width={width - 4} alignItems="center">
            <Text color={KOWALSKI_COLORS.primary} bold>
              {PENGUIN_MINI} KOWALSKI ANALYSIS! {PENGUIN_MINI}
            </Text>
            {subtitle && (
              <Text color={KOWALSKI_COLORS.textDim}>{subtitle}</Text>
            )}
          </Box>
        )}

        <Text color={KOWALSKI_COLORS.primary}>║</Text>
      </Box>

      {/* Bottom border */}
      <Box flexDirection="row">
        <Text color={KOWALSKI_COLORS.primary}>╚{"═".repeat(width - 2)}╝</Text>
      </Box>
    </Box>
  );
}

// Minimal header for narrow terminals
export function KowalskiHeaderMini({ title, width }: { title?: string; width: number }) {
  return (
    <Box flexDirection="row" justifyContent="center" width={width}>
      <Text color={KOWALSKI_COLORS.primary} bold>
        {PENGUIN_MINI} {title || "KOWALSKI"} {PENGUIN_MINI}
      </Text>
    </Box>
  );
}

// Status bar at the bottom
export function KowalskiStatusBar({
  status,
  controls,
  width,
}: {
  status: string;
  controls: string;
  width: number;
}) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      width={width}
      borderStyle="single"
      borderColor={KOWALSKI_COLORS.border}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.secondary}>{status}</Text>
      <Text color={KOWALSKI_COLORS.textDim}>{controls}</Text>
    </Box>
  );
}

// Loading spinner with Kowalski flair
export function KowalskiLoading({ message = "Analyzing..." }: { message?: string }) {
  const [frame, setFrame] = React.useState(0);
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="row">
      <Text color={KOWALSKI_COLORS.accent}>{frames[frame]} </Text>
      <Text color={KOWALSKI_COLORS.text}>{message}</Text>
    </Box>
  );
}

// Insight box for displaying AI-generated insights
export function InsightBox({ insights, width }: { insights: string[]; width: number }) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={KOWALSKI_COLORS.accent}
      paddingX={1}
    >
      <Text color={KOWALSKI_COLORS.accent} bold>
        💡 INSIGHTS
      </Text>
      {insights.map((insight, i) => (
        <Box key={i} flexDirection="row" marginTop={i === 0 ? 1 : 0}>
          <Text color={KOWALSKI_COLORS.secondary}>• </Text>
          <Text color={KOWALSKI_COLORS.text} wrap="wrap">
            {insight}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
