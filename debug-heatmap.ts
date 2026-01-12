// Debug heatmap generation
import { readFileSync } from "fs";
import { parseCSV, analyzeDataSet } from "./src/canvases/analytics/index";

// Recreate the aggregation logic
function debugAggregations(data: any) {
  const { columns, rows, types } = data;

  const numericCols = columns.filter((_: any, i: number) => types?.[i] === "number");
  const categoricalCols = columns.filter((_: any, i: number) => types?.[i] !== "number" && types?.[i] !== "date");

  const findColumn = (patterns: string[]) => {
    return columns.find((col: string) =>
      patterns.some(p => col.toLowerCase().includes(p.toLowerCase()))
    );
  };

  const rateCol = findColumn(['rate', 'percentage', 'percent', 'adoption', 'score']);
  const countCol = findColumn(['users', 'count', 'visits', 'views', 'sales', 'revenue']);
  const categoryCol = findColumn(['tool', 'product', 'type', 'category', 'name']);
  const groupCol = findColumn(['industry', 'sector', 'department', 'vertical']);
  const geoCol = findColumn(['country', 'region', 'state', 'city', 'location']);

  console.log("=== Column Detection ===");
  console.log("Columns:", columns);
  console.log("Types:", types);
  console.log("");
  console.log("rateCol:", rateCol);
  console.log("countCol:", countCol);
  console.log("categoryCol:", categoryCol);
  console.log("groupCol:", groupCol);
  console.log("geoCol:", geoCol);

  const primaryMetric = rateCol || countCol || numericCols[0];
  console.log("primaryMetric:", primaryMetric);
  console.log("");

  // Test pivot creation
  if (categoryCol && groupCol && primaryMetric) {
    console.log("=== Creating Heatmap: industry vs ai_tool ===");
    console.log(`createPivot(${groupCol}, ${categoryCol}, ${primaryMetric})`);

    const rowIdx = columns.indexOf(groupCol);
    const colIdx = columns.indexOf(categoryCol);
    const valIdx = columns.indexOf(primaryMetric);

    console.log(`rowIdx (${groupCol}):`, rowIdx);
    console.log(`colIdx (${categoryCol}):`, colIdx);
    console.log(`valIdx (${primaryMetric}):`, valIdx);

    if (rowIdx >= 0 && colIdx >= 0) {
      const pivot = new Map<string, Map<string, number[]>>();
      const colValues = new Set<string>();

      // Sample first 1000 rows
      for (const row of rows.slice(0, 1000)) {
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

      console.log("");
      console.log("colLabels:", colLabels);
      console.log("rowLabels:", rowLabels);

      const matrix = rowLabels.map(r =>
        colLabels.map(c => {
          const vals = pivot.get(r)?.get(c) || [];
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        })
      );

      console.log("");
      console.log("Matrix (first 3 rows):");
      matrix.slice(0, 3).forEach((row, i) => {
        console.log(`  ${rowLabels[i]}: [${row.map(v => v.toFixed(1)).join(', ')}]`);
      });

      console.log("");
      console.log("Heatmap data structure:");
      console.log({
        rowLabels: rowLabels.length,
        colLabels: colLabels.length,
        matrixSize: `${matrix.length}x${matrix[0]?.length || 0}`,
      });
    }
  } else {
    console.log("Missing columns for heatmap:");
    console.log("  categoryCol:", categoryCol);
    console.log("  groupCol:", groupCol);
    console.log("  primaryMetric:", primaryMetric);
  }
}

const filename = process.argv[2] || "ai_adoption_dataset.csv";
const csvContent = readFileSync(`./sample_data/${filename}`, "utf-8");
const data = parseCSV(csvContent, { name: filename });

debugAggregations(data);
