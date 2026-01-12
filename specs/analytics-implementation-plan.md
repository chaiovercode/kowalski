# Kowalski Analytics - Implementation Plan

> "Skipper, I've mapped out the operation. Executing in T-minus... now." - Kowalski

This document outlines the implementation plan for Kowalski Analytics, with references to the technical specification (`README.md`).

---

## Phase 1: Foundation & Skill Setup ✅ COMPLETE

### 1.1 Skill Registration ✅
- [x] Create skill directory structure `src/skills/kowalski/` [Spec §5.1, §7]
- [x] Implement skill entry point `index.ts` with command routing
- [x] Register `/kowalski` command in Claude Code skill system
- [x] Create command parser for subcommands: `analyze`, `compare`, `query`, `memory`, `dashboard`, `help`

### 1.2 Kowalski Personality Module ✅
- [x] Create `personality.ts` with message templates [Spec §1.2]
- [x] Implement `kowalskiSay(message, type)` utility for consistent voice
- [x] Define message types: `greeting`, `finding`, `question`, `warning`, `success`, `error`
- [x] Add military/scientific jargon dictionary for varied responses
- [x] Implement confidence verbalization: "73% confident" → "Reasonably certain, Skipper"

### 1.3 Recon Sweep (No-Args Handler) ✅
- [x] Implement directory scanning for data files (CSV, JSON, TSV) [Spec §6.1]
- [x] Calculate row counts without full parsing (line count heuristic)
- [ ] Check for existing memory in CLAUDE.md (deferred to Phase 5)
- [x] Render status box with Kowalski branding
- [x] Display "Awaiting orders, Skipper" prompt

**Completed:** 2026-01-13
**Tests:** 63 passing tests in `src/skills/kowalski/__tests__/`
**Commit:** 6daf69d

---

## Phase 2: Data Understanding Engine

### 2.1 Enhanced Schema Inference ✅
- [x] Extend `data-loader.ts` with confidence-scored type detection [Spec §3.2.1, REF: DU-001]
- [x] Add semantic type detection:
  - [x] Percentage (0-100 range, % suffix)
  - [x] Currency ($ prefix, common amounts)
  - [x] Count (integer, positive)
  - [x] Rate (decimal, 0-1 range)
  - [x] ID column (all unique, sequential or UUID pattern)
  - [x] Boolean (true/false, yes/no, 1/0)
  - [x] Additional types: email, phone, url, timestamp, text, categorical
- [x] Implement confidence scoring (0-100%) for each inference
- [x] Create `understanding.ts` module [Spec §5.3]

**Completed:** 2026-01-13
**Tests:** 41 passing tests in `src/canvases/analytics/__tests__/understanding.test.ts`
**Commit:** edc8dab

### 2.2 Clarifying Questions System (Partially Complete)
- [x] Create clarifying question generation in `understanding.ts` [Spec §3.2.3, REF: DU-003]
- [x] Define question triggers:
  - [x] Ambiguous column names (confidence < 70%)
  - [x] Mixed data types in column
  - [x] Unknown categorical values
- [x] Implement question formatting with Kowalski voice (`kowalskiConfidenceMessage`)
- [ ] Create `questions.ts` module for centralized question handling
- [ ] Add multiple-choice response handler
- [ ] Store user responses in memory for future reference

### 2.3 Confidence System ✅
- [x] Confidence scoring implemented in `understanding.ts` [Spec §5.5]
- [x] Define confidence thresholds (exported as `CONFIDENCE_THRESHOLDS`):
  - [x] ≥90%: Auto-proceed (high)
  - [x] 70-89%: Note uncertainty, proceed (medium)
  - [x] 50-69%: Ask clarifying question (low)
  - [x] <50%: Require user input (very_low)
- [x] Implement confidence aggregation for complex inferences
- [x] Add confidence verbalization for user-facing messages [Spec §4.3.2, REF: USE-002]
  - [x] `verbalizeConfidence()` - human-readable confidence description
  - [x] `kowalskiConfidenceMessage()` - Kowalski personality messages

