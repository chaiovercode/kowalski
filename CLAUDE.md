# Kowalski Analytics

> "Kowalski, analysis!" - Skipper

When users ask to analyze data, load CSV/JSON files, or create visualizations, spawn the analytics canvas in a tmux split pane.

## Spawning the Canvas (REQUIRED)

**You MUST be in a tmux session for the canvas to work.**

```typescript
import { readFileSync } from "fs";
import { parseCSV, analyzeDataSet } from "${PLUGIN_DIR}/src/canvases/analytics";
import { spawnAnalytics } from "${PLUGIN_DIR}/src/api";

// Load and analyze data
const csvContent = readFileSync("path/to/file.csv", "utf-8");
const data = parseCSV(csvContent, { name: "file.csv" });
const analysis = analyzeDataSet(data);

// Spawn canvas in tmux split pane (2/3 width on the right)
const result = await spawnAnalytics({
  title: "My Analysis",
  data,
  analysis,
  phase: "eda",  // Start with EDA dashboard
});

// Handle result
if (result.cancelled) {
  console.log("User closed the canvas");
} else if (result.data) {
  console.log("User selected:", result.data);
}
```

## CLI Commands

```bash
# Spawn canvas in tmux split (recommended)
bun run src/cli.ts spawn analytics --config '{"title":"Test"}'

# Show canvas in current terminal (for testing)
bun run src/cli.ts show analytics --scenario dashboard
```

## Test Scripts

```bash
# Test canvas spawning in tmux
bun test-canvas-spawn.ts sales.csv

# Test EDA dashboard rendering (current terminal)
bun test-eda-dashboard.tsx sales.csv
```

## Sample Data

- `sample_data/sales.csv` - Small dataset (32 rows)
- `sample_data/ai_adoption_dataset.csv` - Large synthetic dataset (145k rows)

## Key Files

- `src/canvases/analytics/insights.ts` - Intelligent EDA with synthetic detection
- `src/canvases/analytics/components/eda-dashboard.tsx` - Terminal dashboard
- `src/api/canvas-api.ts` - Canvas spawning API (spawnAnalytics)
- `src/terminal.ts` - Tmux split pane management

## Canvas Phases

- `eda` - Exploratory Data Analysis dashboard (default)
- `selection` - Choose analysis type
- `analysis` - Show specific analysis results

## Requirements

- **tmux** - Canvas spawns in tmux split pane
- **Bun** - Runtime
- **Terminal with Unicode** - For braille charts
