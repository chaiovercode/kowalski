// Test script for Kowalski Analytics
// "Kowalski, analysis!"

import { readFileSync } from "fs";
import {
  parseCSV,
  analyzeDataSet,
  generateEDAReport,
  formatEDAForTerminal,
  openBrowserViz,
} from "./src/canvases/analytics/index";

async function main() {
  console.log("🐧 KOWALSKI ANALYSIS");
  console.log("═".repeat(60));

  // 1. Load and parse the CSV
  console.log("\n📂 Let me check out the data first...\n");
  // Test with different datasets
  const filename = process.argv[2] || "ai_adoption_dataset.csv";
  const csvContent = readFileSync(`./sample_data/${filename}`, "utf-8");
  const data = parseCSV(csvContent, { name: filename });

  const chunkDesc = data.rows.length > 10000 ? "pretty chunky" : data.rows.length > 1000 ? "decent-sized" : "small";
  console.log(`Okay, this is a ${chunkDesc} dataset — ${data.rows.length.toLocaleString()} rows.`);
  console.log("Let me run a proper EDA...\n");

  // 2. Run analysis
  const analysis = analyzeDataSet(data);

  // 3. Generate intelligent EDA report
  const edaReport = generateEDAReport(data, analysis);

  // 4. Display the report
  console.log("─".repeat(60));
  console.log("");

  // The Basics
  console.log(`## EDA Summary: ${filename}\n`);
  console.log("**The Basics**\n");

  const cleanNote = edaReport.overview.suspiciouslyClean
    ? " No missing values at all, which is nice... suspiciously nice, actually."
    : "";
  const sizeDesc = edaReport.overview.rows > 10000 ? "pretty substantial" : edaReport.overview.rows > 1000 ? "decent-sized" : "small";
  console.log(`You've got a ${sizeDesc} dataset here — ${edaReport.overview.rows.toLocaleString()} rows across ${edaReport.overview.columns} columns.${cleanNote}\n`);

  // Key Variables
  console.log("**Key Variables:**");

  // Group by type for cleaner output
  const categoricalVars = edaReport.variables.filter(v => v.type === "categorical");
  const numericVars = edaReport.variables.filter(v => v.type === "numeric");

  for (const v of categoricalVars) {
    const notable = v.notable ? ` ← ${v.notable}` : "";
    if (v.uniqueCount <= 20) {
      console.log(`- **${v.name}:** ${v.uniqueCount} unique values${notable}`);
    } else {
      console.log(`- **${v.name}:** ${v.uniqueCount.toLocaleString()} values${notable}`);
    }
  }

  console.log("");

  // Quick Stats for numeric
  console.log("**Quick Stats:**\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");

  for (const v of numericVars) {
    const stats = analysis.statistics?.[v.name];
    if (stats && stats.type === "numeric") {
      console.log(`| Mean ${v.name} | ${stats.mean?.toFixed(2)} |`);
      console.log(`| Std Dev | ${stats.std?.toFixed(2)} |`);
      console.log(`| Min/Max | ${stats.min} to ${stats.max} |`);
    }
  }
  console.log("");

  // The Interesting Findings
  console.log('**The "Interesting" Findings**\n');

  if (edaReport.isSynthetic) {
    console.log("Okay so here's the thing... this data is almost *too* uniform:\n");

    for (let i = 0; i < edaReport.syntheticReasons.length; i++) {
      console.log(`${i + 1}. ${edaReport.syntheticReasons[i]}\n`);
    }
  }

  // Individual findings
  for (const finding of edaReport.findings) {
    const icon = finding.severity === "warning" ? "⚠️" : finding.severity === "success" ? "✓" : "•";
    console.log(`${icon} **${finding.title}:** ${finding.description}`);
    if (finding.evidence) {
      for (const e of finding.evidence) {
        console.log(`   - ${e}`);
      }
    }
  }
  console.log("");

  // Interpretation
  console.log("**What This Tells Me**\n");
  console.log(edaReport.interpretation);
  console.log("");

  // Bottom Line
  console.log("─".repeat(60));
  console.log("");
  console.log("**Bottom Line**\n");
  console.log(edaReport.bottomLine);
  console.log("");

  // What next?
  console.log("─".repeat(60));
  console.log("\nWant me to build some visualizations anyway, or dig into any specific slice of this?");
  console.log("");

  // Open browser viz
  console.log("🌐 Opening browser visualization...");
  try {
    const filepath = await openBrowserViz(data, analysis, {
      type: "dashboard",
      theme: "cyberpunk",
      title: `Analysis: ${filename}`,
    });
    console.log("   ✓ Opened: " + filepath);
  } catch (e) {
    console.log("   ✗ Error: " + e);
  }

  console.log("");
  console.log("🐧 Analysis complete!");
}

main().catch(console.error);
