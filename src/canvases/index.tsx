import React from "react";
import { render } from "ink";
import { AnalyticsCanvas } from "./analytics";
import type { AnalyticsConfig } from "./analytics/types";

// Clear screen and hide cursor
function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
}

// Show cursor on exit
function showCursor() {
  process.stdout.write("\x1b[?25h");
}

export interface RenderOptions {
  socketPath?: string;
  scenario?: string;
}

export async function renderCanvas(
  kind: string,
  id: string,
  config?: unknown,
  options?: RenderOptions
): Promise<void> {
  // Clear screen before rendering
  clearScreen();

  // Ensure cursor is shown on exit
  process.on("exit", showCursor);
  process.on("SIGINT", () => {
    showCursor();
    process.exit();
  });

  switch (kind) {
    case "analytics":
      return renderAnalytics(
        id,
        config as AnalyticsConfig | undefined,
        options
      );
    default:
      console.error(`Unknown canvas kind: ${kind}`);
      process.exit(1);
  }
}

async function renderAnalytics(
  id: string,
  config?: AnalyticsConfig,
  options?: RenderOptions
): Promise<void> {
  const { waitUntilExit } = render(
    <AnalyticsCanvas
      id={id}
      config={config}
      socketPath={options?.socketPath}
      scenario={options?.scenario || "dashboard"}
    />,
    {
      exitOnCtrlC: true,
    }
  );
  await waitUntilExit();
}
