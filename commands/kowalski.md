# /kowalski - Data Analysis Command

Analyze data files using Kowalski Analytics.

## Usage

```
/kowalski <file_path>
/kowalski              # Scans current directory for data files
```

## Installation

```bash
# Install globally with bun
bun add -g kowalski-analytics

# Or with npm
npm install -g kowalski-analytics

# Or clone and link locally
git clone https://github.com/vivek/kowalski.git
cd kowalski && bun link
```

After installation, copy this command file to your Claude commands:
```bash
cp node_modules/kowalski-analytics/commands/kowalski.md ~/.claude/commands/
# Or if installed globally:
kowalski --setup
```

## Instructions

When this command is invoked:

1. **If a file path is provided**: Load and analyze that specific CSV/JSON file
2. **If no arguments**: Scan the current directory for `.csv`, `.json`, `.tsv` files and list them

### Analysis Steps

```typescript
import { readFileSync } from "fs";
import {
  parseCSV,
  parseJSON,
  analyzeDataSet,
  generateEDAReport,
  inferSchema,
  generateHypotheses,
  generateBrowserViz,
  openBrowserViz,
  spawnAnalytics,
} from "kowalski-analytics";

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