---

## Phase 3: Analysis Brain

### 3.1 Hypothesis Engine ✅
- [x] Create `hypotheses.ts` module [Spec §3.3.5, REF: AN-005]
- [x] Implement hypothesis generation from patterns:
  - [x] Correlation-based: "X may drive Y" (r > 0.5)
  - [x] Group difference: "Segment A differs from B" (significant t-test)
  - [x] Trend-based: "Metric is increasing/decreasing"
  - [x] Anomaly-based: "Outliers may indicate issue"
- [x] Add causal vs correlational interpretation
- [x] Identify potential confounding variables
- [x] Suggest follow-up analyses

**Completed:** 2026-01-13
**Tests:** 38 passing tests in `src/canvases/analytics/__tests__/hypotheses.test.ts`
**Commit:** 2e52a5b

### 3.2 Enhanced Statistics ✅
- [x] Extend `stats.ts` with additional tests [Spec §3.3.2-3.3.4]
- [x] Add Cramér's V for categorical correlation [REF: AN-002]
- [x] Add point-biserial for numeric-categorical [REF: AN-002]
- [x] Implement Z-score outlier detection [REF: AN-004]
- [x] Add change point detection for time series [REF: AN-003]
- [x] Implement seasonality detection [REF: AN-003]

**Completed:** 2026-01-13
**Tests:** 40 passing tests in `src/canvases/analytics/__tests__/enhanced-stats.test.ts`
**Commit:** 5622871

### 3.3 Analysis Brain Interface ✅
- [x] Create `brain.ts` as central analysis orchestrator [Spec §5.3]
- [x] Implement `analyze(data)` with full pipeline
- [x] Implement `inferSchema(data)` with confidence
- [x] Implement `generateHypotheses(analysis)`
- [x] Implement `testHypothesis(data, hypothesis)`
- [x] Wire up to existing `insights.ts` for EDA report

**Completed:** 2026-01-13
**Tests:** 22 passing tests in `src/canvases/analytics/__tests__/brain.test.ts`
**Commit:** f72a74b

---

## Phase 4: Relationship Discovery ✅ COMPLETE

### 4.1 Multi-Dataset Support ✅
- [x] Create `relationships.ts` module [Spec §3.2.2, REF: DU-002]
- [x] Implement foreign key detection:
  - [x] Exact column name match (e.g., `customer_id`)
  - [x] Fuzzy name match (e.g., `cust_id` ↔ `customer_id`)
  - [x] Value overlap analysis
- [x] Calculate relationship confidence

### 4.2 Relationship Mapping ✅
- [x] Detect relationship types:
  - [x] One-to-one (unique both sides)
  - [x] One-to-many (unique one side)
  - [x] Many-to-many (unique neither)
- [x] Identify orphan records (unmatched foreign keys)
- [x] Calculate match percentage
- [x] Generate relationship diagram (ASCII art)

**Completed:** 2026-01-13
**Tests:** 20 passing tests in `src/canvases/analytics/__tests__/relationships.test.ts`
**Commit:** a54056a

### 4.3 Compare Command ✅
- [x] Implement `/kowalski compare <file1> <file2>` handler [Spec §5.2]
- [x] Load both datasets
- [x] Run relationship discovery
- [x] Present findings with Kowalski voice
- [x] Suggest join strategy if applicable

**Completed:** 2026-01-13
**Tests:** 10 passing tests in `src/skills/kowalski/__tests__/commands.test.ts` (compare section)
**Commit:** 293ecd6

---

## Phase 5: Memory System ✅ COMPLETE

### 5.1 Memory Manager ✅
- [x] Create `memory.ts` module [Spec §3.4, §5.4]
- [x] Define memory structure for CLAUDE.md [Spec §3.4.1, REF: MEM-001]
- [x] Implement `save()` - serialize to markdown format
- [x] Implement `load()` - parse from CLAUDE.md
- [x] Handle missing/malformed memory gracefully

