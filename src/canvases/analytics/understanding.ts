// Data Understanding Engine for Kowalski Analytics
// "Skipper, I've analyzed the intel. Here's what we're dealing with."
//
// Implements REF: DU-001 (Schema Inference with confidence)
// See specs/README.md Section 3.2.1

import type { DataSet } from "./types";

/**
 * Basic column types
 */
export type BasicType = "string" | "number" | "date" | "boolean" | "null";

/**
 * Semantic types - what the data represents
 */
export type SemanticType =
  | "percentage"    // 0-100 or 0-1 range, possibly with % suffix
  | "currency"      // $ prefix, common monetary amounts
  | "count"         // Integer, positive, usually whole numbers
  | "rate"          // Decimal 0-1 range (conversion rate, probability)
  | "id"            // Unique identifier - sequential, UUID, or hash
  | "boolean"       // true/false, yes/no, 1/0, Y/N
  | "categorical"   // Limited set of repeated values
  | "text"          // Free-form text
  | "date"          // Date/datetime values
  | "timestamp"     // Unix timestamp
  | "email"         // Email address pattern
  | "phone"         // Phone number pattern
  | "url"           // URL pattern
  | "unknown";      // Could not determine

/**
 * Confidence score for an inference (0-100)
 */
export interface ConfidenceScore {
  value: number;        // 0-100
  level: "high" | "medium" | "low" | "very_low";
  reasons: string[];    // Why this confidence level
}

/**
 * Column type inference result with confidence
 */
export interface ColumnTypeInference {
  column: string;
  basicType: BasicType;
  basicTypeConfidence: ConfidenceScore;
  semanticType: SemanticType;
  semanticTypeConfidence: ConfidenceScore;
  alternatives: Array<{
    type: SemanticType;
    confidence: number;
  }>;
  sampleValues: (string | number | null)[];
  statistics: {
    totalCount: number;
    nullCount: number;
    uniqueCount: number;
    numericCount: number;
    stringCount: number;
  };
}

/**
 * Full schema inference result
 */
export interface SchemaInference {
  columns: ColumnTypeInference[];
  overallConfidence: ConfidenceScore;
  suggestedQuestions: ClarifyingQuestion[];
}

/**
 * Clarifying question when confidence is low
 */
export interface ClarifyingQuestion {
  column: string;
  question: string;
  options: string[];
  reason: string;
  confidence: number;
}

// Confidence thresholds (from spec Section 5.5)
const CONFIDENCE_THRESHOLDS = {
  AUTO_PROCEED: 90,      // >= 90%: Proceed automatically
  NOTE_UNCERTAINTY: 70,  // 70-89%: Note uncertainty, proceed
  ASK_QUESTION: 50,      // 50-69%: Ask clarifying question
  REQUIRE_INPUT: 0,      // < 50%: Require user input
};

/**
 * Get confidence level from numeric value
 */
function getConfidenceLevel(value: number): "high" | "medium" | "low" | "very_low" {
  if (value >= CONFIDENCE_THRESHOLDS.AUTO_PROCEED) return "high";
  if (value >= CONFIDENCE_THRESHOLDS.NOTE_UNCERTAINTY) return "medium";
  if (value >= CONFIDENCE_THRESHOLDS.ASK_QUESTION) return "low";
  return "very_low";
}

/**
 * Create a confidence score
 */
function createConfidence(value: number, reasons: string[]): ConfidenceScore {
  return {
    value: Math.min(100, Math.max(0, value)),
    level: getConfidenceLevel(value),
    reasons,
  };
}

// Pattern matchers for semantic types
const PATTERNS = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\(\)\+\.]{7,20}$/,
  url: /^https?:\/\/[^\s]+$/i,
  currency: /^\$[\d,]+\.?\d*$|^[\d,]+\.?\d*\s*(?:USD|EUR|GBP|JPY)$/i,
  percentage: /^[\d.]+%$/,
  date_iso: /^\d{4}-\d{2}-\d{2}/,
  date_us: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  date_eu: /^\d{1,2}-\d{1,2}-\d{2,4}$/,
  timestamp: /^\d{10,13}$/,  // Unix timestamp (seconds or milliseconds)
};

