// Kowalski Analytics Header - Clean Cyberpunk Style

import React from "react";
import { Box, Text } from "ink";
import { THEME, PENGUIN, padCenter } from "../theme";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  width: number;
  timestamp?: string;
}

export function Header({ title, subtitle, width, timestamp }: HeaderProps) {
  const displayTitle = title || "KOWALSKI ANALYSIS";
  const time = timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const lineWidth = Math.max(0, width - displayTitle.length - time.length - 10);

  return (
    <Box flexDirection="column" width={width}>
      {/* Main header line */}
      <Box flexDirection="row">
        <Text color={THEME.secondary}>{"// "}</Text>
        <Text color={THEME.primary} bold>
          {displayTitle}
        </Text>
        <Text color={THEME.secondary}>{" // "}</Text>
        <Text color={THEME.border}>
          {"═".repeat(lineWidth)}
        </Text>
        <Text color={THEME.textDim}> {time}</Text>
      </Box>

      {/* Decorative separator */}
      <Box>
        <Text color={THEME.border}>{"═".repeat(width)}</Text>
      </Box>
    </Box>
  );
}

// Section header like [ CHARTS ] or [ INSIGHTS ]
interface SectionHeaderProps {
  title: string;
  width?: number;
  focused?: boolean;
}

export function SectionHeader({ title, width, focused }: SectionHeaderProps) {
  const color = focused ? THEME.primary : THEME.secondary;

  return (
    <Box marginBottom={1}>
      <Text color={color} bold>
        {"[ "}
      </Text>
      <Text color={color} bold>
        {title.toUpperCase()}
      </Text>
      <Text color={color} bold>
        {" ]"}
      </Text>
    </Box>
  );
}

// Panel container with border
interface PanelProps {
  title?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  focused?: boolean;
  padding?: number;
}

export function Panel({ title, children, width, height, focused, padding = 1 }: PanelProps) {
  const borderColor = focused ? THEME.borderFocus : THEME.border;

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={borderColor}
      paddingX={padding}
    >
      {title && <SectionHeader title={title} focused={focused} />}
      {children}
    </Box>
  );
}

// Status bar at the bottom
interface StatusBarProps {
  left: string;
  right: string;
  width: number;
}

export function StatusBar({ left, right, width }: StatusBarProps) {
  const middlePadding = Math.max(0, width - left.length - right.length - 4);

  return (
    <Box
      flexDirection="row"
      width={width}
      borderStyle="single"
      borderColor={THEME.border}
      paddingX={1}
    >
      <Text color={THEME.primary}>{left}</Text>
      <Text>{" ".repeat(middlePadding)}</Text>
      <Text color={THEME.textDim}>{right}</Text>
    </Box>
  );
}

// Tab bar for view switching
interface TabBarProps {
  tabs: string[];
  activeIndex: number;
  width: number;
}

export function TabBar({ tabs, activeIndex, width }: TabBarProps) {
  return (
    <Box flexDirection="row" marginY={1}>
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        return (
          <Box key={tab} marginRight={2}>
            <Text
              color={isActive ? THEME.primary : THEME.textDim}
              bold={isActive}
              inverse={isActive}
            >
              {` ${i + 1}:${tab.toUpperCase()} `}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// Loading spinner with Kowalski flair
export function LoadingSpinner({ message = "Analyzing..." }: { message?: string }) {
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
      <Text color={THEME.primary}>{frames[frame]} </Text>
      <Text color={THEME.text}>{message}</Text>
    </Box>
  );
}

// Penguin mascot display
interface MascotProps {
  variant?: "mini" | "small" | "medium" | "kowalski";
  color?: string;
}

export function Mascot({ variant = "small", color = THEME.primary }: MascotProps) {
  if (variant === "mini") {
    return <Text>{PENGUIN.mini}</Text>;
  }

  const art = PENGUIN[variant];
  return (
    <Box flexDirection="column">
      {art.map((line, i) => (
        <Text key={`mascot-${i}`} color={color}>
          {line}
        </Text>
      ))}
    </Box>
  );
}
