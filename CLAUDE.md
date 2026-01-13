# Kowalski Analytics

> "Kowalski, analysis!" - Skipper

Insane data analysis skill for Claude Code. Deep insights, multi-file memory, actionable recommendations.

## Usage

```
/kowalski <file>              # Deep analysis of a data file
/kowalski                     # Show recent analyses & cross-dataset insights
/kowalski compare <f1> <f2>   # Compare two previously analyzed datasets
/kowalski ask <question>      # Ask about the last analyzed data
/kowalski clear               # Clear analysis memory
```

## What Makes Kowalski Insane

1. **Deep Auto-Insights** - Finds patterns, anomalies, and stories you didn't ask for
2. **Natural Language Queries** - Ask "why did X drop?" and get intelligent answers
3. **Multi-file Memory** - Remembers analyses and finds relationships across datasets
4. **Actionable Recommendations** - Not just insights, but specific next steps

## API Usage

```typescript
import { readFileSync } from "fs";
import {
  parseCSV,
  analyzeDataSet,
  generateEDAReport,
  runDeepAnalysis,
  rememberAnalysis,
  getCrossDatasetInsights,
} from "kowalski-analytics";

// Load and parse
const content = readFileSync("data.csv", "utf-8");
const data = parseCSV(content, { name: "data.csv" });

// Run analysis pipeline
const analysis = analyzeDataSet(data);
const edaReport = generateEDAReport(data, analysis);
const deepAnalysis = runDeepAnalysis(data, analysis, edaReport);

// Remember for future queries
rememberAnalysis(data, analysis, deepAnalysis, "data.csv");

// Check cross-dataset insights
const crossInsights = getCrossDatasetInsights();

// Access results
console.log(deepAnalysis.story.headline);
console.log(deepAnalysis.insights);
console.log(deepAnalysis.recommendations);
console.log(deepAnalysis.dataQuality);
```

## Sample Data

- `sample_data/sales.csv` - Sales data (32 rows)
- `sample_data/related_tables/` - Related tables for join testing

## Key Exports

- `parseCSV`, `parseJSON` - Data loading
- `analyzeDataSet` - Core statistical analysis
- `generateEDAReport` - EDA insights
- `runDeepAnalysis` - Deep insights engine (patterns, anomalies, stories)
- `rememberAnalysis` - Multi-file memory
- `getCrossDatasetInsights` - Cross-dataset relationship discovery
- `answerQuestion` - Natural language Q&A about data