const BOOLEAN_VALUES = new Set([
  "true", "false", "yes", "no", "y", "n", "1", "0",
  "on", "off", "enabled", "disabled", "active", "inactive"
]);

/**
 * Infer schema for a dataset with confidence scores
 */
export function inferSchema(data: DataSet): SchemaInference {
  const { columns, rows } = data;
  const columnInferences: ColumnTypeInference[] = [];
  const suggestedQuestions: ClarifyingQuestion[] = [];

  for (let i = 0; i < columns.length; i++) {
    const colName = columns[i];
    const values = rows.map(row => row[i]);

    const inference = inferColumnType(colName, values, rows.length);
    columnInferences.push(inference);

    // Generate clarifying questions for low confidence
    if (inference.semanticTypeConfidence.level === "low" ||
        inference.semanticTypeConfidence.level === "very_low") {
      const question = generateClarifyingQuestion(inference);
      if (question) {
        suggestedQuestions.push(question);
      }
    }
  }

  // Calculate overall confidence
  const avgConfidence = columnInferences.reduce(
    (sum, col) => sum + col.semanticTypeConfidence.value, 0
  ) / columnInferences.length;

  const lowConfidenceCols = columnInferences.filter(
    col => col.semanticTypeConfidence.level === "low" ||
           col.semanticTypeConfidence.level === "very_low"
  );

  const overallReasons: string[] = [];
  if (lowConfidenceCols.length === 0) {
    overallReasons.push("All columns have high or medium confidence inference");
  } else {
    overallReasons.push(`${lowConfidenceCols.length} column(s) have low confidence`);
  }

  return {
    columns: columnInferences,
    overallConfidence: createConfidence(avgConfidence, overallReasons),
    suggestedQuestions,
  };
}

/**
 * Infer type for a single column
 */
function inferColumnType(
  columnName: string,
  values: (string | number | null)[],
  totalRows: number
): ColumnTypeInference {
  // Collect statistics
  let nullCount = 0;
  let numericCount = 0;
  let stringCount = 0;
  const uniqueValues = new Set<string>();
  const sampleValues: (string | number | null)[] = [];

  for (const val of values) {
    if (val === null) {
      nullCount++;
    } else if (typeof val === "number") {
      numericCount++;
      uniqueValues.add(String(val));
    } else {
      stringCount++;
      uniqueValues.add(val);
    }

    // Collect sample values (up to 10)
    if (sampleValues.length < 10 && val !== null) {
      sampleValues.push(val);
    }
  }

  const nonNullCount = values.length - nullCount;
  const uniqueCount = uniqueValues.size;

  // Determine basic type
  const { basicType, basicConfidence } = inferBasicType(
    numericCount, stringCount, nullCount, values.length, values
  );

  // Determine semantic type
  const { semanticType, confidence, alternatives } = inferSemanticType(
    columnName, values, basicType, uniqueCount, nonNullCount
  );

  return {
    column: columnName,
    basicType,
    basicTypeConfidence: basicConfidence,
    semanticType,
    semanticTypeConfidence: confidence,
    alternatives,
    sampleValues,
    statistics: {
      totalCount: values.length,
      nullCount,
      uniqueCount,
      numericCount,
      stringCount,
    },
  };
}

/**
 * Infer basic type (string, number, date, boolean)
 */
