---
name: analytics
description: |
  Kowalski Analytics - Data analysis and visualization canvas.
  Use when users want to analyze data, create charts, or get insights from CSV/JSON files.
  "Kowalski, analysis!" - Skipper
---

# 🐧 Kowalski Analytics Canvas

Analyze data and display interactive visualizations, statistics, and insights.

## Example Prompts

Try asking Claude:

- "Kowalski, analysis!" (with a data file)
- "Analyze this CSV file and show me the trends"
- "Load sales_data.json and create visualizations"
- "Show me statistics for this dataset"
- "What insights can you find in this data?"
- "Create a dashboard from this spreadsheet"

## Scenarios

### `dashboard` (default)
Full dashboard view with KPIs, multiple charts, and insights summary.

```bash
bun run src/cli.ts show analytics --scenario dashboard --config '{
  "title": "Sales Analysis",
  "kpis": [
    {"label": "Total Revenue", "value": "$1.2M", "change": 0.15, "changeType": "increase"},
    {"label": "Orders", "value": "4,521", "change": 0.08, "changeType": "increase"},
    {"label": "Avg Order", "value": "$265", "change": -0.03, "changeType": "decrease"}
  ],
  "charts": [
    {
      "type": "line",
      "title": "Revenue Trend",
      "data": {"labels": ["Jan","Feb","Mar","Apr","May"], "values": [100,120,115,140,160]}
    },
    {
      "type": "bar",
      "title": "Sales by Region",
      "data": {"labels": ["North","South","East","West"], "values": [450,380,290,410]}
    }
  ],
  "insights": [
    "Revenue increased 15% compared to last quarter",
    "North region leads in sales volume",
    "Average order value slightly declined - consider promotions"
  ]
}'
```

### `charts`
Full-screen chart viewer with navigation between multiple charts.

```bash
bun run src/cli.ts spawn analytics --scenario charts --config '{
  "charts": [
    {"type": "bar", "title": "Monthly Sales", "data": {"labels": ["Jan","Feb","Mar"], "values": [100,150,120]}},
    {"type": "line", "title": "User Growth", "data": {"values": [10,25,45,80,120,200]}},
    {"type": "pie", "title": "Market Share", "data": {"labels": ["Us","Competitor A","Others"], "values": [45,30,25]}}
  ]
}'
```

### `data`
Data table view for exploring raw data with scrolling.

```bash
bun run src/cli.ts show analytics --scenario data --config '{
  "data": {
    "name": "customers.csv",
    "columns": ["ID", "Name", "Revenue", "Orders"],
    "rows": [
      [1, "Acme Corp", 50000, 12],
      [2, "Globex", 75000, 18],
      [3, "Initech", 32000, 8]
    ]
  }
}'
```

### `insights`
Statistical analysis view showing correlations, trends, and AI insights.

```bash
bun run src/cli.ts show analytics --scenario insights --config '{
  "analysis": {
    "summary": {"totalRows": 1000, "totalColumns": 8},
    "statistics": {
      "revenue": {"type": "numeric", "mean": 5200, "median": 4800, "min": 100, "max": 25000, "std": 3200}
    },
    "correlations": [
      {"column1": "marketing_spend", "column2": "revenue", "value": 0.85, "strength": "strong"}
    ],
    "trends": [
      {"column": "revenue", "direction": "up", "changePercent": 12.5, "description": "Steady growth over 6 months"}
    ]
  },
  "insights": [
    "Strong correlation between marketing spend and revenue (r=0.85)",
    "Revenue trending upward with 12.5% growth",
    "Consider increasing marketing budget based on ROI"
  ]
}'
```

## Configuration

