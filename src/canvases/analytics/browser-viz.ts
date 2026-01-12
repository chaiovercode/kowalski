// Browser-Based Visualization Generator for Kowalski Analytics
// "Kowalski, make it beautiful!" - Creates stunning, USEFUL D3.js visualizations

import type { DataSet, AnalysisResult, Statistics } from "./types";
import { exec } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface VizConfig {
  type: "dashboard" | "3d" | "interactive" | "presentation";
  theme?: "dark" | "light" | "cyberpunk";
  title?: string;
}

/**
 * Intelligently aggregate data for meaningful visualizations
 */
function aggregateData(data: DataSet, analysis: AnalysisResult) {
  const { columns, rows, types } = data;
  const { statistics } = analysis;

  // Find the best columns for different purposes
  const numericCols = columns.filter((_, i) => types?.[i] === "number");
  const categoricalCols = columns.filter((_, i) => types?.[i] !== "number" && types?.[i] !== "date");
  const dateCols = columns.filter((_, i) => types?.[i] === "date");

  // Identify key columns by name patterns
  const findColumn = (patterns: string[]) => {
    return columns.find(col =>
      patterns.some(p => col.toLowerCase().includes(p.toLowerCase()))
    );
  };

  // Common column types
  const rateCol = findColumn(['rate', 'percentage', 'percent', 'adoption', 'score']);
  const countCol = findColumn(['users', 'count', 'visits', 'views', 'sales', 'revenue']);
  const categoryCol = findColumn(['tool', 'product', 'type', 'category', 'name']);
  const groupCol = findColumn(['industry', 'sector', 'department', 'vertical']);
  const geoCol = findColumn(['country', 'region', 'state', 'city', 'location']);
  const timeCol = findColumn(['year', 'date', 'month', 'quarter', 'period']);
  const sizeCol = findColumn(['size', 'company_size', 'org_size']);
  const ageCol = findColumn(['age', 'age_group', 'demographic']);

  // Helper to aggregate by a column
  const aggregateBy = (groupByCol: string, valueCol: string, aggFunc: 'mean' | 'sum' | 'count' = 'mean') => {
    const groupIdx = columns.indexOf(groupByCol);
    const valueIdx = columns.indexOf(valueCol);
    if (groupIdx === -1) return [];

    const groups = new Map<string, number[]>();
    for (const row of rows) {
      const key = String(row[groupIdx] || 'Unknown');

      if (!groups.has(key)) groups.set(key, []);

      if (valueIdx >= 0) {
        const val = row[valueIdx];
        if (typeof val === 'number') {
          groups.get(key)!.push(val);
        } else if (aggFunc === 'count') {
          // If just counting rows, treat as 1
          groups.get(key)!.push(1);
        }
        // Explicitly skip null/non-number for mean/sum
      } else {
        // No value column specified, imply count of 1
        groups.get(key)!.push(1);
      }
    }

    return Array.from(groups.entries()).map(([label, values]) => ({
      label,
      value: aggFunc === 'sum' ? values.reduce((a, b) => a + b, 0) :
        aggFunc === 'count' ? values.length :
          values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    })).sort((a, b) => b.value - a.value);
  };

  // Create pivot table for heatmap
  const createPivot = (rowCol: string, colCol: string, valueCol: string) => {
    const rowIdx = columns.indexOf(rowCol);
    const colIdx = columns.indexOf(colCol);
    const valIdx = columns.indexOf(valueCol);
    if (rowIdx === -1 || colIdx === -1) return null;

    const pivot = new Map<string, Map<string, number[]>>();
    const colValues = new Set<string>();

    for (const row of rows) {
      const r = String(row[rowIdx] || 'Unknown');
      const c = String(row[colIdx] || 'Unknown');
      const v = valIdx >= 0 && typeof row[valIdx] === 'number' ? row[valIdx] as number : 1;

      colValues.add(c);
      if (!pivot.has(r)) pivot.set(r, new Map());
      if (!pivot.get(r)!.has(c)) pivot.get(r)!.set(c, []);
      pivot.get(r)!.get(c)!.push(v);
    }

    const colLabels = Array.from(colValues).sort();
    const rowLabels = Array.from(pivot.keys()).sort();
    const matrix = rowLabels.map(r =>
      colLabels.map(c => {
        const vals = pivot.get(r)?.get(c) || [];
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      })
    );

    return { rowLabels, colLabels, matrix };
  };

  // Build aggregations
  const aggregations: any = {
    numericColumns: numericCols,
    categoricalColumns: categoricalCols,
  };

  // Primary metric - prefer named columns, fall back to first numeric
  const primaryMetric = rateCol || countCol || numericCols[0];

  // For categorical aggregations, use detected columns or fall back to any categorical
  const usableCategoricals = categoricalCols.filter((col: string) => {
    const stats = statistics?.[col];
    // Exclude columns with too many unique values (likely IDs or garbage)
    const uniqueCount = stats?.uniqueCount || stats?.uniqueValues || 0;
    return uniqueCount > 1 && uniqueCount <= 50;
  });

  // Pick best categorical columns for different purposes
  const cat1 = categoryCol || usableCategoricals[0];
  const cat2 = groupCol || geoCol || usableCategoricals[1];
  const cat3 = geoCol || sizeCol || usableCategoricals[2];
  const timeCat = timeCol || dateCols[0];

  if (primaryMetric) {
    // Primary breakdown (by first categorical)
    if (cat1) {
      aggregations.byCategory = aggregateBy(cat1, primaryMetric);
    }
    // Secondary breakdown (by second categorical)
    if (cat2 && cat2 !== cat1) {
      aggregations.byGroup = aggregateBy(cat2, primaryMetric);
    }
    // Tertiary breakdown (by third categorical)
    if (cat3 && cat3 !== cat1 && cat3 !== cat2) {
      aggregations.byGeo = aggregateBy(cat3, primaryMetric);
    }
    // Time breakdown
    if (timeCat) {
      aggregations.byTime = aggregateBy(timeCat, primaryMetric);
    }
    // Size/Age if specifically detected
    if (sizeCol && sizeCol !== cat1 && sizeCol !== cat2 && sizeCol !== cat3) {
      aggregations.bySize = aggregateBy(sizeCol, primaryMetric);
    }
    if (ageCol && ageCol !== cat1 && ageCol !== cat2 && ageCol !== cat3) {
      aggregations.byAge = aggregateBy(ageCol, primaryMetric);
    }

    // Heatmap: use first two usable categoricals
    if (cat1 && cat2 && cat1 !== cat2) {
      aggregations.categoryGroupHeatmap = createPivot(cat2, cat1, primaryMetric);
    }
    // Second heatmap option
    if (cat1 && cat3 && cat3 !== cat1 && cat3 !== cat2) {
      aggregations.categoryGeoHeatmap = createPivot(cat3, cat1, primaryMetric);
    }
  }

  // Column info for display - use actual column names
  aggregations.columnInfo = {
    primary: primaryMetric,
    category: cat1,
    group: cat2,
    geo: cat3,
    time: timeCat,
    size: sizeCol,
    age: ageCol,
  };

  return aggregations;
}

