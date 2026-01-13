# Kowalski Analytics

> "Kowalski, analysis!" - Skipper

Data analysis skill for Claude Code. Drop a CSV, get insights.

## What It Does

- Finds patterns you didn't ask for
- Spots anomalies and data quality issues
- Remembers previous analyses and finds connections
- Tells you what to do next

## Usage

```
/kowalski data.csv              # Analyze a file
/kowalski                       # What have I analyzed?
/kowalski compare a.csv b.csv   # Compare two datasets
```

Then just ask follow-up questions naturally.

## Sample Output

```
◆ EDA: sales.csv                    │ QUICK STATS
                                    │ revenue  10.1K  ⠢⡐⢄⡠⠢⠔⠤ ↑24%
THE BASICS                          │ units    202    ⠢⡐⢄⡠⠢⠔⠤ ↑24%
32 rows • 6 columns                 │
                                    │ BY REGION
KEY FINDINGS                        │ West │████████ 11.2K
✓ Strong correlation: revenue ↔ units   │ East │██████ 9.8K
• Upward trend in revenue (+24%)    │
                                    │ DATA QUALITY
╭─────────────────────────────────╮ │ Complete ████████ 100%
│ Ready for analysis.             │ │
╰─────────────────────────────────╯ │
```

## Install

```bash
bun add kowalski-analytics
```

---

*Standing by for target designation, Skipper.*
