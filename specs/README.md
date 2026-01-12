# Kowalski Analytics Plugin - Technical Specification

> "Skipper, I've completed my analysis. The results are... concerning." - Kowalski

## 1. Overview

Kowalski is an intelligent data analytics plugin for Claude Code that combines the analytical rigor of a Senior Data Analyst at Stanford University (IQ 180) with the personality of Kowalski from Madagascar. It enables Claude to perform sophisticated exploratory data analysis, find relationships between datasets, and create interactive visualizations.

### 1.1 Core Philosophy

Kowalski approaches data like a seasoned researcher:
- **Hypothesis-driven**: Forms and tests hypotheses about data relationships
- **Skeptical**: Questions data quality, detects synthetic/fake data, validates assumptions
- **Rigorous**: Uses proper statistical methods (Pearson correlation, IQR outlier detection, linear regression)
- **Communicative**: Expresses uncertainty with confidence levels, asks clarifying questions when confused

### 1.2 Personality Guidelines

All user-facing messages should embody Kowalski's character:
- Uses military/scientific jargon ("recon sweep", "intel", "mission parameters")
- Addresses the user as "Skipper"
- Expresses analytical findings with dramatic flair
- Shows uncertainty: "73% confident this is a date column, Skipper. Shall I proceed?"
- Celebrates discoveries: "Eureka! Strong correlation detected in sector 7!"

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Claude Code Environment                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌─────────────────────────────────────────────┐  │
│   │  /kowalski   │────▶│           Kowalski Skill Engine              │  │
│   │   Command    │     │  ┌─────────────────────────────────────────┐ │  │
│   └──────────────┘     │  │         Analysis Brain                  │ │  │
│                        │  │  - Stanford-level statistical rigor     │ │  │
│   ┌──────────────┐     │  │  - Hypothesis generation & testing      │ │  │
│   │    Memory    │◀───▶│  │  - Uncertainty quantification           │ │  │
│   │   (CLAUDE.md │     │  │  - Relationship discovery               │ │  │
│   │   + project) │     │  └─────────────────────────────────────────┘ │  │
│   └──────────────┘     │                      │                       │  │
│                        │                      ▼                       │  │
│   ┌──────────────┐     │  ┌─────────────────────────────────────────┐ │  │
│   │ Data Sources │────▶│  │         Data Understanding              │ │  │
│   │  - CSV/JSON  │     │  │  - Schema inference                     │ │  │
│   │  - MCPs      │     │  │  - Column semantics detection           │ │  │
│   │  - APIs      │     │  │  - Relationship mapping                 │ │  │
│   └──────────────┘     │  │  - Clarifying questions                 │ │  │
│                        │  └─────────────────────────────────────────┘ │  │
│                        │                      │                       │  │
│                        │                      ▼                       │  │
│                        │  ┌─────────────────────────────────────────┐ │  │
│                        │  │      Visualization Engine               │ │  │
│                        │  │  ┌──────────────┐  ┌──────────────────┐ │ │  │
│                        │  │  │ Terminal Viz │  │   Browser Viz    │ │ │  │
│                        │  │  │ (Ink/Braille)│  │   (Recharts)     │ │ │  │
│                        │  │  └──────────────┘  └──────────────────┘ │ │  │
│                        │  └─────────────────────────────────────────┘ │  │
│                        └─────────────────────────────────────────────┘  │
│                                           │                             │
│                                           ▼                             │
│                        ┌─────────────────────────────────────────────┐  │
│                        │              Tmux Split Pane                 │  │
│                        │  ┌─────────────────────────────────────────┐ │  │
│                        │  │         Interactive Dashboard           │ │  │
│                        │  │  - Filter data                          │ │  │
│                        │  │  - Drill into columns                   │ │  │
│                        │  │  - Change chart types                   │ │  │
│                        │  │  - Export / Save                        │ │  │
│                        │  └─────────────────────────────────────────┘ │  │
│                        └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Overview

