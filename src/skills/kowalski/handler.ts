// Kowalski Skill Handler
// Main entry point for /kowalski command

import type { KowalskiCommand, KowalskiArgs } from "./types";
import { kowalskiSay } from "./personality";
import {
  reconSweep,
  formatReconResult,
  analyzeFile,
  getHelpText,
} from "./commands";

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): KowalskiArgs {
  if (args.length === 0) {
    return { command: "recon" };
  }

  const [commandOrFile, ...rest] = args;
  const cmd = commandOrFile.toLowerCase();

  // Check if it's a known command
  const knownCommands: KowalskiCommand[] = [
    "analyze",
    "compare",
    "query",
    "memory",
    "dashboard",
    "help",
  ];

  if (knownCommands.includes(cmd as KowalskiCommand)) {
    return {
      command: cmd as KowalskiCommand,
      files: rest.filter((arg) => !arg.startsWith("-")),
      options: parseOptions(rest),
    };
  }

  // Treat first arg as a file to analyze
  if (
    commandOrFile.endsWith(".csv") ||
    commandOrFile.endsWith(".json") ||
    commandOrFile.endsWith(".tsv")
  ) {
    return {
      command: "analyze",
      files: [commandOrFile, ...rest.filter((arg) => !arg.startsWith("-"))],
      options: parseOptions(rest),
    };
  }

  // Unknown command - show help
  return { command: "help" };
}

/**
 * Parse command options from arguments
 */
function parseOptions(args: string[]): Record<string, string | boolean> {
  const options: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("-")) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      options[key] = true;
    }
  }

  return options;
}

/**
 * Main handler for /kowalski command
 */
export async function kowalskiHandler(args: string[]): Promise<string> {
  const parsed = parseArgs(args);

  switch (parsed.command) {
    case "recon": {
      const result = await reconSweep(process.cwd());
      return formatReconResult(result);
    }

    case "analyze": {
      if (!parsed.files || parsed.files.length === 0) {
        return kowalskiSay(
          "question",
          "Which file should I analyze, Skipper? Usage: /kowalski analyze <file.csv>"
        );
      }

      const noCanvas = parsed.options?.["no-canvas"] === true;
      const result = await analyzeFile(parsed.files[0], {
        spawnCanvas: !noCanvas,
      });

      return result.message || "";
    }

    case "compare": {
      if (!parsed.files || parsed.files.length < 2) {
        return kowalskiSay(
          "question",
          "I need two files to compare, Skipper. Usage: /kowalski compare <file1> <file2>"
        );
      }

      // TODO: Implement compare command
      return kowalskiSay(
        "status",
        "Compare command coming soon, Skipper. Stay tuned for Phase 4 implementation."
      );
    }

    case "query": {
      // TODO: Implement MCP query command
      return kowalskiSay(
        "status",
        "MCP query command coming soon, Skipper. Stay tuned for Phase 8 implementation."
      );
    }

    case "memory": {
      // TODO: Implement memory command
      return kowalskiSay(
        "status",
        "Memory command coming soon, Skipper. Stay tuned for Phase 5 implementation."
      );
    }

    case "dashboard": {
      // TODO: Implement standalone dashboard command
      return kowalskiSay(
        "status",
        "Standalone dashboard coming soon, Skipper. For now, use /kowalski analyze <file> to see the dashboard."
      );
    }

    case "help":
    default: {
      return getHelpText();
    }
  }
}
