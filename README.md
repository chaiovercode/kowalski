# Kowalski

> "Kowalski, analysis!" - Skipper

A Claude Code plugin for intelligent data analysis with beautiful terminal visualizations.

## Features

- **Intelligent EDA** - Claude-like analysis that detects synthetic data, finds patterns, and provides actionable insights
- **Terminal Visualizations** - High-resolution charts using braille characters (2x4 pixels per character)
- **Two-Column Dashboard** - Analysis on the left, visualizations on the right
- **Browser Visualizations** - Interactive Plotly dashboards when you need more detail
- **Works with Any Dataset** - Generic column detection adapts to your data

## Quick Start

```bash
# Install dependencies
bun install

# Run analysis on a CSV file
bun test-analytics.ts your_data.csv

# Test the terminal dashboard
bun test-eda-dashboard.tsx your_data.csv
```

## Terminal Dashboard

The EDA dashboard displays:

**Left Panel - Claude's Analysis:**
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

## Project Structure

```
kowalski/
├── src/
│   ├── canvases/
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── eda-dashboard.tsx   # Main terminal dashboard
│   │   │   │   ├── braille-charts.tsx  # High-res terminal charts
│   │   │   │   └── ...
│   │   │   ├── insights.ts             # Intelligent EDA engine
│   │   │   ├── data-loader.ts          # CSV/JSON parsing
│   │   │   ├── stats.ts                # Statistical analysis
│   │   │   ├── browser-viz.ts          # Plotly visualizations
│   │   │   └── theme.ts                # Cyberpunk color theme
│   │   └── analytics.tsx               # Main canvas component
│   ├── api/                            # Canvas spawning API
│   ├── ipc/                            # Inter-process communication
│   └── cli.ts                          # CLI entry point
├── skills/                             # Claude Code skill definitions
├── sample_data/                        # Example datasets
└── package.json
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

## Usage in Claude Code

```typescript
import { parseCSV, analyzeDataSet, generateEDAReport } from "./src/canvases/analytics";
import { spawnAnalytics } from "./src/api";

// Load and analyze data
const data = parseCSV(csvContent, { name: "sales.csv" });
const analysis = analyzeDataSet(data);

// Spawn the analytics canvas
await spawnAnalytics({
  title: "Sales Analysis",
  data,
  analysis,
  phase: "eda",
});
```

## Other Canvas Types

Kowalski also includes additional interactive terminal canvases:

| Canvas | Description |
|--------|-------------|
| `analytics` | Data analysis with EDA dashboard |
| `calendar` | Display events, pick meeting times |
| `document` | View/edit markdown documents |
| `flight` | Compare flights and select seats |

## Tech Stack

- **Bun** - Runtime and package manager
- **React + Ink** - Terminal UI rendering
- **Plotly.js** - Browser visualizations
- **TypeScript** - Type safety

## Requirements

- **Bun** - Runtime for CLI commands
- **tmux** - For canvas split panes (auto-starts if not in tmux)
- **Terminal with Unicode support** - For braille charts

**Note:** For the best experience, run `tmux && claude`. If you're not in tmux, a new terminal window with tmux will open automatically when canvas spawns.

## License

MIT