function inferBasicType(
  numericCount: number,
  stringCount: number,
  nullCount: number,
  totalCount: number,
  values: (string | number | null)[]
): { basicType: BasicType; basicConfidence: ConfidenceScore } {
  const nonNullCount = totalCount - nullCount;

  if (nonNullCount === 0) {
    return {
      basicType: "null",
      basicConfidence: createConfidence(100, ["All values are null"]),
    };
  }

  const numericRatio = numericCount / nonNullCount;
  const stringRatio = stringCount / nonNullCount;

  // Check for boolean values
  const booleanCount = values.filter(v =>
    v !== null && BOOLEAN_VALUES.has(String(v).toLowerCase())
  ).length;
  const booleanRatio = booleanCount / nonNullCount;

  if (booleanRatio > 0.9) {
    return {
      basicType: "boolean",
      basicConfidence: createConfidence(
        Math.round(booleanRatio * 100),
        [`${Math.round(booleanRatio * 100)}% of values are boolean-like`]
      ),
    };
  }

  // Check for dates
  const dateCount = values.filter(v => v !== null && isDateValue(v)).length;
  const dateRatio = dateCount / nonNullCount;

  if (dateRatio > 0.8) {
    return {
      basicType: "date",
      basicConfidence: createConfidence(
        Math.round(dateRatio * 100),
        [`${Math.round(dateRatio * 100)}% of values match date patterns`]
      ),
    };
  }

  // Number vs string
  if (numericRatio > 0.8) {
    const reasons = [`${Math.round(numericRatio * 100)}% of values are numeric`];
    if (stringRatio > 0) {
      reasons.push(`${Math.round(stringRatio * 100)}% are strings (possibly mixed data)`);
    }
    return {
      basicType: "number",
      basicConfidence: createConfidence(Math.round(numericRatio * 100), reasons),
    };
  }

  if (stringRatio > 0.8) {
    return {
      basicType: "string",
      basicConfidence: createConfidence(
        Math.round(stringRatio * 100),
        [`${Math.round(stringRatio * 100)}% of values are strings`]
      ),
    };
  }

  // Mixed - default to string with lower confidence
  return {
    basicType: "string",
    basicConfidence: createConfidence(50, [
      "Mixed data types detected",
      `${Math.round(numericRatio * 100)}% numeric, ${Math.round(stringRatio * 100)}% string`,
    ]),
  };
}

/**
 * Check if a value looks like a date
 */
function isDateValue(value: string | number | null): boolean {
  if (value === null) return false;
  const str = String(value);
  return (
    PATTERNS.date_iso.test(str) ||
    PATTERNS.date_us.test(str) ||
    PATTERNS.date_eu.test(str)
  );
}

/**
 * Infer semantic type with confidence
 */
function inferSemanticType(
  columnName: string,
  values: (string | number | null)[],
  basicType: BasicType,
  uniqueCount: number,
  nonNullCount: number
): {
  semanticType: SemanticType;
  confidence: ConfidenceScore;
  alternatives: Array<{ type: SemanticType; confidence: number }>;
} {
  const alternatives: Array<{ type: SemanticType; confidence: number }> = [];
  const nameLower = columnName.toLowerCase();

  // Get non-null values for analysis
  const nonNullValues = values.filter((v): v is string | number => v !== null);

  // === ID detection ===
  const idScore = scoreIdType(nameLower, nonNullValues, uniqueCount, nonNullCount);
  if (idScore > 0) alternatives.push({ type: "id", confidence: idScore });

  // === Boolean detection ===
  const boolScore = scoreBooleanType(nonNullValues);
  if (boolScore > 0) alternatives.push({ type: "boolean", confidence: boolScore });

  // === Percentage detection ===
  const percentScore = scorePercentageType(nameLower, nonNullValues, basicType);
  if (percentScore > 0) alternatives.push({ type: "percentage", confidence: percentScore });

  // === Currency detection ===
  const currencyScore = scoreCurrencyType(nameLower, nonNullValues);
  if (currencyScore > 0) alternatives.push({ type: "currency", confidence: currencyScore });

  // === Count detection ===
  const countScore = scoreCountType(nameLower, nonNullValues, basicType);
  if (countScore > 0) alternatives.push({ type: "count", confidence: countScore });

  // === Rate detection ===
  const rateScore = scoreRateType(nameLower, nonNullValues, basicType);
  if (rateScore > 0) alternatives.push({ type: "rate", confidence: rateScore });

  // === Date detection ===
  const dateScore = scoreDateType(nameLower, nonNullValues);
  if (dateScore > 0) alternatives.push({ type: "date", confidence: dateScore });

  // === Timestamp detection ===
  const timestampScore = scoreTimestampType(nameLower, nonNullValues);
  if (timestampScore > 0) alternatives.push({ type: "timestamp", confidence: timestampScore });

  // === Email detection ===
  const emailScore = scoreEmailType(nameLower, nonNullValues);
  if (emailScore > 0) alternatives.push({ type: "email", confidence: emailScore });

  // === Phone detection ===
  const phoneScore = scorePhoneType(nameLower, nonNullValues);
  if (phoneScore > 0) alternatives.push({ type: "phone", confidence: phoneScore });

  // === URL detection ===
  const urlScore = scoreUrlType(nameLower, nonNullValues);
  if (urlScore > 0) alternatives.push({ type: "url", confidence: urlScore });

  // === Categorical detection ===
  const catScore = scoreCategoricalType(uniqueCount, nonNullCount, basicType);
  if (catScore > 0) alternatives.push({ type: "categorical", confidence: catScore });

  // === Text detection ===
  const textScore = scoreTextType(nonNullValues, basicType);
  if (textScore > 0) alternatives.push({ type: "text", confidence: textScore });

  // Sort by confidence
  alternatives.sort((a, b) => b.confidence - a.confidence);

  // Pick the best match
  if (alternatives.length === 0) {
    return {
      semanticType: "unknown",
      confidence: createConfidence(30, ["Could not determine semantic type"]),
      alternatives: [],
    };
  }

  const best = alternatives[0];
  const reasons: string[] = [];

  // Add reasoning
  if (best.type === "id") {
    reasons.push("All values are unique");
    if (nameLower.includes("id")) reasons.push("Column name suggests identifier");
  } else if (best.type === "percentage") {
    reasons.push("Values are in 0-100 or 0-1 range");
    if (nameLower.includes("rate") || nameLower.includes("percent")) {
      reasons.push("Column name suggests percentage");
    }
  } else if (best.type === "currency") {
    reasons.push("Values match currency patterns");
  } else if (best.type === "boolean") {
    reasons.push("Values are boolean-like (true/false, yes/no, 1/0)");
  } else if (best.type === "categorical") {
    reasons.push(`Limited unique values (${uniqueCount}) relative to row count`);
  }

  return {
    semanticType: best.type,
    confidence: createConfidence(best.confidence, reasons),
    alternatives: alternatives.slice(1, 4), // Keep top 3 alternatives
  };
}

