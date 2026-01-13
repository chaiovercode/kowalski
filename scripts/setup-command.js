#!/usr/bin/env node

/**
 * Kowalski Analytics - Setup Script
 * Adds kowalski to project's CLAUDE.md for automatic data analysis
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const KOWALSKI_ROOT = dirname(__dirname);

// Use current working directory (where npm install was run)
const PROJECT_DIR = process.cwd();
const CLAUDE_MD = join(PROJECT_DIR, "CLAUDE.md");

const MARKER_START = "<!-- kowalski-analytics-start -->";
const MARKER_END = "<!-- kowalski-analytics-end -->";

const KOWALSKI_CONFIG = `${MARKER_START}
## Data Analysis with Kowalski

When analyzing CSV/JSON data files, use kowalski-analytics for deep insights:

\`\`\`typescript
import { parseCSV, analyzeDataSet, generateEDAReport, runDeepAnalysis, rememberAnalysis } from "${KOWALSKI_ROOT}/src/index.ts";
import { readFileSync } from "fs";

const content = readFileSync(filepath, "utf-8");
const data = parseCSV(content, { name: filename });
const analysis = analyzeDataSet(data);
const report = generateEDAReport(data, analysis);
const deep = runDeepAnalysis(data, analysis, report);
await rememberAnalysis(data, analysis, deep, filepath);  // Creates kowalski.md
\`\`\`

This creates a \`kowalski.md\` memory file (not documentation) in the data folder.
${MARKER_END}`;

function setup() {
  try {
    // Read existing CLAUDE.md or start fresh
    let content = "";
    if (existsSync(CLAUDE_MD)) {
      content = readFileSync(CLAUDE_MD, "utf-8");

      // Check if already configured
      if (content.includes(MARKER_START)) {
        // Update existing config (path might have changed)
        const startIdx = content.indexOf(MARKER_START);
        const endIdx = content.indexOf(MARKER_END) + MARKER_END.length;
        content = content.slice(0, startIdx) + KOWALSKI_CONFIG + content.slice(endIdx);
        writeFileSync(CLAUDE_MD, content);
        console.log("✓ Kowalski config updated in CLAUDE.md");
        return;
      }
    }

    // Append config
    content = content.trimEnd() + "\n\n" + KOWALSKI_CONFIG + "\n";
    writeFileSync(CLAUDE_MD, content);
    console.log("✓ Kowalski added to CLAUDE.md");
    console.log("  Data analysis will now use kowalski-analytics automatically");

  } catch (err) {
    // Fail silently - postinstall shouldn't break npm install
    console.log("Note: Could not auto-configure CLAUDE.md:", err.message);
  }
}

setup();