### 5.2 Dataset Memory ✅
- [x] Store dataset fingerprint (name, columns, row count hash)
- [x] Remember column semantics discovered
- [x] Store relationship mappings
- [x] Track analysis history per dataset (analysisCount)

### 5.3 User Preferences ✅
- [x] Store preferred chart types
- [x] Remember export format preferences
- [x] Track column interpretations user provided
- [x] Store custom thresholds/settings (verbosityLevel, autoSpawnDashboard)

### 5.4 Memory Retrieval ✅
- [x] Match loaded dataset to stored memory [Spec §3.4.2, REF: MEM-002]
- [x] Surface relevant past findings (recallFindings)
- [x] Pre-populate known column semantics (recallColumnMeaning)
- [x] Show "I recognize this dataset" message when matched (getRecognitionMessage)

**Completed:** 2026-01-13
**Tests:** 27 passing tests in `src/canvases/analytics/__tests__/memory.test.ts`
**Commit:** (pending)

---

## Phase 6: Terminal Dashboard Enhancements

### 6.1 Interactive Features
- [ ] Extend `eda-dashboard.tsx` with interaction handlers [Spec §3.6.1, REF: INT-001]
- [ ] Implement filter panel component:
  - [ ] Numeric range sliders (keyboard controlled)
  - [ ] Categorical value checkboxes
  - [ ] Date range picker
- [ ] Add drill-down on data points:
  - [ ] Arrow keys to select
  - [ ] Enter to expand details
- [ ] Implement chart type switcher (1-4 number keys)

### 6.2 Live Updates
- [ ] Extend IPC messages for interactive features [Spec §5.7]
- [ ] Implement `filter` message handler
- [ ] Implement `drilldown` message handler
- [ ] Add `userQuestion` message (canvas → Claude)
- [ ] Support real-time dashboard refresh [Spec §3.6.2, REF: INT-002]

### 6.3 Export from Terminal
- [ ] Add export menu (E key)
- [ ] Implement CSV export of filtered data
- [ ] Implement JSON export of analysis results
- [ ] Show export confirmation with path

---

## Phase 7: Browser Visualization

### 7.1 Recharts Setup
- [ ] Add `recharts` dependency [Spec §8.2]
- [ ] Create `browser/` directory [Spec §7]
- [ ] Implement base chart components:
  - [ ] Line chart
  - [ ] Bar chart (vertical & horizontal)
  - [ ] Scatter plot
  - [ ] Pie chart
  - [ ] Histogram

### 7.2 Dashboard Generation
- [ ] Create `dashboard.tsx` - full Recharts dashboard
- [ ] Implement responsive layout
- [ ] Add interactive tooltips
- [ ] Implement zoom/pan for time series
- [ ] Support dark mode

### 7.3 Local Server
- [ ] Create `server.ts` with minimal Express [Spec §5.6]
- [ ] Serve dashboard HTML on random available port
- [ ] Implement hot reload for live updates
- [ ] Add WebSocket for real-time sync with Claude

### 7.4 Export
- [ ] Implement PNG export [Spec §3.5.3, REF: VIZ-003]
- [ ] Implement SVG export
- [ ] Add download button in browser UI
- [ ] Support export from terminal command

### 7.5 Auto-Open
- [ ] Add `open` dependency [Spec §8.2]
- [ ] Detect default browser
- [ ] Auto-open dashboard URL after server starts
- [ ] Handle "browser viz" selection from terminal dashboard

---

## Phase 8: MCP & API Integration

### 8.1 MCP Query Support
- [ ] Implement `/kowalski query <mcp>` handler [Spec §3.1.2, REF: DS-002]
- [ ] Integrate with Claude Code's MCP system
- [ ] Parse MCP query results into DataSet format
- [ ] Handle pagination for large results
- [ ] Support both direct query and user-provided data

### 8.2 API Integration
- [ ] Implement REST API fetcher [Spec §3.1.3, REF: DS-003]
- [ ] Support JSON response parsing
- [ ] Handle authentication (Bearer token, API key from env)
- [ ] Implement pagination handling
- [ ] Convert API response to DataSet format