/**
 * Generate a browser-based visualization dashboard
 */
export function generateBrowserViz(
  data: DataSet,
  analysis: AnalysisResult,
  config: VizConfig = { type: "dashboard", theme: "cyberpunk" }
): string {
  const { columns, rows, types } = data;
  const { statistics, correlations, trends, outliers, summary } = analysis;

  // Intelligent aggregations
  const aggregations = aggregateData(data, analysis);

  // Sample raw data for tables (limit for performance)
  const sampleRows = rows.slice(0, 100);

  // Generate chart data
  const chartData = {
    raw: sampleRows.map((row) =>
      columns.reduce((obj, col, i) => ({ ...obj, [col]: row[i] }), {})
    ),
    columns,
    types,
    statistics,
    summary,
    aggregations,
  };

  const html = generateDashboardHTML(data.name, chartData, config);
  return html;
}

/**
 * Generate and open visualization in browser
 */
export async function openBrowserViz(
  data: DataSet,
  analysis: AnalysisResult,
  config: VizConfig = { type: "dashboard", theme: "cyberpunk" }
): Promise<string> {
  const html = generateBrowserViz(data, analysis, config);

  // Create temp directory for Kowalski visualizations
  const vizDir = join(tmpdir(), "kowalski-viz");
  try {
    mkdirSync(vizDir, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `kowalski-${data.name.replace(/[^a-z0-9]/gi, "-")}-${timestamp}.html`;
  const filepath = join(vizDir, filename);

  // Write HTML file
  writeFileSync(filepath, html, "utf-8");

  // Open in browser
  const platform = process.platform;
  let command: string;

  if (platform === "darwin") {
    command = `open "${filepath}"`;
  } else if (platform === "win32") {
    command = `start "" "${filepath}"`;
  } else {
    command = `xdg-open "${filepath}"`;
  }

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(filepath);
      }
    });
  });
}

