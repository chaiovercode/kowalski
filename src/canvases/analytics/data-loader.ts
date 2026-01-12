// Data Loading Utilities for Kowalski Analytics
// Handles CSV and JSON parsing

import type { DataSet } from "./types";

/**
 * Parse CSV string into DataSet
 */
export function parseCSV(content: string, options?: {
  delimiter?: string;
  hasHeader?: boolean;
  name?: string;
}): DataSet {
  const { delimiter = ",", hasHeader = true, name = "data.csv" } = options || {};

  // Robust CSV parser that handles newlines inside quotes
  const parsedRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') i++;

      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some(c => c.length > 0)) {
        parsedRows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Handle last row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some(c => c.length > 0)) {
      parsedRows.push(currentRow);
    }
  }

  const columns = hasHeader && parsedRows.length > 0 ? parsedRows[0] : [];
  const dataLines = hasHeader ? parsedRows.slice(1) : parsedRows;

  // If no header, generate column names
  if (!hasHeader && dataLines.length > 0) {
    const width = dataLines[0].length;
    for (let i = 0; i < width; i++) {
      columns.push(`Column ${i + 1}`);
    }
  }

  // Parse rows
  const rows: (string | number | null)[][] = [];
  for (const values of dataLines) {
    const row: (string | number | null)[] = values.map((val) => {
      if (val === "" || val.toLowerCase() === "null" || val.toLowerCase() === "na") {
        return null;
      }
      const num = Number(val);
      return isNaN(num) ? val : num;
    });
    rows.push(row);
  }

  // Infer types
  const types = inferColumnTypes(columns, rows);

  return { name, columns, rows, types };
}

/**
 * Parse JSON into DataSet
 */
export function parseJSON(content: string, options?: {
  name?: string;
  arrayPath?: string;
}): DataSet {
  const { name = "data.json", arrayPath } = options || {};

  const data = JSON.parse(content);

  // Find the array to convert
  let array: Record<string, unknown>[];

  if (Array.isArray(data)) {
    array = data;
  } else if (arrayPath) {
    const pathParts = arrayPath.split(".");
    let current: unknown = data;
    for (const part of pathParts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        throw new Error(`Path ${arrayPath} not found in JSON`);
      }
    }
    if (!Array.isArray(current)) {
      throw new Error(`Path ${arrayPath} is not an array`);
    }
    array = current as Record<string, unknown>[];
  } else {
    // Try to find first array in object
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        array = value as Record<string, unknown>[];
        break;
      }
    }
    if (!array!) {
      throw new Error("No array found in JSON. Specify arrayPath option.");
    }
  }

  if (array.length === 0) {
    return { name, columns: [], rows: [], types: [] };
  }

  // Extract columns from first object
  const columns = Object.keys(array[0] || {});

  // Convert to rows
  const rows: (string | number | null)[][] = array.map((item) =>
    columns.map((col) => {
      const val = item[col];
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      if (typeof val === "boolean") return val ? 1 : 0;
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })
  );

  const types = inferColumnTypes(columns, rows);

  return { name, columns, rows, types };
}

/**
 * Infer column types from data
 */
function inferColumnTypes(
  columns: string[],
  rows: (string | number | null)[][]
): ("string" | "number" | "date")[] {
  const types: ("string" | "number" | "date")[] = [];

  for (let i = 0; i < columns.length; i++) {
    let numberCount = 0;
    let dateCount = 0;
    let stringCount = 0;
    let total = 0;

    for (const row of rows) {
      const val = row[i];
      if (val === null) continue;

      total++;

      if (typeof val === "number") {
        numberCount++;
      } else if (typeof val === "string") {
        // Check if it looks like a date
        if (isDateString(val)) {
          dateCount++;
        } else {
          stringCount++;
        }
      }
    }

    if (total === 0) {
      types.push("string");
    } else if (numberCount / total > 0.8) {
      types.push("number");
    } else if (dateCount / total > 0.8) {
      types.push("date");
    } else {
      types.push("string");
    }
  }

  return types;
}

/**
 * Check if string looks like a date
 */
function isDateString(val: string): boolean {
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO date
    /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}/, // MM-DD-YYYY
    /^\w{3}\s+\d{1,2},?\s+\d{4}/, // Mon DD, YYYY
  ];

  return datePatterns.some((pattern) => pattern.test(val));
}

/**
 * Auto-detect file format and parse
 */
export function parseData(
  content: string,
  filename: string
): DataSet {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    return parseJSON(content, { name: filename });
  } else if (ext === "csv" || ext === "tsv") {
    const delimiter = ext === "tsv" ? "\t" : ",";
    return parseCSV(content, { delimiter, name: filename });
  } else {
    // Try to auto-detect
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return parseJSON(content, { name: filename });
    } else {
      return parseCSV(content, { name: filename });
    }
  }
}

/**
 * Sample large datasets
 */
export function sampleDataSet(data: DataSet, maxRows: number = 1000): DataSet {
  if (data.rows.length <= maxRows) {
    return data;
  }

  // Random sampling
  const step = Math.ceil(data.rows.length / maxRows);
  const sampledRows = data.rows.filter((_, i) => i % step === 0).slice(0, maxRows);

  return {
    ...data,
    rows: sampledRows,
  };
}

/**
 * Get column values as array
 */
export function getColumnValues(data: DataSet, columnIndex: number): (string | number | null)[] {
  return data.rows.map((row) => row[columnIndex]);
}

/**
 * Get numeric column values (filtered)
 */
export function getNumericColumnValues(data: DataSet, columnIndex: number): number[] {
  return data.rows
    .map((row) => row[columnIndex])
    .filter((val): val is number => typeof val === "number");
}
