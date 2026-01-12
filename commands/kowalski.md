# /kowalski - Data Analysis Command

Analyze data files using Kowalski Analytics.

## Usage

```
/kowalski <file_path>
/kowalski              # Scans current directory for data files
```

## Instructions

When this command is invoked with a file:

### Step 1: Display ASCII Banner (Claude Orange #da7756)

```
██╗  ██╗ ██████╗ ██╗    ██╗ █████╗ ██╗     ███████╗██╗  ██╗██╗
██║ ██╔╝██╔═══██╗██║    ██║██╔══██╗██║     ██╔════╝██║ ██╔╝██║
█████╔╝ ██║   ██║██║ █╗ ██║███████║██║     ███████╗█████╔╝ ██║
██╔═██╗ ██║   ██║██║███╗██║██╔══██║██║     ╚════██║██╔═██╗ ██║
██║  ██╗╚██████╔╝╚███╔███╔╝██║  ██║███████╗███████║██║  ██╗██║
╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝

 █████╗ ███╗   ██╗ █████╗ ██╗  ██╗   ██╗███████╗██╗███████╗
██╔══██╗████╗  ██║██╔══██╗██║  ╚██╗ ██╔╝██╔════╝██║██╔════╝
███████║██╔██╗ ██║███████║██║   ╚████╔╝ ███████╗██║███████╗
██╔══██║██║╚██╗██║██╔══██║██║    ╚██╔╝  ╚════██║██║╚════██║
██║  ██║██║ ╚████║██║  ██║███████╗██║   ███████║██║███████║
╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝╚══════╝
```

### Step 2: Load and Analyze Data

```typescript
import { readFileSync } from "fs";
import {
  parseCSV,
  parseJSON,
  analyzeDataSet,
  generateEDAReport,
  inferSchema,
  generateHypotheses,
  spawnAnalytics,
} from "kowalski-analytics";

// Load data
const content = readFileSync(filePath, "utf-8");
const data = filePath.endsWith(".json")
  ? parseJSON(content, { name: filename })
  : parseCSV(content, { name: filename });

// Run analysis
const analysis = analyzeDataSet(data);
const report = generateEDAReport(data, analysis);
```

### Step 3: Spawn Terminal Dashboard with Braille Visualizations

ALWAYS spawn the terminal dashboard on first analysis:

```typescript
// Spawn the analytics canvas in tmux (opens tmux automatically if not in tmux)
await spawnAnalytics({
  title: `Analysis: ${filename}`,
  data,
  analysis,
  phase: "eda",  // Shows braille charts, distributions, correlations
});
```

The dashboard will open in a tmux split pane showing:
- Braille sparklines and distributions
- Correlation heatmap
- Data quality gauge
- Key findings

### Output Format

After spawning the dashboard, briefly summarize in Kowalski's voice:

- "Kowalski, analysis!"
- "Dashboard deployed in tmux, Skipper"
- Quick stats: X rows, Y columns
- Top finding from EDA report
- "Press Q to close dashboard, ENTER for more options"

### If No File Provided

Scan current directory for `.csv`, `.json`, `.tsv` files and list them:

```
Available data files:
  1. sales.csv (32 rows)
  2. users.json (150 rows)

Use: /kowalski <filename> to analyze
```

### Kowalski Personality

Use military/scientific jargon:
- "Reconnaissance complete, Skipper"
- "Data quality assessment: nominal"
- "Dashboard deployed to tactical display"
- "Braille visualization rendering complete"

$ARGUMENTS