| Component | Purpose | Location |
|-----------|---------|----------|
| Skill Entry | `/kowalski` command handler | `src/skills/kowalski/` |
| Analysis Brain | Statistical analysis with Stanford rigor | `src/canvases/analytics/brain.ts` |
| Data Understanding | Schema inference, relationship discovery | `src/canvases/analytics/understanding.ts` |
| Memory Manager | Cross-session persistence | `src/canvases/analytics/memory.ts` |
| Terminal Viz | Ink-based interactive dashboard | `src/canvases/analytics/components/` |
| Browser Viz | Recharts-based HTML visualizations | `src/canvases/analytics/browser/` |
| IPC Layer | Communication between Claude and canvas | `src/ipc/` (existing) |

---

## 3. Functional Requirements

### 3.1 Data Sources

#### 3.1.1 CSV/JSON Files (REF: DS-001)
- Parse CSV files with robust quote handling (existing: `data-loader.ts`)
- Parse JSON files (arrays of objects)
- Auto-detect delimiters (comma, tab, semicolon)
- Handle common encodings (UTF-8, Latin-1)
- Support large files up to 100k rows with automatic sampling

#### 3.1.2 MCP Integration (REF: DS-002)
- Query MCP servers directly for data
- Accept data provided by user from MCP queries
- Support common data MCP patterns (databases, APIs)

#### 3.1.3 API Integration (REF: DS-003)
- Fetch data from REST APIs (JSON responses)
- Handle pagination for large datasets
- Support authentication (Bearer tokens, API keys via env vars)

### 3.2 Data Understanding

#### 3.2.1 Schema Inference (REF: DU-001)
- Infer column types: numeric, categorical, date, text, ID, boolean
- Detect semantic meaning: percentage, currency, count, rate
- Confidence scoring for each inference (0-100%)

#### 3.2.2 Relationship Discovery (REF: DU-002)
- Detect foreign key relationships between tables
- Identify join columns (exact match, fuzzy match)
- Map one-to-one, one-to-many, many-to-many relationships
- Calculate relationship strength confidence

#### 3.2.3 Clarifying Questions (REF: DU-003)
When Kowalski doesn't understand:
- Ambiguous column names: "Skipper, column 'val' could be value, validation, or valley. Which is it?"
- Unknown relationships: "I see 'customer_id' in both tables. Is this a linking field?"
- Mixed data types: "Column 'amount' has 73% numbers and 27% text. Should I treat as numeric?"
- Unusual patterns: "82% of rows have 'status=3'. Is this expected or data quality issue?"

### 3.3 Analysis Capabilities

#### 3.3.1 Exploratory Data Analysis (REF: AN-001)
Based on existing `insights.ts` and `stats.ts`:
- Descriptive statistics (mean, median, std, percentiles)
- Distribution analysis (histograms, box plots)
- Missing value analysis
- Synthetic data detection

#### 3.3.2 Correlation Analysis (REF: AN-002)
- Pearson correlation for numeric pairs
- Cramér's V for categorical pairs
- Point-biserial for numeric-categorical pairs
- Correlation heatmap generation

#### 3.3.3 Trend Detection (REF: AN-003)
- Linear regression for time series
- Seasonality detection
- Change point detection
- Growth rate calculation

#### 3.3.4 Outlier Detection (REF: AN-004)
- IQR method (existing)
- Z-score method
- Isolation Forest for multivariate outliers
- Contextual outliers (within groups)

#### 3.3.5 Hypothesis Generation (REF: AN-005)
Stanford-level analytical thinking:
- Generate testable hypotheses from patterns
- Suggest causal vs correlational interpretations
- Identify confounding variables
- Recommend follow-up analyses

### 3.4 Memory System

#### 3.4.1 What to Remember (REF: MEM-001)
Stored in summarized form in CLAUDE.md / project notes:

```markdown
## Kowalski Intel

### Known Datasets
- `sales.csv`: 2,847 rows, columns: date, product_id, revenue, quantity
  - Relationships: product_id → products.csv.id
  - Notes: Revenue is in USD, dates are US format

### Column Semantics
- `status` values: 1=pending, 2=shipped, 3=delivered, 4=returned
- `region_code`: Maps to geographic regions (see regions.csv)

### User Preferences
- Preferred chart type: bar charts
- Color scheme: dark mode
- Export format: PNG

### Previous Findings
- Strong correlation (r=0.87) between marketing_spend and revenue
- Seasonality detected in sales data (Q4 spike)
```