// === Scoring functions for each semantic type ===

function scoreIdType(
  nameLower: string,
  values: (string | number)[],
  uniqueCount: number,
  nonNullCount: number
): number {
  let score = 0;

  // Check for UUID pattern first - very strong signal
  const uuidCount = values.filter(v => PATTERNS.uuid.test(String(v))).length;
  if (uuidCount / values.length > 0.8) {
    return 95; // UUIDs are very high confidence IDs
  }

  // All unique values is a strong signal
  if (uniqueCount === nonNullCount && nonNullCount > 10) {
    score += 40;
  }

  // Name-based hints - be more specific to avoid false positives
  const idKeywords = ["_id", "uuid", "guid", "identifier"];
  const weakIdKeywords = ["key", "code"];
  if (idKeywords.some(kw => nameLower.includes(kw))) {
    score += 35;
  } else if (nameLower === "id" || nameLower.endsWith("id")) {
    // Only boost if the name is exactly "id" or ends with "id" (like user_id, product_id)
    score += 30;
  } else if (weakIdKeywords.some(kw => nameLower.includes(kw))) {
    score += 15;
  }

  // Check for sequential integers (but only if name suggests ID)
  const numericValues = values.filter((v): v is number => typeof v === "number");
  if (numericValues.length === values.length && numericValues.length > 10) {
    const sorted = [...numericValues].sort((a, b) => a - b);
    const isSequential = sorted.every((v, i) => i === 0 || v > sorted[i - 1]);
    if (isSequential && sorted[0] >= 0) {
      // Only count sequential as ID if name hints at it
      if (nameLower.includes("id") || nameLower === "id") {
        score += 25;
      } else {
        score += 10; // Lower score for unlabeled sequential numbers
      }
    }
  }

  return Math.min(100, score);
}

function scoreBooleanType(values: (string | number)[]): number {
  const booleanCount = values.filter(v =>
    BOOLEAN_VALUES.has(String(v).toLowerCase())
  ).length;

  const ratio = booleanCount / values.length;

  // Also check for exactly 2 unique values
  const uniqueVals = new Set(values.map(v => String(v).toLowerCase()));
  if (uniqueVals.size === 2) {
    return Math.round(ratio * 100);
  }

  return ratio > 0.9 ? Math.round(ratio * 95) : 0;
}