---

## Phase 9: Performance Optimization

### 9.1 Large Dataset Handling
- [ ] Implement tiered processing [Spec §4.1.1, REF: PERF-001]:
  - [ ] Small (<10k): Full analysis
  - [ ] Medium (10k-100k): Smart sampling
  - [ ] Large (>100k): Warn + chunk
- [ ] Add progress indicator for long operations
- [ ] Implement streaming analysis for very large files

### 9.2 Caching
- [ ] Cache column statistics
- [ ] Cache correlation matrix
- [ ] Implement incremental analysis for filtered data
- [ ] Add analysis result caching

### 9.3 Response Time Targets
- [ ] Profile and optimize to meet targets [Spec §4.1.2, REF: PERF-002]:
  - [ ] Initial scan: < 2s for 50k rows
  - [ ] EDA report: < 5s
  - [ ] Chart render: < 1s
  - [ ] Filter apply: < 500ms

---

## Phase 10: Testing & Polish

### 10.1 Unit Tests
- [ ] Test statistical functions [Spec §9.1]
- [ ] Test schema inference accuracy
- [ ] Test relationship detection
- [ ] Test memory serialization
- [ ] Test confidence scoring

### 10.2 Integration Tests
- [ ] Test full analysis pipeline [Spec §9.2]
- [ ] Test IPC communication
- [ ] Test browser viz rendering
- [ ] Test export functionality
- [ ] Test MCP/API integration

### 10.3 Test Datasets
- [ ] Create `sample_data/messy_data.csv` [Spec §9.3]
- [ ] Create `sample_data/related_tables/` directory
- [ ] Ensure synthetic detection works on test data

### 10.4 Polish
- [ ] Review all Kowalski messages for consistency
- [ ] Add error recovery suggestions
- [ ] Improve onboarding experience
- [ ] Write help text for all commands

---

## Milestone Summary

| Milestone | Phases | Key Deliverables |
|-----------|--------|------------------|
| M1: MVP | 1-3 | Skill setup, basic analysis, Kowalski voice |
| M2: Understanding | 4-5 | Relationships, memory, clarifying questions |
| M3: Visualization | 6-7 | Interactive terminal, browser charts |
| M4: Integration | 8-9 | MCP/API support, performance optimization |
| M5: Release | 10 | Testing, polish, documentation |

---

## Quick Reference: Spec Citations

| Feature | Spec Section | Requirement ID |
|---------|--------------|----------------|
| CSV Parsing | §3.1.1 | DS-001 |
| MCP Integration | §3.1.2 | DS-002 |
| API Integration | §3.1.3 | DS-003 |
| Schema Inference | §3.2.1 | DU-001 |
| Relationship Discovery | §3.2.2 | DU-002 |
| Clarifying Questions | §3.2.3 | DU-003 |
| EDA | §3.3.1 | AN-001 |
| Correlation | §3.3.2 | AN-002 |
| Trend Detection | §3.3.3 | AN-003 |
| Outlier Detection | §3.3.4 | AN-004 |
| Hypotheses | §3.3.5 | AN-005 |
| Memory Storage | §3.4.1 | MEM-001 |
| Memory Retrieval | §3.4.2 | MEM-002 |
| Terminal Viz | §3.5.1 | VIZ-001 |
| Browser Viz | §3.5.2 | VIZ-002 |
| Export | §3.5.3 | VIZ-003 |
| Interactions | §3.6.1 | INT-001 |
| Live Updates | §3.6.2 | INT-002 |
| Performance Tiers | §4.1.1 | PERF-001 |
| Response Times | §4.1.2 | PERF-002 |
| Error Handling | §4.2.1 | REL-001 |
| Onboarding | §4.3.1 | USE-001 |
| Uncertainty | §4.3.2 | USE-002 |

---

*"The plan is perfect, Skipper. What could possibly go wrong?"* - Kowalski

*Document Version: 1.0*
*Last Updated: 2026-01-13*
