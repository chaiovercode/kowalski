#!/usr/bin/env bun
// Test spawning the analytics canvas in tmux split view
// "Kowalski, analysis!"

import { readFileSync } from "fs";
import { parseCSV, analyzeDataSet } from "./src/canvases/analytics/index";
import { spawnAnalytics } from "./src/api";

async function main() {
  const filename = process.argv[2] || "sales.csv";
  const filepath = `./sample_data/${filename}`;

  console.log("🐧 KOWALSKI ANALYSIS");
  console.log(`Loading ${filename}...`);

  // Load and parse the CSV
  const csvContent = readFileSync(filepath, "utf-8");
  const data = parseCSV(csvContent, { name: filename });
  const analysis = analyzeDataSet(data);

  console.log(`Parsed ${data.rows.length} rows, ${data.columns.length} columns`);
  console.log("Spawning canvas in tmux split...\n");

  // Spawn the canvas in tmux split pane
  const result = await spawnAnalytics({
    title: `Analysis: ${filename}`,
    data,
    analysis,
    phase: "eda",
  });

  if (result.success) {
    if (result.cancelled) {
      console.log("Canvas closed by user");
    } else {
      console.log("User selection:", result.data);
    }
  } else {
    console.error("Error:", result.error);
  }
}

main().catch(console.error);