function scorePercentageType(
  nameLower: string,
  values: (string | number)[],
  basicType: BasicType
): number {
  let score = 0;

  // Check for % suffix in strings - very strong signal
  const percentSuffixCount = values.filter(v =>
    typeof v === "string" && PATTERNS.percentage.test(v)
  ).length;
  if (percentSuffixCount / values.length > 0.8) {
    return 95;
  }

  // Name-based hints - exclude "rate" and "ratio" which should go to rate type
  const percentKeywords = ["percent", "pct", "share", "proportion"];
  if (percentKeywords.some(kw => nameLower.includes(kw))) {
    score += 35;
  }

  // Check for 0-100 range (numeric)
  if (basicType === "number") {
    const numericValues = values.filter((v): v is number => typeof v === "number");
    if (numericValues.length > 0) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);

      // 0-100 range (not 0-1)
      if (min >= 0 && max <= 100 && max > 1) {
        score += 30;
        // More confidence if we see values near boundaries
        if (max > 90 || min < 10) score += 15;
      }

      // 0-1 range - only score as percentage if name explicitly says percent
      // Otherwise let rate type handle it
      if (min >= 0 && max <= 1) {
        if (percentKeywords.some(kw => nameLower.includes(kw))) {
          score += 30; // Name says percent, so count it
        } else {
          score += 15; // Lower score - let rate type potentially win
        }
      }
    }
  }

  return Math.min(100, score);
}

function scoreCurrencyType(
  nameLower: string,
  values: (string | number)[]
): number {
  let score = 0;

  // Check for currency pattern ($ prefix) first - very strong signal
  const currencyPatternCount = values.filter(v =>
    typeof v === "string" && PATTERNS.currency.test(v)
  ).length;
  if (currencyPatternCount / values.length > 0.8) {
    return 90; // Very high confidence with currency symbols
  }

  // Name-based hints - strong keywords for currency
  const strongCurrencyKeywords = [
    "price", "cost", "revenue", "income", "expense", "salary", "wage",
    "fee", "payment", "balance", "budget"
  ];
  const weakCurrencyKeywords = ["amount", "total", "spend", "value"];

  if (strongCurrencyKeywords.some(kw => nameLower.includes(kw))) {
    score += 50; // Strong name signal for currency
  } else if (weakCurrencyKeywords.some(kw => nameLower.includes(kw))) {
    score += 25;
  }

  // Check for numeric values with reasonable currency-like magnitudes
  const numericValues = values.filter((v): v is number => typeof v === "number");
  if (numericValues.length > 0) {
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);

    // Currency values are typically positive and in reasonable ranges
    if (min >= 0 && max < 10000000) {
      score += 15;
    }

    // Check for 2 decimal places (common for currency)
    const twoDecimalCount = numericValues.filter(v => {
      const str = v.toString();
      const decimalPart = str.split(".")[1];
      return decimalPart && decimalPart.length === 2;
    }).length;
    if (twoDecimalCount / numericValues.length > 0.5) {
      score += 20;
    }
  }

  return Math.min(100, score);
}

function scoreCountType(
  nameLower: string,
  values: (string | number)[],
  basicType: BasicType
): number {
  if (basicType !== "number") return 0;

  let score = 0;

  // Name-based hints
  const countKeywords = [
    "count", "quantity", "qty", "num", "number", "total", "amount",
    "units", "items", "size", "length", "age", "year", "month", "day"
  ];
  if (countKeywords.some(kw => nameLower.includes(kw))) {
    score += 25;
  }

  // Check for positive integers
  const numericValues = values.filter((v): v is number => typeof v === "number");
  const integerCount = numericValues.filter(v => Number.isInteger(v) && v >= 0).length;

  if (integerCount / numericValues.length > 0.95) {
    score += 40;
  } else if (integerCount / numericValues.length > 0.8) {
    score += 25;
  }

  return Math.min(100, score);
}

