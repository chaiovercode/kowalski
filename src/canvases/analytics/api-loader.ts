// API and MCP Data Loader for Kowalski Analytics
// "Establishing secure data link, Skipper." - Kowalski

import type { DataSet } from "./types";
import { parseJSON } from "./data-loader";

/**
 * API authentication configuration
 */
export interface APIAuthConfig {
  type: "bearer" | "api-key" | "basic" | "none";
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
}

/**
 * API request configuration
 */
export interface APIRequestConfig {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  auth?: APIAuthConfig;
  arrayPath?: string;
  timeout?: number;
}

/**
 * API response result
 */
export interface APIResult {
  success: boolean;
  data?: DataSet;
  error?: string;
  statusCode?: number;
  responseTime?: number;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  type: "offset" | "cursor" | "page";
  limitParam?: string;
  offsetParam?: string;
  cursorParam?: string;
  pageParam?: string;
  limit?: number;
  maxPages?: number;
  cursorPath?: string;
  totalPath?: string;
}

/**
 * Fetch data from a REST API endpoint
 */
export async function fetchFromAPI(config: APIRequestConfig): Promise<APIResult> {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    auth,
    arrayPath,
    timeout = 30000,
  } = config;

  const startTime = Date.now();

  try {
    // Build headers with authentication
    const requestHeaders: Record<string, string> = {
      "Accept": "application/json",
      ...headers,
    };

    // Apply authentication
    if (auth) {
      switch (auth.type) {
        case "bearer":
          if (auth.token) {
            requestHeaders["Authorization"] = `Bearer ${auth.token}`;
          }
          break;
        case "api-key":
          if (auth.apiKey) {
            const headerName = auth.apiKeyHeader || "X-API-Key";
            requestHeaders[headerName] = auth.apiKey;
          }
          break;
        case "basic":
          if (auth.username && auth.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
            requestHeaders["Authorization"] = `Basic ${credentials}`;
          }
          break;
      }
    }

    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    };

    if (body && method === "POST") {
      requestHeaders["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(url, requestOptions);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        responseTime,
      };
    }

    // Parse response
    const text = await response.text();
    const dataSet = parseJSON(text, {
      name: extractNameFromURL(url),
      arrayPath,
    });

    return {
      success: true,
      data: dataSet,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      error: message,
      responseTime,
    };
  }
}

/**
 * Fetch data with pagination support
 */
export async function fetchPaginated(
  config: APIRequestConfig,
  pagination: PaginationConfig
): Promise<APIResult> {
  const {
    type,
    limitParam = "limit",
    offsetParam = "offset",
    cursorParam = "cursor",
    pageParam = "page",
    limit = 100,
    maxPages = 10,
    cursorPath,
    totalPath,
  } = pagination;

  const allRows: (string | number | null)[][] = [];
  let columns: string[] = [];
  let types: ("string" | "number" | "date")[] = [];
  let totalResponseTime = 0;
  let cursor: string | undefined;
  let page = 1;
  let offset = 0;

  for (let i = 0; i < maxPages; i++) {
    // Build URL with pagination params
    const url = new URL(config.url);
    url.searchParams.set(limitParam, String(limit));

    switch (type) {
      case "offset":
        url.searchParams.set(offsetParam, String(offset));
        break;
      case "cursor":
        if (cursor) {
          url.searchParams.set(cursorParam, cursor);
        }
        break;
      case "page":
        url.searchParams.set(pageParam, String(page));
        break;
    }

    const result = await fetchFromAPI({
      ...config,
      url: url.toString(),
    });

    totalResponseTime += result.responseTime || 0;

    if (!result.success || !result.data) {
      if (allRows.length > 0) {
        // Return what we have so far
        break;
      }
      return result;
    }

    // Store columns from first response
    if (i === 0) {
      columns = result.data.columns;
      types = result.data.types;
    }

    // Add rows
    allRows.push(...result.data.rows);

    // Check if we should continue
    if (result.data.rows.length < limit) {
      break; // Last page
    }

    // Update pagination state
    switch (type) {
      case "offset":
        offset += limit;
        break;
      case "cursor":
        if (cursorPath) {
          // Would need to parse cursor from response
          // For now, stop if cursor not provided
          break;
        }
        break;
      case "page":
        page++;
        break;
    }
  }

  return {
    success: true,
    data: {
      name: extractNameFromURL(config.url),
      columns,
      rows: allRows,
      types,
    },
    responseTime: totalResponseTime,
  };
}