#### 3.4.2 Memory Retrieval (REF: MEM-002)
- Load relevant memory when dataset is loaded
- Match by filename, column names, and data patterns
- Surface relevant past findings: "Ah, I recognize this dataset from Operation Delta..."

### 3.5 Visualization

#### 3.5.1 Terminal Visualization (REF: VIZ-001)
Using existing Ink infrastructure:
- Braille-based charts (high resolution)
- Interactive filtering (keyboard navigation)
- Drill-down into specific data points
- Real-time updates via IPC

#### 3.5.2 Browser Visualization (REF: VIZ-002)
New Recharts-based system:
- Line charts, bar charts, scatter plots, pie charts
- Interactive tooltips and zoom
- Responsive layout
- Auto-open in default browser

#### 3.5.3 Export Options (REF: VIZ-003)
- PNG image export
- SVG vector export
- CSV data export (filtered/transformed data)
- JSON analysis results export

### 3.6 Interactive Features

#### 3.6.1 Dashboard Interactions (REF: INT-001)
In the tmux split pane:
- **Filter**: Apply column filters (numeric ranges, categorical selection)
- **Drill-down**: Click on data point to see details
- **Chart switching**: Toggle between chart types
- **Column selection**: Choose which columns to visualize

#### 3.6.2 Live Updates (REF: INT-002)
- Dashboard updates when Claude sends new analysis
- User can also trigger updates: "Update the dashboard"
- IPC messages for real-time sync

---

## 4. Non-Functional Requirements

### 4.1 Performance

#### 4.1.1 Dataset Size Tiers (REF: PERF-001)
| Size | Rows | Behavior |
|------|------|----------|
| Small | < 10,000 | Full analysis, no sampling |
| Medium | 10,000 - 100,000 | Smart sampling for viz, full data for aggregations |
| Large | > 100,000 | Warn user, require confirmation, chunked processing |

#### 4.1.2 Response Times (REF: PERF-002)
- Initial scan: < 2 seconds for datasets up to 50k rows
- EDA report generation: < 5 seconds
- Chart rendering: < 1 second
- Filter application: < 500ms

### 4.2 Reliability

#### 4.2.1 Error Handling (REF: REL-001)
- Graceful handling of malformed CSV/JSON
- Clear error messages in Kowalski voice
- Recovery suggestions: "Data appears corrupted at row 1,247. Shall I skip and continue?"

#### 4.2.2 State Persistence (REF: REL-002)
- Canvas state survives brief disconnections
- Analysis can be resumed after interruption
- Memory persists across Claude Code sessions

### 4.3 Usability

#### 4.3.1 Onboarding (REF: USE-001)
When `/kowalski` invoked with no args:
1. Recon sweep of current directory
2. List detected data files with row counts
3. Show previous mission context
4. Prompt for orders

#### 4.3.2 Uncertainty Communication (REF: USE-002)
Express confidence levels:
- "I'm 95% certain this is a date column"
- "Low confidence (42%) on the relationship between these tables"
- "This correlation (r=0.34) is statistically significant but weak"

---

## 5. Technical Design

### 5.1 Skill Registration

```typescript
// src/skills/kowalski/index.ts
export const kowalskiSkill: Skill = {
  name: "kowalski",
  description: "Kowalski Analytics - Data analysis with military precision",
  command: "/kowalski",
  handler: kowalskiHandler,
};
```

### 5.2 Entry Point Flow

```
/kowalski [command] [args]

Commands:
  (no args)     - Recon sweep, show status, await orders
  analyze <file>- Load and analyze specified file
  compare <f1> <f2> - Find relationships between files
  query <mcp>   - Fetch data from MCP server
  memory        - Show/manage Kowalski's memory
  dashboard     - Open interactive dashboard
  help          - Mission briefing (help text)
```

### 5.3 Analysis Brain Interface

