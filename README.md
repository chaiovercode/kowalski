# Kowalski Analytics

> "Kowalski, analysis!" - Skipper

A data analysis skill for Claude Code with beautiful terminal visualizations.

## Installation

### Option 1: Install globally (recommended)

```bash
# With bun (recommended)
bun add -g kowalski-analytics

# Or with npm
npm install -g kowalski-analytics

# Then run setup to install the /kowalski slash command
kowalski setup
```

### Option 2: Clone and link locally

```bash
git clone https://github.com/vivek/kowalski.git
cd kowalski
bun install
bun link

# Install the slash command
bun run src/cli.ts setup
```

### Option 3: Manual setup

Copy the command file to your Claude commands directory:

```bash
# After installing the package
cp node_modules/kowalski-analytics/commands/kowalski.md ~/.claude/commands/
```

## Usage

Once installed, use the `/kowalski` slash command in Claude Code:

```
/kowalski sales.csv          # Analyze a specific file
/kowalski                    # Scan current directory for data files
```

## Features

- **Intelligent EDA** - Claude-like analysis that detects synthetic data, finds patterns, and provides actionable insights
- **Terminal Visualizations** - High-resolution charts using braille characters (2x4 pixels per character)
- **Two-Column Dashboard** - Analysis on the left, visualizations on the right
- **Browser Visualizations** - Interactive Plotly dashboards when you need more detail
- **Works with Any Dataset** - Generic column detection adapts to your data

## Programmatic Usage

```typescript
import {
  parseCSV,
  analyzeDataSet,
  generateEDAReport,
  inferSchema,
  generateHypotheses,
  spawnAnalytics,
} from "kowalski-analytics";

// Load and analyze data
const data = parseCSV(csvContent, { name: "sales.csv" });
const analysis = analyzeDataSet(data);
const report = generateEDAReport(data, analysis);
const schema = inferSchema(data);
const hypotheses = generateHypotheses(data, analysis);

// Spawn the terminal dashboard
await spawnAnalytics({
  title: "Sales Analysis",
  data,
  analysis,
  phase: "eda",
});
```

## API Exports

The package exports the following modules:

```typescript
// Main entry - all exports
import { ... } from "kowalski-analytics";

// Specific modules
import { ... } from "kowalski-analytics/analytics";
import { ... } from "kowalski-analytics/insights";
import { ... } from "kowalski-analytics/browser-viz";
import { ... } from "kowalski-analytics/api";
```

### Core Functions

| Function | Description |
|----------|-------------|
| `parseCSV(content, options)` | Parse CSV content into a DataSet |
| `parseJSON(content, options)` | Parse JSON content into a DataSet |
| `analyzeDataSet(data)` | Run statistical analysis on data |
| `generateEDAReport(data, analysis)` | Generate intelligent insights report |
| `inferSchema(data)` | Infer semantic types for columns |
| `generateHypotheses(data, analysis)` | Generate testable hypotheses |
| `generateBrowserViz(data, analysis)` | Generate interactive HTML visualization |
| `spawnAnalytics(config)` | Spawn terminal dashboard in tmux |

## Terminal Dashboard

The EDA dashboard displays:

**Left Panel - Analysis:**
- Dataset overview (rows, columns, data quality)
- Variable summary with statistics
- Synthetic data detection
- Key findings with severity indicators
- Bottom line recommendation

**Right Panel - Visualizations:**
- Quick stats with sparklines
- Distribution histograms (braille)
- Category breakdowns (bar charts)
- Correlation matrix heatmap
- Data quality gauge

## Sample Output

```
◆ EDA: sales.csv                                │ QUICK STATS
                                                │ revenue   10.1K   ⠢⡐⢄⡠⠢⠔⠤ ↑24.2%
THE BASICS                                      │ units     202     ⠢⡐⢄⡠⠢⠔⠤ ↑24.2%
32 rows • 6 columns                             │
                                                │ DISTRIBUTION: REVENUE
VARIABLES                                       │ ⣿⣿⣿⣿⣿⣿⣿⣿⣶⣶⣿⣿⣿⣿⣿⣿
◆ region         4 unique values                │
◆ product        2 unique values                │ BY REGION
# revenue        10100 2206 6100→15000          │ West    │████████████ 11.2K
# units          202 44 122→300                 │ East    │██████████ 9.8K
                                                │
KEY FINDINGS                                    │ CORRELATIONS
 ✓ Strong Correlations: revenue ↔ units (1.00)  │      rev  unit cost
 • Significant Trends: revenue ↑24.2%           │ rev  ████ ████ ████
                                                │ unit ████ ████ ████
╭──────────────────────────────────────────────╮│
│ BOTTOM LINE                                  ││ DATA QUALITY
│ Data quality looks good. Ready for analysis. ││ Complete ████████████ 100%
╰──────────────────────────────────────────────╯│
```

## Intelligent Analysis

Kowalski doesn't just show stats - it thinks like a data scientist:

- **Synthetic Data Detection** - Identifies fake/generated data by checking for:
  - Zero missing values in large datasets
  - Near-zero correlations across all variables
  - Suspiciously uniform distributions
  - Identical means across groups
  - Garbage/random text columns

- **Pattern Recognition** - Finds:
  - Strong correlations worth investigating
  - Significant trends over time
  - Outliers and anomalies
  - Category imbalances

- **Actionable Insights** - Provides a "Bottom Line" summary with recommendations

## Requirements

- **Bun** - Runtime for CLI commands
- **tmux** - For canvas split panes (auto-starts if not in tmux)
- **Terminal with Unicode support** - For braille charts

**Tip:** For the best experience, run `tmux && claude`. If you're not in tmux, a new terminal window with tmux will open automatically.

## Project Structure

```
kowalski/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── canvases/
│   │   └── analytics/           # Analytics canvas
│   │       ├── components/      # Terminal UI components
│   │       ├── insights.ts      # Intelligent EDA engine
│   │       ├── data-loader.ts   # CSV/JSON parsing
│   │       ├── browser-viz.ts   # Plotly visualizations
│   │       └── ...
│   ├── api/                     # Canvas spawning API
│   ├── hooks/                   # Shared React hooks
│   └── cli.ts                   # CLI entry point
├── commands/kowalski.md         # Slash command definition
├── scripts/setup-command.js     # Installation script
└── sample_data/                 # Example datasets
```

## License

MIT