/**
 * Fetch from MCP query result
 * MCP results come as arrays of objects from tool responses
 */
export function parseFromMCPResult(
  mcpResult: unknown,
  name: string = "mcp-query"
): DataSet {
  // MCP results can be in various formats
  if (!mcpResult) {
    return { name, columns: [], rows: [], types: [] };
  }

  // If it's already an array of objects
  if (Array.isArray(mcpResult)) {
    const array = mcpResult as Record<string, unknown>[];
    if (array.length === 0) {
      return { name, columns: [], rows: [], types: [] };
    }

    const columns = Object.keys(array[0] || {});
    const rows = array.map((item) =>
      columns.map((col) => {
        const val = item[col];
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        if (typeof val === "boolean") return val ? 1 : 0;
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      })
    );

    const types = inferTypesFromRows(columns, rows);

    return { name, columns, rows, types };
  }

  // If it's an object with a results/data/items array
  if (typeof mcpResult === "object") {
    const obj = mcpResult as Record<string, unknown>;
    const possibleArrayKeys = ["results", "data", "items", "rows", "records"];

    for (const key of possibleArrayKeys) {
      if (Array.isArray(obj[key])) {
        return parseFromMCPResult(obj[key], name);
      }
    }

    // Single object - wrap in array
    return parseFromMCPResult([mcpResult], name);
  }

  // String - try to parse as JSON
  if (typeof mcpResult === "string") {
    try {
      const parsed = JSON.parse(mcpResult);
      return parseFromMCPResult(parsed, name);
    } catch {
      // Not JSON, return as single cell
      return {
        name,
        columns: ["value"],
        rows: [[mcpResult]],
        types: ["string"],
      };
    }
  }

  // Primitive - wrap as single value
  return {
    name,
    columns: ["value"],
    rows: [[mcpResult as string | number | null]],
    types: [typeof mcpResult === "number" ? "number" : "string"],
  };
}

/**
 * Get authentication from environment variables
 */
export function getAuthFromEnv(prefix: string = ""): APIAuthConfig | undefined {
  const bearerToken = process.env[`${prefix}BEARER_TOKEN`] || process.env[`${prefix}TOKEN`];
  if (bearerToken) {
    return { type: "bearer", token: bearerToken };
  }

  const apiKey = process.env[`${prefix}API_KEY`];
  if (apiKey) {
    const apiKeyHeader = process.env[`${prefix}API_KEY_HEADER`];
    return { type: "api-key", apiKey, apiKeyHeader };
  }

  const username = process.env[`${prefix}USERNAME`];
  const password = process.env[`${prefix}PASSWORD`];
  if (username && password) {
    return { type: "basic", username, password };
  }

  return undefined;
}

/**
 * Extract a meaningful name from URL
 */
function extractNameFromURL(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || "api-data";
    return lastPart.replace(/\.[^.]+$/, "") + ".json";
  } catch {
    return "api-data.json";
  }
}

/**
 * Infer column types from rows
 */
function inferTypesFromRows(
  columns: string[],
  rows: (string | number | null)[][]
): ("string" | "number" | "date")[] {
  const types: ("string" | "number" | "date")[] = [];

  for (let i = 0; i < columns.length; i++) {
    let numberCount = 0;
    let dateCount = 0;
    let total = 0;

    for (const row of rows) {
      const val = row[i];
      if (val === null) continue;

      total++;

      if (typeof val === "number") {
        numberCount++;
      } else if (typeof val === "string") {
        if (isDateString(val)) {
          dateCount++;
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
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{2}-\d{2}-\d{4}/,
    /^\w{3}\s+\d{1,2},?\s+\d{4}/,
  ];

  return datePatterns.some((pattern) => pattern.test(val));
}