/**
 * Generate the full HTML dashboard
 */
function generateDashboardHTML(
  title: string,
  chartData: any,
  config: VizConfig
): string {
  const theme = config.theme || "cyberpunk";
  const colors = getThemeColors(theme);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🐧 Kowalski Analysis: ${title}</title>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${colors.background};
      color: ${colors.text};
      min-height: 100vh;
      overflow-x: hidden;
    }

    .header {
      background: linear-gradient(135deg, ${colors.headerBg} 0%, ${colors.background} 100%);
      padding: 32px 48px;
      border-bottom: 1px solid ${colors.border};
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      font-size: 48px;
    }

    .header h1 {
      color: ${colors.text};
      font-size: 28px;
      font-weight: 700;
    }

    .header h1 span {
      color: ${colors.primary};
    }

    .header .subtitle {
      color: ${colors.textDim};
      font-size: 14px;
      margin-top: 4px;
    }

    .header-stats {
      display: flex;
      gap: 32px;
    }

    .header-stat {
      text-align: right;
    }

    .header-stat-value {
      color: ${colors.primary};
      font-size: 24px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .header-stat-label {
      color: ${colors.textDim};
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 32px;
    }

    .section-title {
      color: ${colors.text};
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-title::before {
      content: "";
      width: 4px;
      height: 24px;
      background: ${colors.primary};
      border-radius: 2px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }

    .grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .grid-full {
      grid-template-columns: 1fr;
    }

    .card {
      background: ${colors.cardBg};
      border: 1px solid ${colors.border};
      border-radius: 16px;
      padding: 24px;
      transition: all 0.3s ease;
    }

    .card:hover {
      border-color: ${colors.primary}50;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .card-title {
      color: ${colors.textDim};
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .chart {
      width: 100%;
      height: 320px;
    }

    .chart-large {
      height: 400px;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .insight-card {
      background: linear-gradient(135deg, ${colors.primary}10 0%, transparent 100%);
      border: 1px solid ${colors.primary}30;
      border-radius: 12px;
      padding: 20px;
    }

    .insight-icon {
      font-size: 24px;
      margin-bottom: 12px;
    }

    .insight-title {
      color: ${colors.text};
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .insight-value {
      color: ${colors.primary};
      font-size: 28px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .insight-desc {
      color: ${colors.textDim};
      font-size: 13px;
      margin-top: 8px;
    }

    .footer {
      text-align: center;
      padding: 48px;
      color: ${colors.textDim};
      font-size: 13px;
      border-top: 1px solid ${colors.border};
      margin-top: 48px;
    }

    .footer a {
      color: ${colors.primary};
      text-decoration: none;
    }

    /* Dark scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: ${colors.background};
    }

    ::-webkit-scrollbar-thumb {
      background: ${colors.border};
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${colors.textDim};
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <div class="logo">🐧</div>
      <div>
        <h1><span>Kowalski</span> Analysis</h1>
        <div class="subtitle">${title} • Generated ${new Date().toLocaleString()}</div>
      </div>
    </div>
    <div class="header-stats">
      <div class="header-stat">
        <div class="header-stat-value">${(chartData.summary?.totalRows || 0).toLocaleString()}</div>
        <div class="header-stat-label">Records</div>
      </div>
      <div class="header-stat">
        <div class="header-stat-value">${chartData.summary?.totalColumns || 0}</div>
        <div class="header-stat-label">Columns</div>
      </div>
      <div class="header-stat">
        <div class="header-stat-value">${chartData.summary?.numericColumns || 0}</div>
        <div class="header-stat-label">Metrics</div>
      </div>
    </div>
  </header>

  <main class="container">
    <!-- Key Insights -->
    <section>
      <h2 class="section-title">Key Insights</h2>
      <div class="insights-grid" id="insights"></div>
    </section>

    <!-- Primary Charts -->
    <section style="margin-top: 40px;">
      <h2 class="section-title">Analysis Overview</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title" id="chart1-title">Distribution</div>
          <div id="chart1" class="chart"></div>
        </div>
        <div class="card">
          <div class="card-title" id="chart2-title">Breakdown</div>
          <div id="chart2" class="chart"></div>
        </div>
      </div>
    </section>

    <!-- Comparison Charts -->
    <section>
      <h2 class="section-title">Detailed Breakdown</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title" id="chart3-title">By Segment</div>
          <div id="chart3" class="chart"></div>
        </div>
        <div class="card">
          <div class="card-title" id="chart4-title">Comparison</div>
          <div id="chart4" class="chart"></div>
        </div>
      </div>
    </section>

    <!-- Heatmap -->
    <section id="heatmap-section" style="display: none;">
      <h2 class="section-title">Cross-Analysis</h2>
      <div class="grid grid-full">
        <div class="card">
          <div class="card-title" id="heatmap-title">Heatmap</div>
          <div id="heatmap" class="chart chart-large"></div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    Generated by <a href="#">🐧 Kowalski Analytics</a> • "Kowalski, analysis!"
  </footer>

  <script>
    // Chart data from analysis
    const data = ${JSON.stringify(chartData)};
    const colors = ${JSON.stringify(colors)};
    const agg = data.aggregations || {};
    const colInfo = agg.columnInfo || {};

    // Plotly default layout
    const defaultLayout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Inter, sans-serif', color: colors.text, size: 12 },
      margin: { t: 20, r: 20, b: 50, l: 60 },
      xaxis: {
        gridcolor: colors.border,
        zerolinecolor: colors.border,
        tickfont: { size: 11 }
      },
      yaxis: {
        gridcolor: colors.border,
        zerolinecolor: colors.border,
        tickfont: { size: 11 }
      },
    };

    const chartColors = [
      colors.primary, '#8b5cf6', '#f59e0b', '#ef4444', '#10b981',
      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
    ];

    // Generate insights from aggregations
    function renderInsights() {
      const container = document.getElementById('insights');
      const insights = [];

      if (agg.byCategory?.length > 0) {
        const top = agg.byCategory[0];
        const metricName = colInfo.primary || 'Value';
        insights.push({
          icon: '🏆',
          title: 'Top ' + (colInfo.category || 'Category'),
          value: top.label,
          desc: 'Average ' + metricName + ': ' + top.value.toFixed(1)
        });
      }

      if (agg.byGroup?.length > 0) {
        const top = agg.byGroup[0];
        insights.push({
          icon: '📊',
          title: 'Leading ' + (colInfo.group || 'Segment'),
          value: top.label,
          desc: top.value.toFixed(1) + ' average'
        });
      }

      if (agg.byGeo?.length > 0) {
        const top = agg.byGeo[0];
        insights.push({
          icon: '🌍',
          title: 'Top ' + (colInfo.geo || 'Region'),
          value: top.label,
          desc: top.count.toLocaleString() + ' records'
        });
      }

      if (agg.byTime?.length > 1) {
        const sorted = [...agg.byTime].sort((a, b) => String(a.label).localeCompare(String(b.label)));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const change = ((last.value - first.value) / first.value * 100);
        insights.push({
          icon: change >= 0 ? '📈' : '📉',
          title: 'Trend',
          value: (change >= 0 ? '+' : '') + change.toFixed(1) + '%',
          desc: first.label + ' to ' + last.label
        });
      }

      if (agg.bySize?.length > 0) {
        const top = agg.bySize[0];
        insights.push({
          icon: '🏢',
          title: 'Dominant Size',
          value: top.label,
          desc: top.value.toFixed(1) + ' average'
        });
      }

      if (insights.length === 0) {
        insights.push({
          icon: '📊',
          title: 'Total Records',
          value: (data.summary?.totalRows || 0).toLocaleString(),
          desc: data.columns?.length + ' columns analyzed'
        });
      }

      container.innerHTML = insights.slice(0, 4).map(i => \`
        <div class="insight-card">
          <div class="insight-icon">\${i.icon}</div>
          <div class="insight-title">\${i.title}</div>
          <div class="insight-value">\${i.value}</div>
          <div class="insight-desc">\${i.desc}</div>
        </div>
      \`).join('');
    }

    // Chart 1: Primary category breakdown (bar)
    function renderChart1() {
      const aggData = agg.byCategory || agg.byGroup || agg.byGeo;
      if (!aggData?.length) {
        document.getElementById('chart1').innerHTML = '<p style="color: ' + colors.textDim + '; text-align: center; padding: 40px;">No categorical data available</p>';
        return;
      }

      const title = colInfo.category ? 'By ' + colInfo.category : (colInfo.group ? 'By ' + colInfo.group : 'By Category');
      document.getElementById('chart1-title').textContent = title;

      const items = aggData.slice(0, 10);
      Plotly.newPlot('chart1', [{
        x: items.map(d => d.label),
        y: items.map(d => d.value),
        type: 'bar',
        marker: {
          color: items.map((_, i) => chartColors[i % chartColors.length]),
          line: { width: 0 }
        },
        hovertemplate: '%{x}<br>%{y:.2f}<extra></extra>'
      }], {
        ...defaultLayout,
        xaxis: { ...defaultLayout.xaxis, tickangle: -30 },
        yaxis: { ...defaultLayout.yaxis, title: colInfo.primary || 'Value' },
        bargap: 0.3,
      }, { responsive: true });
    }

    // Chart 2: Secondary breakdown (horizontal bar)
    function renderChart2() {
      const aggData = agg.byGroup || agg.byGeo || agg.bySize;
      if (!aggData?.length) {
        document.getElementById('chart2').innerHTML = '<p style="color: ' + colors.textDim + '; text-align: center; padding: 40px;">No group data available</p>';
        return;
      }

      const title = colInfo.group ? 'By ' + colInfo.group : (colInfo.geo ? 'By ' + colInfo.geo : 'By Segment');
      document.getElementById('chart2-title').textContent = title;

      const items = aggData.slice(0, 10).reverse();
      Plotly.newPlot('chart2', [{
        y: items.map(d => d.label),
        x: items.map(d => d.value),
        type: 'bar',
        orientation: 'h',
        marker: {
          color: colors.primary,
          line: { width: 0 }
        },
        hovertemplate: '%{y}<br>%{x:.2f}<extra></extra>'
      }], {
        ...defaultLayout,
        xaxis: { ...defaultLayout.xaxis, title: colInfo.primary || 'Value' },
        margin: { ...defaultLayout.margin, l: 120 },
        bargap: 0.3,
      }, { responsive: true });
    }

    // Chart 3: Geographic or Size breakdown
    function renderChart3() {
      const aggData = agg.byGeo || agg.bySize || agg.byAge;
      if (!aggData?.length) {
        document.getElementById('chart3').innerHTML = '<p style="color: ' + colors.textDim + '; text-align: center; padding: 40px;">No segment data available</p>';
        return;
      }

      const title = colInfo.geo ? 'By ' + colInfo.geo : (colInfo.size ? 'By ' + colInfo.size : 'By Segment');
      document.getElementById('chart3-title').textContent = title;

      const items = aggData.slice(0, 8);
      Plotly.newPlot('chart3', [{
        labels: items.map(d => d.label),
        values: items.map(d => d.value),
        type: 'pie',
        hole: 0.5,
        marker: {
          colors: chartColors.slice(0, items.length),
          line: { color: colors.background, width: 2 }
        },
        textinfo: 'label+percent',
        textposition: 'outside',
        textfont: { color: colors.text, size: 11 },
        hovertemplate: '%{label}<br>%{value:.2f}<br>%{percent}<extra></extra>'
      }], {
        ...defaultLayout,
        showlegend: false,
        margin: { t: 40, r: 40, b: 40, l: 40 },
      }, { responsive: true });
    }

    // Chart 4: Time or Age breakdown
    function renderChart4() {
      const aggData = agg.byTime || agg.byAge || agg.bySize;
      if (!aggData?.length) {
        document.getElementById('chart4').innerHTML = '<p style="color: ' + colors.textDim + '; text-align: center; padding: 40px;">No time/demographic data available</p>';
        return;
      }

      const title = colInfo.time ? 'By ' + colInfo.time : (colInfo.age ? 'By ' + colInfo.age : 'Comparison');
      document.getElementById('chart4-title').textContent = title;

      // Sort if it looks like time/age data
      let items = [...aggData];
      if (colInfo.time || colInfo.age) {
        items.sort((a, b) => String(a.label).localeCompare(String(b.label)));
      }
      items = items.slice(0, 10);

      Plotly.newPlot('chart4', [{
        x: items.map(d => d.label),
        y: items.map(d => d.value),
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: colors.primary, width: 3 },
        marker: { color: colors.primary, size: 10 },
        fill: 'tozeroy',
        fillcolor: colors.primary + '20',
        hovertemplate: '%{x}<br>%{y:.2f}<extra></extra>'
      }], {
        ...defaultLayout,
        yaxis: { ...defaultLayout.yaxis, title: colInfo.primary || 'Value' },
      }, { responsive: true });
    }

    // Heatmap
    function renderHeatmap() {
      const heatmapData = agg.categoryGroupHeatmap || agg.categoryGeoHeatmap;
      if (!heatmapData || !heatmapData.matrix || heatmapData.matrix.length === 0) return;

      document.getElementById('heatmap-section').style.display = 'block';

      const title = agg.categoryGroupHeatmap
        ? (colInfo.category || 'Category') + ' vs ' + (colInfo.group || 'Group')
        : (colInfo.category || 'Category') + ' vs ' + (colInfo.geo || 'Region');
      document.getElementById('heatmap-title').textContent = title;

      // Calculate min/max for better color scaling
      const allValues = heatmapData.matrix.flat();
      const minVal = Math.min(...allValues);
      const maxVal = Math.max(...allValues);
      const range = maxVal - minVal;

      // Use zauto: false with zmin/zmax for better contrast when values are similar
      Plotly.newPlot('heatmap', [{
        z: heatmapData.matrix,
        x: heatmapData.colLabels,
        y: heatmapData.rowLabels,
        type: 'heatmap',
        colorscale: 'Viridis',
        zauto: false,
        zmin: range < 5 ? minVal - 5 : minVal,
        zmax: range < 5 ? maxVal + 5 : maxVal,
        hovertemplate: '%{y}<br>%{x}<br>Value: %{z:.2f}<extra></extra>',
        colorbar: {
          title: colInfo.primary || 'Value',
          titlefont: { color: colors.text },
          tickfont: { color: colors.textDim }
        }
      }], {
        ...defaultLayout,
        margin: { ...defaultLayout.margin, l: 140, b: 100 },
        xaxis: { ...defaultLayout.xaxis, tickangle: -45, type: 'category' },
        yaxis: { ...defaultLayout.yaxis, type: 'category' },
      }, { responsive: true });
    }

    // Initialize all charts
    renderInsights();
    renderChart1();
    renderChart2();
    renderChart3();
    renderChart4();
    renderHeatmap();
  </script>
</body>
</html>`;
}

/**
 * Get theme colors
 */
function getThemeColors(theme: "dark" | "light" | "cyberpunk") {
  const themes = {
    cyberpunk: {
      background: "#0f0f1a",
      headerBg: "#151528",
      cardBg: "#1a1a2e",
      border: "#2a2a45",
      text: "#ffffff",
      textDim: "#8888aa",
      primary: "#00d4aa",
      secondary: "#a855f7",
      positive: "#10b981",
      negative: "#ef4444",
      warning: "#f59e0b",
    },
    dark: {
      background: "#111827",
      headerBg: "#1f2937",
      cardBg: "#1f2937",
      border: "#374151",
      text: "#f9fafb",
      textDim: "#9ca3af",
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      positive: "#10b981",
      negative: "#ef4444",
      warning: "#f59e0b",
    },
    light: {
      background: "#f8fafc",
      headerBg: "#ffffff",
      cardBg: "#ffffff",
      border: "#e2e8f0",
      text: "#0f172a",
      textDim: "#64748b",
      primary: "#0ea5e9",
      secondary: "#8b5cf6",
      positive: "#10b981",
      negative: "#ef4444",
      warning: "#f59e0b",
    },
  };

  return themes[theme];
}
