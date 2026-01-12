// Kowalski Header Component - Clean & Minimal

import React from "react";
import { Box, Text } from "ink";
import { THEME, PENGUIN } from "../theme";

interface KowalskiHeaderProps {
  title?: string;
  subtitle?: string;
  width: number;
  showPenguin?: boolean;
}

export function KowalskiHeader({ title, subtitle, width, showPenguin = true }: KowalskiHeaderProps) {
  const headerTitle = title || "KOWALSKI";
  const penguin = PENGUIN.mini;

  return (
    <Box flexDirection="column" width={width}>
      <Box flexDirection="row">
        <Text color={THEME.border}>{"─".repeat(width)}</Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
        <Text color={THEME.primary} bold>
          {penguin} {headerTitle}
        </Text>
        {subtitle && (
          <Text color={THEME.textDim}>{subtitle}</Text>
        )}
      </Box>

      <Box flexDirection="row">
        <Text color={THEME.border}>{"─".repeat(width)}</Text>
      </Box>
    </Box>
  );
}

export function KowalskiHeaderMini({ title, width }: { title?: string; width: number }) {
  return (
    <Box flexDirection="row" justifyContent="center" width={width}>
      <Text color={THEME.primary} bold>
        {PENGUIN.mini} {title || "KOWALSKI"} {PENGUIN.mini}
      </Text>
    </Box>
  );
}

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
      borderColor={THEME.border}
      paddingX={1}
    >
      <Text color={THEME.secondary}>{status}</Text>
      <Text color={THEME.textDim}>{controls}</Text>
    </Box>
  );
}

export function KowalskiLoading({ message = "Analyzing..." }: { message?: string }) {
  const [frame, setFrame] = React.useState(0);
  const frames = [".", "..", "...", "...."];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="row">
      <Text color={THEME.primary}>{frames[frame]} </Text>
      <Text color={THEME.text}>{message}</Text>
    </Box>
  );
}

export function InsightBox({ insights, width }: { insights: string[]; width: number }) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={THEME.primary}
      paddingX={1}
    >
      <Text color={THEME.primary} bold>Insights</Text>
      {insights.map((insight, i) => (
        <Box key={i} flexDirection="row" marginTop={i === 0 ? 1 : 0}>
          <Text color={THEME.secondary}>- </Text>
          <Text color={THEME.text} wrap="wrap">
            {insight}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
