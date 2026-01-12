#!/usr/bin/env node
// Setup script to install the /kowalski command for Claude Code

import { existsSync, mkdirSync, copyFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMMAND_NAME = "kowalski.md";
const SOURCE_PATH = join(__dirname, "..", "commands", COMMAND_NAME);
const CLAUDE_COMMANDS_DIR = join(homedir(), ".claude", "commands");
const TARGET_PATH = join(CLAUDE_COMMANDS_DIR, COMMAND_NAME);

function setup() {
  console.log("🐧 Kowalski Analytics - Setting up slash command...\n");

  // Check if source file exists
  if (!existsSync(SOURCE_PATH)) {
    console.error(`❌ Source command file not found: ${SOURCE_PATH}`);
    process.exit(1);
  }

  // Create Claude commands directory if it doesn't exist
  if (!existsSync(CLAUDE_COMMANDS_DIR)) {
    console.log(`📁 Creating Claude commands directory: ${CLAUDE_COMMANDS_DIR}`);
    mkdirSync(CLAUDE_COMMANDS_DIR, { recursive: true });
  }

  // Check if command already exists
  if (existsSync(TARGET_PATH)) {
    const existing = readFileSync(TARGET_PATH, "utf-8");
    const source = readFileSync(SOURCE_PATH, "utf-8");

    if (existing === source) {
      console.log("✅ /kowalski command is already installed and up to date.\n");
      return;
    }

    console.log("📝 Updating existing /kowalski command...");
  } else {
    console.log("📝 Installing /kowalski command...");
  }

  // Copy command file
  copyFileSync(SOURCE_PATH, TARGET_PATH);

  console.log(`✅ Command installed to: ${TARGET_PATH}\n`);
  console.log("🎉 Setup complete! You can now use /kowalski in Claude Code.\n");
  console.log("Usage:");
  console.log("  /kowalski <file.csv>    - Analyze a specific file");
  console.log("  /kowalski               - Scan current directory for data files\n");
}

// Run if called directly
if (process.argv[1] === __filename || process.argv[1]?.endsWith("setup-command.js")) {
  setup();
}

export { setup };
