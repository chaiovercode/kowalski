# Kowalski Analytics

> "Kowalski, analysis!" - Skipper

When users ask to analyze data, load CSV/JSON files, or create visualizations:

1. Use the analytics canvas to display results
2. Parse data with `parseCSV()` or `parseJSON()` from `src/canvases/analytics/data-loader.ts`
3. Run statistical analysis with functions from `src/canvases/analytics/stats.ts`
4. Generate intelligent EDA with `generateEDAReport()` from `src/canvases/analytics/insights.ts`

## Quick Start

```typescript
import { parseCSV, analyzeDataSet, generateEDAReport } from "./src/canvases/analytics";

// Load and analyze data
const data = parseCSV(fileContent, { name: "sales.csv" });
const analysis = analyzeDataSet(data);
const report = generateEDAReport(data, analysis);

// report contains:
// - overview: rows, columns, data quality
// - variables: column summaries
// - findings: key insights with severity
// - isSynthetic: whether data appears fake
// - bottomLine: actionable summary
```

## Test Commands

```bash
# Run EDA on a CSV file
bun test-analytics.ts <filename>.csv

# Test the terminal dashboard
bun test-eda-dashboard.tsx <filename>.csv
```

## Sample Data

- `sample_data/ai_adoption_dataset.csv` - Large synthetic dataset (145k rows)
- `sample_data/sales.csv` - Small real-looking dataset (32 rows)

## Key Files

- `src/canvases/analytics/insights.ts` - Intelligent EDA with synthetic detection
- `src/canvases/analytics/components/eda-dashboard.tsx` - Terminal dashboard
- `src/canvases/analytics/browser-viz.ts` - Plotly browser visualizations
- `src/canvases/analytics/stats.ts` - Statistical calculations

## Development

Use Bun for all development:

```bash
bun install          # Install dependencies
bun test            # Run tests
bun run src/cli.ts  # Run CLI
```
