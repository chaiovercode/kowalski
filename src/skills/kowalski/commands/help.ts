// Kowalski Help Command
// Display mission briefing and command documentation

import { KOWALSKI_BANNER } from "../personality";

export function getHelpText(): string {
  return `${KOWALSKI_BANNER}
Kowalski Analytics - Data Analysis with Military Precision

COMMANDS:

  /kowalski                 Recon sweep - scan for data files
  /kowalski analyze <file>  Load and analyze a data file
  /kowalski compare <f1> <f2>  Compare two datasets (coming soon)
  /kowalski memory          View analysis memory (coming soon)
  /kowalski dashboard       Open interactive dashboard (coming soon)
  /kowalski help            This mission briefing

SUPPORTED FORMATS:

  CSV, JSON, TSV files are supported.
  Large datasets (>100k rows) will be automatically sampled.

EXAMPLES:

  /kowalski                           # Scan current directory
  /kowalski analyze sales.csv         # Analyze sales data
  /kowalski analyze data/metrics.json # Analyze JSON data

CAPABILITIES:

  • Exploratory Data Analysis (EDA)
  • Correlation detection (Pearson)
  • Trend analysis (linear regression)
  • Outlier detection (IQR method)
  • Synthetic data detection
  • Interactive terminal dashboard

Skipper, I'm ready to analyze any data you throw at me.
`;
}
