# /kowalski - Data Analysis Command

Analyze data files using Kowalski Analytics.

## Usage

```
/kowalski <file_path>
/kowalski              # Scans current directory for data files
```

## Instructions

When this command is invoked:

1. **If a file path is provided**: Load and analyze that specific CSV/JSON file
2. **If no arguments**: Scan the current directory for `.csv`, `.json`, `.tsv` files and list them

### Analysis Steps

```typescript
import { readFileSync } from "fs";
import { parseCSV, parseJSON, analyzeDataSet } from "/Users/vivek/Code/kowalski/src/canvases/analytics";
import { generateEDAReport } from "/Users/vivek/Code/kowalski/src/canvases/analytics/insights";
import { inferSchema } from "/Users/vivek/Code/kowalski/src/canvases/analytics/understanding";
import { generateHypotheses } from "/Users/vivek/Code/kowalski/src/canvases/analytics/hypotheses";
import { generateBrowserViz, openBrowserViz } from "/Users/vivek/Code/kowalski/src/canvases/analytics/browser-viz";
import { spawnAnalytics } from "/Users/vivek/Code/kowalski/src/api";

// 1. Load data
const content = readFileSync(filePath, "utf-8");
const data = filePath.endsWith(".json")
  ? parseJSON(content, { name: filename })
  : parseCSV(content, { name: filename });

// 2. Run analysis
const analysis = analyzeDataSet(data);
const schema = inferSchema(data);
const hypotheses = generateHypotheses(data, analysis);
const report = generateEDAReport(data, analysis);

// 3. Show results and optionally spawn dashboard
```

### Output Format

Present findings in Kowalski's voice:

- "Kowalski, analysis!" greeting
- Dataset overview (rows, columns, types)
- Key statistics and correlations
- Generated hypotheses
- Top findings from EDA report
- Offer to: spawn terminal dashboard OR open browser visualization

### Kowalski Personality

Use military/scientific jargon:
- "Reconnaissance complete, Skipper"
- "Data quality assessment: nominal"
- "Correlation detected between variables"
- "Hypothesis generated with 85% confidence"

$ARGUMENTS
