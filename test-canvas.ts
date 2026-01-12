// Test the actual Analytics Canvas UI
// "Kowalski, analysis!"

import { readFileSync } from "fs";
import {
  parseCSV,
  analyzeDataSet,
  generateCharts,
  generateInsights,
  generateKPIs,
} from "./src/canvases/analytics/index";
import type { AnalyticsConfig } from "./src/canvases/analytics/types";

async function main() {
  // Load and parse the CSV
  const filename = process.argv[2] || "ai_adoption_dataset.csv";
  console.log(`Loading ${filename}...`);

  const csvContent = readFileSync(`./sample_data/${filename}`, "utf-8");
  const data = parseCSV(csvContent, { name: filename });

  console.log(`Loaded ${data.rows.length.toLocaleString()} rows`);

  // Run analysis
  console.log("Running analysis...");
  const analysis = analyzeDataSet(data);
  const charts = generateCharts(data, analysis);
  const insights = generateInsights(data, analysis);
  const kpis = generateKPIs(data, analysis);

  // Build canvas config
  const config: AnalyticsConfig = {
    title: `Kowalski Analysis: ${filename}`,
    data,
    analysis,
    charts,
    insights,
    kpis,
    phase: "eda", // Start in EDA phase
  };

  console.log("Launching canvas...\n");

  // Render the canvas directly (inline, not spawning new terminal)
  const { renderCanvas } = await import("./src/canvases/index");
  await renderCanvas("analytics", "test-analytics", config, {
    scenario: "dashboard",
  });
}

main().catch(console.error);