```typescript
interface AnalyticsConfig {
  title?: string;              // Dashboard title
  data?: DataSet;              // Raw data to display
  analysis?: AnalysisResult;   // Statistical analysis results
  charts?: ChartConfig[];      // Chart configurations
  insights?: string[];         // AI-generated insights
  kpis?: KPI[];               // Key performance indicators
}

interface DataSet {
  name: string;                // Dataset name/filename
  columns: string[];           // Column headers
  rows: (string | number | null)[][];  // Data rows
  types?: ("string" | "number" | "date")[];  // Column types
}

interface ChartConfig {
  type: "line" | "bar" | "horizontal-bar" | "pie" | "table" | "histogram";
  title: string;
  data: {
    labels?: string[];         // X-axis labels
    values: number[];          // Y-axis values
    series?: { name: string; values: number[] }[];  // Multiple series
  };
  options?: {
    width?: number;
    height?: number;
    showLegend?: boolean;
  };
}

interface KPI {
  label: string;               // KPI name
  value: string | number;      // Current value
  change?: number;             // Change as decimal (0.15 = 15%)
  changeType?: "increase" | "decrease" | "neutral";
}

interface AnalysisResult {
  summary?: {
    totalRows: number;
    totalColumns: number;
    nullCounts?: Record<string, number>;
  };
  statistics?: Record<string, {
    type: "numeric" | "categorical";
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    std?: number;
    uniqueValues?: number;
    topValues?: { value: string; count: number }[];
  }>;
  correlations?: {
    column1: string;
    column2: string;
    value: number;
    strength: "strong" | "moderate" | "weak" | "none";
  }[];
  trends?: {
    column: string;
    direction: "up" | "down" | "stable";
    changePercent: number;
    description: string;
  }[];
}
```

## Data Analysis Workflow

When a user asks to analyze data:

1. **Load the data** - Read CSV/JSON file using file tools
2. **Parse and validate** - Convert to DataSet format
3. **Calculate statistics** - Compute mean, median, std, correlations
4. **Identify trends** - Detect patterns and changes over time
5. **Generate charts** - Create appropriate visualizations
6. **Derive insights** - Provide actionable observations
7. **Display canvas** - Show the analysis dashboard

### Example Analysis Code

```typescript
import { spawnAnalytics } from "${CLAUDE_PLUGIN_ROOT}/src/api";

// After loading and analyzing data...
const result = await spawnAnalytics({
  title: "Customer Analysis",
  data: {
    name: "customers.csv",
    columns: ["name", "revenue", "orders", "segment"],
    rows: parsedData,
  },
  analysis: {
    summary: { totalRows: parsedData.length, totalColumns: 4 },
    statistics: calculatedStats,
    correlations: foundCorrelations,
    trends: detectedTrends,
  },
  charts: [
    {
      type: "bar",
      title: "Revenue by Segment",
      data: { labels: segments, values: revenueBySegment },
    },
    {
      type: "line",
      title: "Monthly Trend",
      data: { labels: months, values: monthlyRevenue },
    },
  ],
  kpis: [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), change: 0.12, changeType: "increase" },
    { label: "Customers", value: customerCount, change: 0.05, changeType: "increase" },
  ],
  insights: [
    "Enterprise segment generates 65% of revenue",
    "Strong month-over-month growth of 12%",
    "Customer acquisition up 5% - marketing campaigns working",
  ],
});
```

## Chart Types

| Type | Best For | Example |
|------|----------|---------|
| `line` | Time series, trends | Revenue over time |
| `bar` | Comparisons | Sales by region |
| `horizontal-bar` | Rankings | Top 10 products |
| `pie` | Proportions | Market share |
| `table` | Detailed data | Full dataset view |
| `histogram` | Distributions | Age distribution |

## Controls

- `1-4` - Switch view modes (Dashboard/Charts/Data/Insights)
- `↑/↓` - Navigate charts or scroll data
- `Tab` - Cycle through views
- `E` - Export current view
- `Q` or `Esc` - Close canvas

## Tips for Best Results

1. **Provide context** - Tell Claude what questions you want answered
2. **Specify chart types** - "Show as bar chart" or "Create a line graph"
3. **Ask for insights** - "What patterns do you see?"
4. **Request specific KPIs** - "Calculate average order value and growth rate"
5. **Drill down** - "Focus on the North region" or "Filter by date range"

## API Usage

```typescript
import { spawnAnalytics, showAnalytics } from "${CLAUDE_PLUGIN_ROOT}/src/api";

// Spawn in new pane (recommended for interactive use)
const result = await spawnAnalytics({
  title: "My Analysis",
  charts: [...],
  insights: [...],
});

// Show in current terminal
await showAnalytics({
  data: myDataSet,
  analysis: myAnalysis,
});

if (result.action === "export") {
  console.log("User exported chart:", result.selection?.chartIndex);
}
```