```typescript
// src/canvases/analytics/brain.ts
interface AnalysisBrain {
  // Core analysis
  analyze(data: DataSet): Promise<AnalysisResult>;

  // Understanding
  inferSchema(data: DataSet): Promise<SchemaInference>;
  findRelationships(datasets: DataSet[]): Promise<Relationship[]>;

  // Hypothesis
  generateHypotheses(analysis: AnalysisResult): Hypothesis[];
  testHypothesis(data: DataSet, hypothesis: Hypothesis): HypothesisResult;

  // Uncertainty
  getConfidenceLevel(inference: Inference): number;
  generateClarifyingQuestions(issues: InferenceIssue[]): Question[];
}
```

### 5.4 Memory Manager Interface

```typescript
// src/canvases/analytics/memory.ts
interface KowalskiMemory {
  // Dataset intel
  rememberDataset(dataset: DatasetMemo): void;
  recallDataset(identifier: DatasetIdentifier): DatasetMemo | null;

  // Column semantics
  rememberColumnMeaning(column: ColumnMemo): void;
  recallColumnMeaning(columnName: string): ColumnMemo | null;

  // User preferences
  getPreferences(): UserPreferences;
  updatePreferences(prefs: Partial<UserPreferences>): void;

  // Findings
  recordFinding(finding: AnalysisFinding): void;
  recallFindings(datasetId: string): AnalysisFinding[];

  // Persistence
  save(): Promise<void>;  // Write to CLAUDE.md
  load(): Promise<void>;  // Read from CLAUDE.md
}
```

### 5.5 Data Understanding Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Data Understanding Pipeline                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │   Load      │───▶│   Infer     │───▶│  Validate   │───▶│  Report   │ │
│  │   Data      │    │   Schema    │    │  & Question │    │  Finding  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
│        │                  │                   │                  │       │
│        ▼                  ▼                   ▼                  ▼       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ - Parse CSV │    │ - Type      │    │ - Check     │    │ - EDA     │ │
│  │ - Parse JSON│    │   detection │    │   memory    │    │   Report  │ │
│  │ - Fetch API │    │ - Semantic  │    │ - Generate  │    │ - Hypo-   │ │
│  │ - Query MCP │    │   inference │    │   questions │    │   theses  │ │
│  └─────────────┘    │ - Confidence│    │ - User      │    │ - Bottom  │ │
│                     │   scoring   │    │   response  │    │   line    │ │
│                     └─────────────┘    └─────────────┘    └───────────┘ │
│                                                                           │
│  Confidence Thresholds:                                                   │
│  - ≥90%: Proceed automatically                                           │
│  - 70-89%: Note uncertainty, proceed                                     │
│  - 50-69%: Ask clarifying question                                       │
│  - <50%: Require user input                                              │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Browser Visualization Architecture

```typescript
// src/canvases/analytics/browser/index.ts
interface BrowserViz {
  // Chart generation
  createChart(config: ChartConfig): HTMLString;
  createDashboard(charts: ChartConfig[]): HTMLString;

  // Interactivity
  addFilter(chart: Chart, filter: FilterConfig): void;
  addDrilldown(chart: Chart, handler: DrilldownHandler): void;

  // Export
  exportPNG(chart: Chart): Promise<Buffer>;
  exportSVG(chart: Chart): string;

  // Server
  serve(port: number): Promise<void>;  // Local server for live updates
  open(): Promise<void>;  // Open in default browser
}
```

### 5.7 IPC Message Extensions

New messages for interactive features:

```typescript
// Controller → Canvas
| { type: "filter"; column: string; condition: FilterCondition }
| { type: "drilldown"; target: DrilldownTarget }
| { type: "changeChart"; chartId: string; newType: ChartType }
| { type: "export"; format: "png" | "svg" | "csv" | "json" }

// Canvas → Controller
| { type: "filterApplied"; resultCount: number }
| { type: "drilldownData"; data: DataPoint[] }
| { type: "exported"; path: string }
| { type: "userQuestion"; question: string }  // Canvas asks Claude
```

---

## 6. User Experience Flows

### 6.1 First-Time Use