function scoreRateType(
  nameLower: string,
  values: (string | number)[],
  basicType: BasicType
): number {
  if (basicType !== "number") return 0;

  let score = 0;

  // Name-based hints - these are strong signals for rate
  const strongRateKeywords = ["rate", "ratio", "probability", "likelihood"];
  const weakRateKeywords = ["confidence", "score", "conversion", "churn", "retention"];

  const hasStrongRateKeyword = strongRateKeywords.some(kw => nameLower.includes(kw));
  const hasWeakRateKeyword = weakRateKeywords.some(kw => nameLower.includes(kw));

  if (hasStrongRateKeyword) {
    score += 45; // Strong name signal
  } else if (hasWeakRateKeyword) {
    score += 25;
  }

  // Check for 0-1 range
  const numericValues = values.filter((v): v is number => typeof v === "number");
  if (numericValues.length > 0) {
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);

    if (min >= 0 && max <= 1) {
      // If name suggests rate AND values are 0-1, very high confidence
      if (hasStrongRateKeyword) {
        score += 50; // Combined name + range = very strong
      } else {
        score += 40;
      }
      // Extra confidence if we see decimal values
      const decimalCount = numericValues.filter(v => !Number.isInteger(v)).length;
      if (decimalCount / numericValues.length > 0.5) {
        score += 10;
      }
    }
  }

  return Math.min(100, score);
}

function scoreDateType(
  nameLower: string,
  values: (string | number)[]
): number {
  let score = 0;

  // Name-based hints
  const dateKeywords = [
    "date", "time", "created", "updated", "modified", "timestamp",
    "born", "start", "end", "expire", "due"
  ];
  if (dateKeywords.some(kw => nameLower.includes(kw))) {
    score += 25;
  }

  // Check for date patterns
  const datePatternCount = values.filter(v => {
    const str = String(v);
    return (
      PATTERNS.date_iso.test(str) ||
      PATTERNS.date_us.test(str) ||
      PATTERNS.date_eu.test(str)
    );
  }).length;

  const ratio = datePatternCount / values.length;
  if (ratio > 0.8) {
    score += 60;
  } else if (ratio > 0.5) {
    score += 35;
  }

  return Math.min(100, score);
}

function scoreTimestampType(
  nameLower: string,
  values: (string | number)[]
): number {
  let score = 0;

  // Name-based hints
  if (nameLower.includes("timestamp") || nameLower.includes("unix")) {
    score += 40;
  }

  // Check for Unix timestamp pattern (10 or 13 digits)
  const timestampCount = values.filter(v => {
    const str = String(v);
    if (PATTERNS.timestamp.test(str)) {
      const num = parseInt(str, 10);
      // Valid Unix timestamp range (1970 - 2100 approximately)
      return (num >= 0 && num <= 4102444800) || // seconds
             (num >= 0 && num <= 4102444800000); // milliseconds
    }
    return false;
  }).length;

  if (timestampCount / values.length > 0.8) {
    score += 50;
  }

  return Math.min(100, score);
}

function scoreEmailType(
  nameLower: string,
  values: (string | number)[]
): number {
  let score = 0;

  // Name-based hints
  if (nameLower.includes("email") || nameLower.includes("mail")) {
    score += 40;
  }

  // Check for email pattern
  const emailCount = values.filter(v =>
    typeof v === "string" && PATTERNS.email.test(v)
  ).length;

  if (emailCount / values.length > 0.8) {
    score += 55;
  } else if (emailCount / values.length > 0.5) {
    score += 30;
  }

  return Math.min(100, score);
}

function scorePhoneType(
  nameLower: string,
  values: (string | number)[]
): number {
  let score = 0;

  // Name-based hints
  if (nameLower.includes("phone") || nameLower.includes("tel") || nameLower.includes("mobile")) {
    score += 40;
  }

  // Check for phone pattern
  const phoneCount = values.filter(v => {
    const str = String(v);
    return PATTERNS.phone.test(str) && str.replace(/\D/g, "").length >= 7;
  }).length;

  if (phoneCount / values.length > 0.8) {
    score += 50;
  }

  return Math.min(100, score);
}

function scoreUrlType(
  nameLower: string,
  values: (string | number)[]
): number {
  let score = 0;

  // Name-based hints
  if (nameLower.includes("url") || nameLower.includes("link") || nameLower.includes("website")) {
    score += 40;
  }

  // Check for URL pattern
  const urlCount = values.filter(v =>
    typeof v === "string" && PATTERNS.url.test(v)
  ).length;

  if (urlCount / values.length > 0.8) {
    score += 55;
  }

  return Math.min(100, score);
}

