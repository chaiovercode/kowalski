// Kowalski Analytics Theme - Clean, Minimal, Professional
// Simple grayscale theme with clear visual hierarchy

export const THEME = {
  // Primary colors - clean and minimal
  primary: "#3b82f6",      // Blue (main accent)
  secondary: "#64748b",    // Slate gray (section headers)
  tertiary: "#8b5cf6",     // Purple (highlights)

  // Semantic colors
  positive: "#22c55e",     // Green (success, increases)
  negative: "#ef4444",     // Red (errors, decreases)
  warning: "#f59e0b",      // Amber (warnings)
  neutral: "#94a3b8",      // Gray (neutral)

  // Chart palette - clean colors
  chart: [
    "#3b82f6",  // Blue
    "#22c55e",  // Green
    "#f59e0b",  // Amber
    "#ef4444",  // Red
    "#8b5cf6",  // Purple
    "#ec4899",  // Pink
    "#14b8a6",  // Teal
    "#f97316",  // Orange
  ],

  // UI colors
  background: "transparent",
  surface: "transparent",
  border: "#374151",       // Dark gray border
  borderFocus: "#3b82f6",
  borderDim: "#9ca3af",

  // Text colors
  text: "#f9fafb",         // Near white
  textDim: "#9ca3af",      // Gray for secondary text
  textBright: "#ffffff",   // Pure white

  // Special
  highlight: "#1f2937",
  selection: "#3b82f633",
} as const;

// Box drawing characters for clean UI
export const BOX = {
  // Single line
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",

  // Double line (for emphasis)
  dTopLeft: "╔",
  dTopRight: "╗",
  dBottomLeft: "╚",
  dBottomRight: "╝",
  dHorizontal: "═",
  dVertical: "║",

  // Connectors
  teeRight: "├",
  teeLeft: "┤",
  teeDown: "┬",
  teeUp: "┴",
  cross: "┼",
} as const;

// Block characters for charts
export const BLOCKS = {
  full: "█",
  dark: "▓",
  medium: "▒",
  light: "░",
  upper: "▀",
  lower: "▄",
  left: "▌",
  right: "▐",
} as const;

// Sparkline characters
export const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

// Arrow and indicator characters
export const ARROWS = {
  up: "↑",
  down: "↓",
  right: "→",
  left: "←",
  upSmall: "↑",
  downSmall: "↓",
  rightSmall: "→",
  leftSmall: "←",
  bullet: "·",
  diamond: "◆",
  circle: "●",
  circleEmpty: "○",
  square: "■",
  squareEmpty: "□",
  check: "✓",
  cross: "✗",
  star: "★",
  starEmpty: "☆",
} as const;

// Penguin ASCII art - minimal
export const PENGUIN = {
  mini: "🐧",
  small: [
    "  ▄▄▄  ",
    " █ █ █ ",
    "  ▀▀▀  ",
  ],
  medium: [
    "   ▄▄▄▄▄   ",
    "  █  █  █  ",
    "   ▄▄▄▄▄   ",
    "   ▀▀▀▀▀   ",
  ],
  kowalski: [
    "  ▄████▄ ",
    " █ ▄▄ █ ",
    " █ ▀▀ █ ",
    "  ▀▀▀▀  ",
  ],
} as const;

// Format helpers
export function formatNumber(n: number, decimals = 1): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(decimals) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(decimals) + "K";
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(decimals);
}

export function formatPercent(n: number, includeSign = true): string {
  const sign = includeSign && n > 0 ? "+" : "";
  return sign + (n * 100).toFixed(1) + "%";
}

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

export function padCenter(str: string, width: number): string {
  const padding = width - str.length;
  if (padding <= 0) return str.slice(0, width);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return " ".repeat(left) + str + " ".repeat(right);
}

export function truncate(str: string, maxLength: number, suffix = "…"): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