```
User: /kowalski

Kowalski:
┌─────────────────────────────────────────────────────────────────┐
│  KOWALSKI ANALYTICS - MISSION BRIEFING                          │
├─────────────────────────────────────────────────────────────────┤
│  Greetings, Skipper. Kowalski reporting for duty.               │
│                                                                  │
│  I'm your data analysis specialist, trained at Stanford         │
│  with expertise in statistical analysis, pattern                │
│  recognition, and hypothesis testing.                            │
│                                                                  │
│  📁 Recon sweep complete:                                       │
│     • sales_q4.csv (2,847 rows) - NEW                           │
│     • customers.json (412 records) - NEW                        │
│                                                                  │
│  🧠 Memory banks: Empty (first mission in this sector)          │
│                                                                  │
│  Awaiting orders, Skipper. What shall I analyze?                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Analysis with Uncertainty

```
User: /kowalski analyze sales_q4.csv

Kowalski:
Loading data... scanning 2,847 rows across 8 columns.

⚠️ ATTENTION SKIPPER - I need clarification:

Column 'stat' contains values: 1, 2, 3, 4
→ 68% confidence these are status codes
→ But could also be: rating, priority, category

What does 'stat' represent?
  [1] Status codes (pending/processing/done/cancelled)
  [2] Rating (1-4 scale)
  [3] Priority level
  [4] Something else (please explain)
```

### 6.3 Relationship Discovery

```
User: /kowalski compare sales.csv orders.csv

Kowalski:
Analyzing relationship topology between datasets...

┌─────────────────────────────────────────────────────────────────┐
│  RELATIONSHIP INTEL                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  sales.csv ────[order_id]────▶ orders.csv                       │
│     2,847 rows                   1,203 rows                      │
│                                                                  │
│  Match Analysis:                                                 │
│  • 2,412 sales records have matching orders (84.7%)             │
│  • 435 orphan sales records (no matching order)                 │
│  • Relationship: Many-to-One (multiple sales per order)         │
│                                                                  │
│  Confidence: 94%                                                 │
│                                                                  │
│  ⚠️ Data quality note:                                          │
│  435 orphan records is unusual (15.3%). Possible causes:        │
│  1. Orders deleted but sales retained                            │
│  2. Data export timing mismatch                                  │
│  3. Test/demo data mixed with production                         │
│                                                                  │
│  Shall I investigate the orphan records, Skipper?               │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Hypothesis Generation

```
Kowalski:
┌─────────────────────────────────────────────────────────────────┐
│  HYPOTHESIS BRIEFING                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Based on preliminary analysis, I've generated testable         │
│  hypotheses:                                                     │
│                                                                  │
│  H1: Marketing spend drives revenue                              │
│      Evidence: r=0.87 correlation                                │
│      Confidence: 91%                                             │
│      Caution: Correlation ≠ causation. Confounders:             │
│               - Seasonality (both spike in Q4)                  │
│               - Company growth trend                             │
│                                                                  │
│  H2: Customer segment affects order value                        │
│      Evidence: Enterprise avg $2,340 vs SMB avg $890            │
│      Confidence: 88%                                             │
│      Statistical test: t-test p < 0.001                         │
│                                                                  │
│  H3: Delivery time impacts return rate                           │
│      Evidence: Weak negative correlation (r=-0.23)              │
│      Confidence: 62%                                             │
│      Recommendation: Needs more data to confirm                 │
│                                                                  │
│  Which hypothesis shall we investigate further, Skipper?        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. File Structure

```
src/
├── skills/
│   └── kowalski/
│       ├── index.ts              # Skill registration
│       ├── handler.ts            # Command handler
│       ├── commands/
│       │   ├── analyze.ts        # /kowalski analyze
│       │   ├── compare.ts        # /kowalski compare
│       │   ├── query.ts          # /kowalski query (MCP/API)
│       │   ├── memory.ts         # /kowalski memory
│       │   └── dashboard.ts      # /kowalski dashboard
│       └── personality.ts        # Kowalski voice/messaging
│
├── canvases/
│   └── analytics/
│       ├── brain.ts              # NEW: Analysis brain
│       ├── understanding.ts      # NEW: Data understanding
│       ├── memory.ts             # NEW: Memory manager
│       ├── hypotheses.ts         # NEW: Hypothesis engine
│       ├── relationships.ts      # NEW: Relationship discovery
│       ├── confidence.ts         # NEW: Confidence scoring
│       ├── questions.ts          # NEW: Clarifying questions
│       │
│       ├── browser/              # NEW: Browser viz
│       │   ├── index.ts
│       │   ├── server.ts         # Local viz server
│       │   ├── charts.tsx        # Recharts components
│       │   ├── dashboard.tsx     # Full dashboard
│       │   └── export.ts         # PNG/SVG export
│       │
│       ├── components/           # EXISTING: Terminal viz
│       │   ├── eda-dashboard.tsx # Enhanced with interactions
│       │   ├── filter-panel.tsx  # NEW: Filter UI
│       │   └── ...
│       │
│       ├── data-loader.ts        # EXISTING: Enhanced
│       ├── stats.ts              # EXISTING: Enhanced
│       ├── insights.ts           # EXISTING: Enhanced
│       └── types.ts              # EXISTING: Extended
│
└── ipc/
    └── types.ts                  # Extended with new messages