function scoreCategoricalType(
  uniqueCount: number,
  nonNullCount: number,
  basicType: BasicType
): number {
  // Categorical = limited unique values relative to total
  const uniqueRatio = uniqueCount / nonNullCount;

  // Low cardinality is a strong signal for categorical
  if (uniqueCount <= 10 && nonNullCount > 50) {
    return 85;
  }

  if (uniqueRatio < 0.05 && nonNullCount > 100) {
    return 75;
  }

  if (uniqueRatio < 0.1 && nonNullCount > 50) {
    return 60;
  }

  if (uniqueCount <= 20 && basicType === "string") {
    return 50;
  }

  return 0;
}

function scoreTextType(
  values: (string | number)[],
  basicType: BasicType
): number {
  if (basicType !== "string") return 0;

  // Check for long strings (free-form text)
  const avgLength = values.reduce((sum, v) => sum + String(v).length, 0) / values.length;

  if (avgLength > 50) {
    return 80;
  }

  if (avgLength > 20) {
    return 60;
  }

  return 30;
}

/**
 * Generate a clarifying question for low-confidence inferences
 */
function generateClarifyingQuestion(
  inference: ColumnTypeInference
): ClarifyingQuestion | null {
  const { column, semanticType, alternatives, statistics, sampleValues } = inference;

  // If we have good alternatives, ask about them
  if (alternatives.length > 0) {
    const options = [semanticType, ...alternatives.map(a => a.type)].slice(0, 4);

    // Format sample values for display
    const samples = sampleValues.slice(0, 3).map(v => `"${v}"`).join(", ");

    return {
      column,
      question: `Column '${column}' has values like ${samples}. What type of data is this?`,
      options: options.map(formatSemanticTypeOption),
      reason: `Detected as ${semanticType} but with ${inference.semanticTypeConfidence.value}% confidence`,
      confidence: inference.semanticTypeConfidence.value,
    };
  }

  // Special case: ambiguous column name
  if (statistics.uniqueCount === statistics.totalCount - statistics.nullCount) {
    return {
      column,
      question: `Column '${column}' has all unique values. Is this an identifier or unique data?`,
      options: ["ID/Primary Key", "Unique text values", "Something else"],
      reason: "All values are unique, could be ID or just diverse data",
      confidence: inference.semanticTypeConfidence.value,
    };
  }

  return null;
}

/**
 * Format semantic type for display in questions
 */
function formatSemanticTypeOption(type: SemanticType): string {
  const labels: Record<SemanticType, string> = {
    percentage: "Percentage (0-100%)",
    currency: "Currency/Money",
    count: "Count/Quantity",
    rate: "Rate/Probability (0-1)",
    id: "ID/Identifier",
    boolean: "Yes/No (Boolean)",
    categorical: "Category/Label",
    text: "Free-form Text",
    date: "Date/Time",
    timestamp: "Unix Timestamp",
    email: "Email Address",
    phone: "Phone Number",
    url: "URL/Link",
    unknown: "Unknown/Other",
  };
  return labels[type] || type;
}

/**
 * Verbalize confidence level for user-facing messages
 * See spec Section 4.3.2 (REF: USE-002)
 */
export function verbalizeConfidence(confidence: ConfidenceScore): string {
  const { value, level } = confidence;

  if (level === "high") {
    return "highly confident";
  } else if (level === "medium") {
    return `${value}% confident`;
  } else if (level === "low") {
    return `only ${value}% confident`;
  } else {
    return `uncertain (${value}% confidence)`;
  }
}

/**
 * Generate Kowalski-style message for confidence
 */
export function kowalskiConfidenceMessage(
  inference: ColumnTypeInference
): string {
  const { column, semanticType, semanticTypeConfidence } = inference;
  const conf = semanticTypeConfidence;

  if (conf.level === "high") {
    return `I'm ${verbalizeConfidence(conf)} that "${column}" is ${formatSemanticTypeOption(semanticType)}, Skipper.`;
  } else if (conf.level === "medium") {
    return `"${column}" appears to be ${formatSemanticTypeOption(semanticType)}. ${verbalizeConfidence(conf)} - proceeding with caution.`;
  } else {
    return `Skipper, I'm ${verbalizeConfidence(conf)} about "${column}". Might be ${formatSemanticTypeOption(semanticType)}, but I'd appreciate clarification.`;
  }
}

// Re-export confidence thresholds for use by other modules
export { CONFIDENCE_THRESHOLDS };
