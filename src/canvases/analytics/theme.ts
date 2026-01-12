// Kowalski Analytics Theme - Cyberpunk Data Analyst Aesthetic
// Inspired by the Flight Booking Terminal design

export const THEME = {
  // Primary colors
  primary: "#00ffcc",      // Bright cyan/teal (main accent)
  secondary: "#ff6ac1",    // Magenta/pink (section headers)
  tertiary: "#7957d5",     // Purple (highlights)

  // Data colors
  positive: "#50fa7b",     // Green (positive changes, success)
  negative: "#ff5555",     // Red (negative changes, errors)
  warning: "#ffb86c",      // Orange (warnings)
  neutral: "#6272a4",      // Muted blue-gray

  // Chart palette (vibrant but harmonious)
  chart: [
    "#00ffcc",  // Cyan
    "#ff6ac1",  // Magenta
    "#50fa7b",  // Green
    "#ffb86c",  // Orange
    "#bd93f9",  // Purple
    "#8be9fd",  // Light cyan
    "#f1fa8c",  // Yellow
    "#ff79c6",  // Pink
  ],

  // UI colors
  background: "#1a1a2e",   // Dark blue-black
  surface: "#16213e",      // Slightly lighter
  border: "#3d5a80",       // Soft blue border
  borderFocus: "#00ffcc",  // Cyan when focused
  borderDim: "#2a2a4a",    // Very dim border

  // Text colors
  text: "#f8f8f2",         // Off-white
  textDim: "#6272a4",      // Dimmed text
  textBright: "#ffffff",   // Pure white for emphasis

  // Special
  highlight: "#44475a",    // Selection/highlight background
  selection: "#00ffcc33",  // Selection with transparency
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
  up: "▲",
  down: "▼",
  right: "▶",
  left: "◀",
  upSmall: "↑",
  downSmall: "↓",
  rightSmall: "→",
  leftSmall: "←",
  bullet: "•",
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

// Penguin ASCII art variations
export const PENGUIN = {
  // Minimal inline penguin
  mini: "🐧",

  // Small penguin for header (5 lines)
  small: [
    "  ▄██▄  ",
    " █◉◉█ ",
    " █▽█ ",
    "  ▀▀  ",
    "  ██  ",
  ],

  // Medium penguin with more detail
  medium: [
    "   ▄████▄   ",
    "  █ ◉  ◉ █  ",
    "  █   ▽  █  ",
    "   ▀████▀   ",
    "    ████    ",
    "    █  █    ",
  ],

  // Kowalski with clipboard (for analysis theme)
  kowalski: [
    "   ▄████▄  ┌──┐",
    "  █ ◉  ◉ █ │▓▓│",
    "  █   ▽  █ │▓▓│",
    "   ▀████▀  └──┘",
    "    ████       ",
    "    █  █       ",
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