```

---

## 8. Dependencies

### 8.1 Existing (No Changes)
- `ink` - Terminal UI framework
- `react` - Component rendering
- `chalk` - Terminal colors

### 8.2 New Dependencies
- `recharts` - Browser chart library
- `express` - Local viz server (minimal)
- `open` - Open browser automatically
- `html-to-image` - PNG export (optional, can use canvas)

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Statistical functions (correlation, regression, outlier detection)
- Schema inference accuracy
- Relationship detection
- Memory serialization/deserialization

### 9.2 Integration Tests
- End-to-end analysis pipeline
- IPC communication
- Browser viz rendering
- Export functionality

### 9.3 Test Datasets
- `sample_data/sales.csv` - Clean, well-structured (existing)
- `sample_data/messy_data.csv` - Missing values, mixed types
- `sample_data/synthetic.csv` - For synthetic detection testing
- `sample_data/related_tables/` - Multi-file relationship testing

---

## 10. Success Metrics

### 10.1 Accuracy
- Schema inference: > 90% accuracy on standard datasets
- Relationship detection: > 85% accuracy on joined tables
- Synthetic data detection: > 95% true positive rate

### 10.2 User Experience
- Time to first insight: < 10 seconds
- Clarifying questions: Relevant and minimal (< 3 per dataset)
- User satisfaction with Kowalski personality: Qualitative feedback

### 10.3 Performance
- Handles 100k row datasets without degradation
- Dashboard interactions < 500ms response time
- Memory footprint < 500MB for large datasets

---

## 11. Future Considerations

### 11.1 Phase 2 (Not in Scope)
- Machine learning model integration (clustering, classification)
- Natural language query interface ("show me revenue by region")
- Collaborative analysis (share findings with team)
- Data transformation pipelines

### 11.2 Phase 3 (Not in Scope)
- Automated report generation (PDF/HTML)
- Scheduled analysis jobs
- Data versioning and lineage
- Integration with BI tools

---

## Appendix A: Reference Implementation Details

### A.1 Existing Infrastructure (from codebase exploration)

| Component | File | Description |
|-----------|------|-------------|
| CSV Parser | `data-loader.ts` | Robust quote handling, type inference |
| Statistics | `stats.ts` | Mean, median, std, correlation, trends |
| Insights | `insights.ts` | EDA report, synthetic detection, findings |
| EDA Dashboard | `eda-dashboard.tsx` | Two-column Ink layout |
| Braille Charts | `braille-charts.tsx` | High-res terminal charts |
| Canvas Spawn | `canvas-api.ts` | IPC server, tmux integration |
| Terminal Mgmt | `terminal.ts` | Tmux split, app detection |
| IPC Types | `ipc/types.ts` | Message definitions |

### A.2 Key Interfaces to Extend

```typescript
// Extend AnalysisResult
interface AnalysisResult {
  // ... existing
  hypotheses?: Hypothesis[];
  relationships?: Relationship[];
  confidenceScores?: Map<string, number>;
}

// Extend EDAReport
interface EDAReport {
  // ... existing
  clarifyingQuestions?: Question[];
  uncertainties?: Uncertainty[];
}
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-13*
*Author: Kowalski Analytics Team*
