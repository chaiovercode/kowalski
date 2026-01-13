#!/usr/bin/env node

/**
 * Kowalski Analytics - Setup Script
 * Installs /kowalski skill globally for Claude Code
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const KOWALSKI_ROOT = dirname(__dirname);

// Global Claude commands directory
const CLAUDE_COMMANDS_DIR = join(homedir(), ".claude", "commands");
const SKILL_SOURCE = join(KOWALSKI_ROOT, "commands", "kowalski.md");
const SKILL_TARGET = join(CLAUDE_COMMANDS_DIR, "kowalski.md");

function setup() {
  try {
    // Create ~/.claude/commands if needed
    if (!existsSync(CLAUDE_COMMANDS_DIR)) {
      mkdirSync(CLAUDE_COMMANDS_DIR, { recursive: true });
      console.log("Created ~/.claude/commands/");
    }

    // Remove existing symlink/file if present
    if (existsSync(SKILL_TARGET)) {
      unlinkSync(SKILL_TARGET);
    }

    // Create symlink to kowalski skill
    symlinkSync(SKILL_SOURCE, SKILL_TARGET);

    console.log("✓ Kowalski skill installed globally");
    console.log("  Use /kowalski <file> in any folder");
    console.log("  Analysis saved to kowalski.md");

  } catch (err) {
    // Fail silently - postinstall shouldn't break npm install
    console.log("Note: Could not install skill globally:", err.message);
    console.log("You can manually copy commands/kowalski.md to ~/.claude/commands/");
  }
}

setup();
