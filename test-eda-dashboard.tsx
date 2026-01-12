// Quick test of the EDA dashboard canvas
import { readFileSync } from "fs";
import { parseCSV, analyzeDataSet, generateEDAReport } from "./src/canvases/analytics/index";
import { render } from "ink";
import React from "react";
import { EDADashboard } from "./src/canvases/analytics/components/eda-dashboard";

const filename = process.argv[2] || "ai_adoption_dataset.csv";
const csvContent = readFileSync(`./sample_data/${filename}`, "utf-8");
const data = parseCSV(csvContent, { name: filename });
const analysis = analyzeDataSet(data);
const report = generateEDAReport(data, analysis);

// Get terminal dimensions
const width = process.stdout.columns || 120;
const height = process.stdout.rows || 40;

console.log(`Testing EDA Dashboard for: ${filename}`);
console.log(`Terminal size: ${width}x${height}`);
console.log("");

// Render the dashboard
render(
  React.createElement(EDADashboard, {
    data,
    analysis,
    report,
    width: width - 4,
    height: height - 6,
  })
);
