// Kowalski Personality Module
// "Kowalski, analysis!" - The voice of our analytical penguin

export type MessageType =
  | "greeting"
  | "finding"
  | "question"
  | "warning"
  | "success"
  | "error"
  | "status"
  | "hypothesis";

export interface KowalskiMessage {
  type: MessageType;
  text: string;
  confidence?: number;
}

// Military/scientific jargon dictionary for variety
const JARGON = {
  analysis: ["analysis", "intel assessment", "data reconnaissance", "deep scan"],
  data: ["data", "intel", "information", "readings", "telemetry"],
  found: ["detected", "identified", "located", "acquired", "confirmed"],
  problem: ["anomaly", "irregularity", "deviation", "concern"],
  good: ["optimal", "satisfactory", "within parameters", "nominal"],
  bad: ["suboptimal", "concerning", "outside parameters", "critical"],
  start: ["initiating", "commencing", "executing", "launching"],
  done: ["complete", "finalized", "concluded", "mission accomplished"],
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getJargon(key: keyof typeof JARGON): string {
  return randomPick(JARGON[key]);
}

// Greeting templates
const GREETINGS = [
  "Greetings, Skipper. Kowalski reporting for duty.",
  "Kowalski here, awaiting orders, Skipper.",
  "Analysis station operational. What's the mission, Skipper?",
  "Standing by for data reconnaissance, Skipper.",
  "Kowalski online. Ready to crunch some numbers, Skipper.",
];

// Finding templates
const FINDINGS = {
  strong: [
    "Eureka! Strong {type} detected, Skipper!",
    "Significant {type} identified in the data, Skipper.",
    "High-confidence {type} confirmed, Skipper!",
  ],
  moderate: [
    "Moderate {type} detected, Skipper. Worth noting.",
    "Found a {type} of interest, Skipper.",
    "Intel suggests a {type}, Skipper.",
  ],
  weak: [
    "Weak {type} detected, Skipper. Proceed with caution.",
    "Minor {type} observed. May not be significant, Skipper.",
    "Faint {type} signal, Skipper. Needs more investigation.",
  ],
};

// Warning templates
const WARNINGS = [
  "Attention, Skipper! {issue}",
  "Warning: {issue} - recommend further analysis.",
  "Skipper, we have a situation: {issue}",
  "Red flag detected: {issue}",
];

// Success templates
const SUCCESSES = [
  "Mission accomplished, Skipper. {details}",
  "Operation complete. {details}",
  "Success, Skipper! {details}",
  "{details} Analysis finalized.",
];

// Error templates
const ERRORS = [
  "Skipper, we have a problem: {error}",
  "Error encountered: {error}. Awaiting orders.",
  "Mission compromised: {error}",
  "Analysis failed: {error}. Requesting guidance, Skipper.",
];

// Question templates
const QUESTIONS = [
  "Skipper, I need clarification: {question}",
  "Requesting input, Skipper: {question}",
  "Uncertain about this one, Skipper. {question}",
  "My analysis is inconclusive. {question}",
];

// Hypothesis templates
const HYPOTHESES = [
  "Based on the data, I hypothesize that {hypothesis}",
  "My analysis suggests: {hypothesis}",
  "Theory: {hypothesis}. Confidence: {confidence}%",
  "Intel indicates {hypothesis}. Shall I investigate further, Skipper?",
];

/**
 * Verbalize confidence level in Kowalski style
 */
export function verbalizeConfidence(confidence: number): string {
  if (confidence >= 95) return "with absolute certainty";
  if (confidence >= 90) return "with high confidence";
  if (confidence >= 80) return "with reasonable certainty";
  if (confidence >= 70) return "fairly confident";
  if (confidence >= 60) return "moderately confident";
  if (confidence >= 50) return "with some uncertainty";
  if (confidence >= 40) return "with significant uncertainty";
  return "with low confidence - this is speculative";
}

/**
 * Generate a Kowalski-style message
 */
export function kowalskiSay(
  type: MessageType,
  content: string,
  confidence?: number
): string {
  let template: string;

  switch (type) {
    case "greeting":
      template = randomPick(GREETINGS);
      break;

    case "finding": {
      const strength =
        confidence && confidence >= 80
          ? "strong"
          : confidence && confidence >= 50
          ? "moderate"
          : "weak";
      template = randomPick(FINDINGS[strength]).replace("{type}", content);
      break;
    }

    case "question":
      template = randomPick(QUESTIONS).replace("{question}", content);
      break;

    case "warning":
      template = randomPick(WARNINGS).replace("{issue}", content);
      break;

    case "success":
      template = randomPick(SUCCESSES).replace("{details}", content);
      break;

    case "error":
      template = randomPick(ERRORS).replace("{error}", content);
      break;

    case "status":
      return `[STATUS] ${content}`;

    case "hypothesis":
      template = randomPick(HYPOTHESES)
        .replace("{hypothesis}", content)
        .replace("{confidence}", String(confidence || 50));
      break;

    default:
      return content;
  }

  return template;
}

/**
 * Format a box-style status message
 */
export function formatStatusBox(
  title: string,
  lines: string[],
  width = 60
): string {
  const border = "─".repeat(width - 2);
  const titlePadded = ` ${title} `.padStart(
    Math.floor((width + title.length + 2) / 2),
    "─"
  ).padEnd(width - 2, "─");

  const result = [
    `┌${titlePadded}┐`,
    ...lines.map((line) => {
      const trimmed = line.slice(0, width - 4);
      return `│ ${trimmed.padEnd(width - 4)} │`;
    }),
    `└${border}┘`,
  ];

  return result.join("\n");
}

/**
 * Format a recon sweep summary
 */
export function formatReconSweep(
  files: Array<{ name: string; rows?: number; status: "new" | "known" }>,
  memoryStatus: "empty" | "loaded",
  previousMissions?: number
): string {
  const fileLines = files.map((f) => {
    const rowInfo = f.rows ? ` (${f.rows.toLocaleString()} rows)` : "";
    const status = f.status === "new" ? " - NEW" : " - KNOWN";
    return `  • ${f.name}${rowInfo}${status}`;
  });

  const memoryLine =
    memoryStatus === "empty"
      ? "Memory banks: Empty (first mission in this sector)"
      : `Memory banks: Loaded (${previousMissions || 0} previous missions)`;

  const lines = [
    "",
    ...fileLines,
    "",
    `🧠 ${memoryLine}`,
    "",
    "Awaiting orders, Skipper. What shall I analyze?",
  ];

  return formatStatusBox("RECON SWEEP COMPLETE", lines);
}

/**
 * Format confidence with visual indicator
 */
export function formatConfidence(confidence: number): string {
  const filled = Math.round(confidence / 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${confidence}%`;
}

/**
 * Get appropriate icon for message type
 */
export function getIcon(type: MessageType): string {
  switch (type) {
    case "greeting":
      return "🐧";
    case "finding":
      return "🔍";
    case "question":
      return "❓";
    case "warning":
      return "⚠️";
    case "success":
      return "✅";
    case "error":
      return "❌";
    case "status":
      return "📊";
    case "hypothesis":
      return "💡";
    default:
      return "•";
  }
}

// Export the banner for use in UI
export const KOWALSKI_BANNER = `
╔════════════════════════════════════════════════════════════════╗
║  █▄▀ █▀█ █░█░█ ▄▀█ █░░ █▀ █▄▀ █   ▄▀█ █▄░█ ▄▀█ █░░ █▄█ █▀ █ █▀ ║
║  █░█ █▄█ ▀▄▀▄▀ █▀█ █▄▄ ▄█ █░█ █   █▀█ █░▀█ █▀█ █▄▄ ░█░ ▄█ █ ▄█ ║
╚════════════════════════════════════════════════════════════════╝
`;

export const KOWALSKI_MINI = "🐧";
