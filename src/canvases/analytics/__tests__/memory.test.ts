// Memory Manager Tests
// "Every byte is committed to memory, Skipper."

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import {
  MemoryManager,
  getMemoryManager,
  resetMemoryManager,
  type DatasetMemo,
  type UserPreferences,
} from "../memory";
import type { DataSet } from "../types";
import type { SchemaInference, SemanticType } from "../understanding";
import type { Relationship } from "../relationships";

// Test directory for CLAUDE.md - use unique directory per test via counter
let testDirCounter = 0;
const getTestDir = () => join(process.cwd(), `test-memory-tmp-${++testDirCounter}`);
let TEST_DIR: string;
let TEST_CLAUDE_MD: string;

// Sample dataset for testing - uses unique columns per call to avoid fingerprint collisions
let datasetCounter = 0;
const createTestDataset = (name: string, rows = 100, uniqueColumns = true): DataSet => {
  const suffix = uniqueColumns ? `_${++datasetCounter}` : "";
  return {
    name,
    columns: [`id${suffix}`, `name${suffix}`, `value${suffix}`, `date${suffix}`],
    rows: Array.from({ length: rows }, (_, i) => [
      i + 1,
      `Item ${i}`,
      Math.random() * 100,
      `2024-01-${String((i % 28) + 1).padStart(2, "0")}`,
    ]),
    types: ["number", "string", "number", "date"],
  };
};

// Create dataset with fixed columns (for fingerprint matching tests)
const createFixedDataset = (name: string, rows = 100): DataSet => ({
  name,
  columns: ["id", "name", "value", "date"],
  rows: Array.from({ length: rows }, (_, i) => [
    i + 1,
    `Item ${i}`,
    Math.random() * 100,
    `2024-01-${String((i % 28) + 1).padStart(2, "0")}`,
  ]),
  types: ["number", "string", "number", "date"],
});

// Sample schema inference - suffix should match the dataset's column suffix
const createTestSchema = (suffix = ""): SchemaInference => ({
  columns: [
    {
      column: `id${suffix}`,
      basicType: "number",
      basicTypeConfidence: { value: 95, level: "high", reasons: [] },
      semanticType: "id",
      semanticTypeConfidence: { value: 90, level: "high", reasons: [] },
      alternatives: [],
      sampleValues: [1, 2, 3],
      statistics: { totalCount: 100, nullCount: 0, uniqueCount: 100, numericCount: 100, stringCount: 0 },
    },
    {
      column: `name${suffix}`,
      basicType: "string",
      basicTypeConfidence: { value: 100, level: "high", reasons: [] },
      semanticType: "text",
      semanticTypeConfidence: { value: 85, level: "medium", reasons: [] },
      alternatives: [],
      sampleValues: ["Item 1", "Item 2", "Item 3"],
      statistics: { totalCount: 100, nullCount: 0, uniqueCount: 100, numericCount: 0, stringCount: 100 },
    },
    {
      column: `value${suffix}`,
      basicType: "number",
      basicTypeConfidence: { value: 100, level: "high", reasons: [] },
      semanticType: "count",
      semanticTypeConfidence: { value: 75, level: "medium", reasons: [] },
      alternatives: [],
      sampleValues: [42.5, 38.2, 91.1],
      statistics: { totalCount: 100, nullCount: 0, uniqueCount: 100, numericCount: 100, stringCount: 0 },
    },
    {
      column: `date${suffix}`,
      basicType: "date",
      basicTypeConfidence: { value: 95, level: "high", reasons: [] },
      semanticType: "date",
      semanticTypeConfidence: { value: 92, level: "high", reasons: [] },
      alternatives: [],
      sampleValues: ["2024-01-01", "2024-01-02", "2024-01-03"],
      statistics: { totalCount: 100, nullCount: 0, uniqueCount: 28, numericCount: 0, stringCount: 100 },
    },
  ],
  overallConfidence: { value: 85, level: "medium", reasons: [] },
  suggestedQuestions: [],
});

describe("MemoryManager", () => {
  let manager: MemoryManager;

  beforeEach(() => {
    // Get unique test directory for this test
    TEST_DIR = getTestDir();
    TEST_CLAUDE_MD = join(TEST_DIR, "CLAUDE.md");

    // Clean up any leftover test files first
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    // Create fresh test directory
    mkdirSync(TEST_DIR, { recursive: true });
    // Reset singleton and dataset counter
    resetMemoryManager();
    datasetCounter = 0;
    // Create manager with test directory
    manager = new MemoryManager(TEST_DIR);
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    resetMemoryManager();
  });

  describe("initialization", () => {
    it("should initialize with empty memory when no CLAUDE.md exists", async () => {
      await manager.load();
      const status = manager.getStatus();

      expect(status.isEmpty).toBe(true);
      expect(status.datasetCount).toBe(0);
      expect(status.missionCount).toBe(0);
    });

    it("should load existing memory from CLAUDE.md", async () => {
      // Create a CLAUDE.md with memory section
      const existingContent = `# My Project

Some content here.

## Kowalski Intel

### Known Datasets

- \`sales.csv\`: 1,000 rows, columns: id, name

### User Preferences

- Chart type: bar
- Export format: csv
- Color scheme: dark

### Mission Log

- Total missions: 5
- Last updated: 2024-01-15T10:00:00Z

\`\`\`json
{
  "version": "1.0",
  "lastUpdated": "2024-01-15T10:00:00Z",
  "datasets": [
    {
      "fingerprint": {
        "name": "sales.csv",
        "rowCount": 1000,
        "columns": ["id", "name"],
        "columnHash": "abc123",
        "sampleHash": "def456"
      },
      "firstSeen": "2024-01-10T10:00:00Z",
      "lastAnalyzed": "2024-01-15T10:00:00Z",
      "analysisCount": 3,
      "columnSemantics": [],
      "relationships": [],
      "findings": []
    }
  ],
  "preferences": {
    "chartType": "bar",
    "colorScheme": "dark",
    "exportFormat": "csv",
    "autoSpawnDashboard": true,
    "verbosityLevel": "normal"
  },
  "missionCount": 5
}
\`\`\`

<!-- /Kowalski Intel -->

More content after.
`;
      writeFileSync(TEST_CLAUDE_MD, existingContent);

      await manager.load();
      const status = manager.getStatus();

      expect(status.isEmpty).toBe(false);
      expect(status.datasetCount).toBe(1);
      expect(status.missionCount).toBe(5);

      const prefs = manager.getPreferences();
      expect(prefs.chartType).toBe("bar");
      expect(prefs.exportFormat).toBe("csv");
    });
  });

  describe("dataset fingerprinting", () => {
    it("should create unique fingerprints for different datasets", () => {
      const dataset1 = createTestDataset("sales.csv");
      const dataset2 = createTestDataset("orders.csv");

      const fp1 = manager.createFingerprint(dataset1);
      const fp2 = manager.createFingerprint(dataset2);

      expect(fp1.name).toBe("sales.csv");
      expect(fp2.name).toBe("orders.csv");
      expect(fp1.columnHash).not.toBe(fp2.columnHash);
    });

    it("should create matching fingerprints for same column structure", () => {
      // Use fixed datasets - same columns = same column hash
      const dataset1 = createFixedDataset("sales.csv", 100);
      const dataset2 = createFixedDataset("sales_backup.csv", 100);

      const fp1 = manager.createFingerprint(dataset1);
      const fp2 = manager.createFingerprint(dataset2);

      // Same columns = same column hash
      expect(fp1.columnHash).toBe(fp2.columnHash);
    });
  });

  describe("dataset memory", () => {
    it("should remember a new dataset", async () => {
      await manager.load();

      // Use fixed dataset and schema to ensure column names match
      const dataset = createFixedDataset("test.csv");
      const schema = createTestSchema(); // Uses default columns (id, name, value, date)

      const memo = manager.rememberDataset(dataset, schema);

      expect(memo.fingerprint.name).toBe("test.csv");
      expect(memo.analysisCount).toBe(1);
      expect(memo.columnSemantics.length).toBe(4);
      expect(manager.getStatus().datasetCount).toBe(1);
    });

    it("should update existing dataset on re-analysis", async () => {
      await manager.load();

      // Verify we start with empty memory
      expect(manager.getStatus().datasetCount).toBe(0);

      // Use a completely unique dataset for this test
      const dataset: DataSet = {
        name: "reanalysis-test.csv",
        columns: ["reanalysis_id", "reanalysis_val"],
        rows: [[1, 100], [2, 200]],
        types: ["number", "number"],
      };

      const memo1 = manager.rememberDataset(dataset);
      expect(memo1.analysisCount).toBe(1);

      const memo2 = manager.rememberDataset(dataset);
      expect(memo2.analysisCount).toBe(2);

      // Should still only have one dataset
      expect(manager.getStatus().datasetCount).toBe(1);
    });

    it("should recognize dataset by fingerprint", async () => {
      await manager.load();

      // Use fixed datasets so they share column structure
      const dataset = createFixedDataset("original.csv");
      manager.rememberDataset(dataset);

      // Same structure, different name - should be recognized
      const renamed = createFixedDataset("renamed.csv");
      const isKnown = manager.isKnownDataset(renamed);

      expect(isKnown).toBe(true);
    });

    it("should recall dataset by name", async () => {
      await manager.load();

      // Use unique dataset so it doesn't collide
      const dataset = createTestDataset("sales.csv");
      manager.rememberDataset(dataset);

      const recalled = manager.recallDataset("sales.csv");

      expect(recalled).not.toBeNull();
      expect(recalled?.fingerprint.name).toBe("sales.csv");
    });
  });

  describe("column semantics", () => {
    it("should store column semantics from schema inference", async () => {
      await manager.load();

      // Use fixed dataset and schema
      const dataset = createFixedDataset("test.csv");
      const schema = createTestSchema();

      manager.rememberDataset(dataset, schema);

      const idMemo = manager.recallColumnMeaning("test.csv", "id");
      expect(idMemo).not.toBeNull();
      expect(idMemo?.semanticType).toBe("id");
      expect(idMemo?.confidence).toBe(90);
    });

    it("should allow user to override column meaning", async () => {
      await manager.load();

      // Use fixed dataset and schema
      const dataset = createFixedDataset("test.csv");
      const schema = createTestSchema();

      manager.rememberDataset(dataset, schema);
      manager.setColumnMeaning("test.csv", "value", "currency", "Actually this is revenue");

      const valueMemo = manager.recallColumnMeaning("test.csv", "value");
      expect(valueMemo?.semanticType).toBe("currency");
      expect(valueMemo?.confidence).toBe(100);
      expect(valueMemo?.userProvided).toBe(true);
      expect(valueMemo?.notes).toBe("Actually this is revenue");
    });

    it("should not override user-provided semantics with lower confidence", async () => {
      await manager.load();

      // Use fixed dataset and schema
      const dataset = createFixedDataset("test.csv");
      const schema = createTestSchema();

      manager.rememberDataset(dataset, schema);
      manager.setColumnMeaning("test.csv", "value", "currency");

      // Re-analyze with different schema
      const newSchema = createTestSchema();
      newSchema.columns[2].semanticType = "count";
      newSchema.columns[2].semanticTypeConfidence.value = 80;

      manager.rememberDataset(dataset, newSchema);

      // Should still be currency (user-provided)
      const valueMemo = manager.recallColumnMeaning("test.csv", "value");
      expect(valueMemo?.semanticType).toBe("currency");
    });
  });

  describe("relationship memory", () => {
    it("should store relationships between datasets", async () => {
      await manager.load();

      // Use unique datasets with explicit different columns
      const sales: DataSet = {
        name: "sales.csv",
        columns: ["sale_id", "customer_id", "amount", "sale_date"],
        rows: [[1, 100, 50.0, "2024-01-01"]],
        types: ["number", "number", "number", "date"],
      };
      const customers: DataSet = {
        name: "customers.csv",
        columns: ["customer_id", "customer_name", "email", "joined"],
        rows: [[100, "John", "john@example.com", "2023-01-01"]],
        types: ["number", "string", "string", "date"],
      };

      manager.rememberDataset(sales);
      manager.rememberDataset(customers);

      const relationship: Relationship = {
        sourceDataset: "sales.csv",
        sourceColumn: "customer_id",
        targetDataset: "customers.csv",
        targetColumn: "customer_id",
        type: "many_to_one",
        matchType: "exact",
        confidence: 85,
        statistics: {
          sourceUniqueCount: 50,
          targetUniqueCount: 100,
          matchedCount: 50,
          sourceOrphanCount: 0,
          targetOrphanCount: 50,
          matchPercentage: 100,
        },
      };

      manager.rememberRelationship(relationship);

      const recalled = manager.recallRelationships("sales.csv");
      expect(recalled.length).toBe(1);
      expect(recalled[0].targetDataset).toBe("customers.csv");
      expect(recalled[0].confidence).toBe(85);
    });

    it("should update relationship with higher confidence", async () => {
      await manager.load();

      const dataset: DataSet = {
        name: "orders.csv",
        columns: ["order_id", "customer_id", "total", "order_date"],
        rows: [[1, 100, 99.99, "2024-01-01"]],
        types: ["number", "number", "number", "date"],
      };
      manager.rememberDataset(dataset);

      const rel1: Relationship = {
        sourceDataset: "orders.csv",
        sourceColumn: "customer_id",
        targetDataset: "users.csv",
        targetColumn: "id",
        type: "many_to_one",
        matchType: "exact",
        confidence: 60,
        statistics: {
          sourceUniqueCount: 50,
          targetUniqueCount: 100,
          matchedCount: 50,
          sourceOrphanCount: 0,
          targetOrphanCount: 50,
          matchPercentage: 100,
        },
      };

      const rel2: Relationship = { ...rel1, confidence: 90 };

      manager.rememberRelationship(rel1);
      manager.rememberRelationship(rel2);

      const recalled = manager.recallRelationships("orders.csv");
      expect(recalled.length).toBe(1);
      expect(recalled[0].confidence).toBe(90);
    });
  });

  describe("findings memory", () => {
    it("should record findings", async () => {
      await manager.load();

      const dataset: DataSet = {
        name: "metrics.csv",
        columns: ["metric_id", "name", "value"],
        rows: [[1, "revenue", 1000]],
        types: ["number", "string", "number"],
      };
      manager.rememberDataset(dataset);

      manager.recordFinding("metrics.csv", {
        type: "correlation",
        summary: "Strong correlation (r=0.87) between marketing_spend and revenue",
        confidence: 87,
      });

      const findings = manager.recallFindings("metrics.csv");
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe("correlation");
      expect(findings[0].summary).toContain("r=0.87");
    });

    it("should limit findings to last 10", async () => {
      await manager.load();

      const dataset: DataSet = {
        name: "analytics.csv",
        columns: ["event_id", "event_type", "timestamp"],
        rows: [[1, "click", "2024-01-01"]],
        types: ["number", "string", "date"],
      };
      manager.rememberDataset(dataset);

      // Add 15 findings
      for (let i = 0; i < 15; i++) {
        manager.recordFinding("analytics.csv", {
          type: "insight",
          summary: `Finding ${i}`,
          confidence: 80,
        });
      }

      const findings = manager.recallFindings("analytics.csv");
      expect(findings.length).toBe(10);
      expect(findings[0].summary).toBe("Finding 5"); // First 5 were removed
    });

    it("should record analysis findings", async () => {
      await manager.load();

      const dataset: DataSet = {
        name: "revenue.csv",
        columns: ["rev_id", "amount", "date"],
        rows: [[1, 5000, "2024-01-01"]],
        types: ["number", "number", "date"],
      };
      manager.rememberDataset(dataset);

      manager.recordAnalysisFindings("revenue.csv", {
        correlations: [
          { column1: "spend", column2: "revenue", value: 0.87, strength: "strong" },
          { column1: "price", column2: "quantity", value: -0.65, strength: "moderate" },
        ],
        trends: [
          { column: "revenue", direction: "up", changePercent: 15, description: "Revenue increasing" },
        ],
      });

      const findings = manager.recallFindings("revenue.csv");
      expect(findings.length).toBe(3); // 2 correlations + 1 trend
    });
  });

  describe("user preferences", () => {
    it("should return default preferences", async () => {
      await manager.load();

      const prefs = manager.getPreferences();

      expect(prefs.chartType).toBe("auto");
      expect(prefs.colorScheme).toBe("kowalski");
      expect(prefs.exportFormat).toBe("png");
      expect(prefs.autoSpawnDashboard).toBe(true);
      expect(prefs.verbosityLevel).toBe("normal");
    });

    it("should update preferences", async () => {
      await manager.load();

      manager.updatePreferences({
        chartType: "bar",
        exportFormat: "csv",
      });

      const prefs = manager.getPreferences();
      expect(prefs.chartType).toBe("bar");
      expect(prefs.exportFormat).toBe("csv");
      // Others unchanged
      expect(prefs.colorScheme).toBe("kowalski");
    });
  });

  describe("persistence", () => {
    it("should save memory to CLAUDE.md", async () => {
      await manager.load();

      const dataset = createTestDataset("test.csv");
      manager.rememberDataset(dataset);
      manager.updatePreferences({ chartType: "line" });

      await manager.save();

      // Load fresh manager
      const newManager = new MemoryManager(TEST_DIR);
      await newManager.load();

      expect(newManager.getStatus().datasetCount).toBe(1);
      expect(newManager.getPreferences().chartType).toBe("line");
    });

    it("should preserve existing CLAUDE.md content", async () => {
      // Create existing CLAUDE.md
      writeFileSync(TEST_CLAUDE_MD, "# My Project\n\nExisting content here.\n");

      await manager.load();
      manager.rememberDataset(createTestDataset("test.csv"));
      await manager.save();

      // Read and check content is preserved
      const { readFileSync } = await import("fs");
      const content = readFileSync(TEST_CLAUDE_MD, "utf-8");

      expect(content).toContain("# My Project");
      expect(content).toContain("Existing content here.");
      expect(content).toContain("## Kowalski Intel");
      expect(content).toContain("test.csv");
    });

    it("should update existing memory section", async () => {
      // Create CLAUDE.md with existing memory section
      const initial = `# Project

## Kowalski Intel

### Known Datasets

- old data

\`\`\`json
{"version":"1.0","datasets":[],"preferences":{},"missionCount":0,"lastUpdated":"2024-01-01"}
\`\`\`

<!-- /Kowalski Intel -->

## Other Section
`;
      writeFileSync(TEST_CLAUDE_MD, initial);

      await manager.load();
      manager.rememberDataset(createTestDataset("new.csv"));
      await manager.save();

      const { readFileSync } = await import("fs");
      const content = readFileSync(TEST_CLAUDE_MD, "utf-8");

      expect(content).toContain("new.csv");
      expect(content).toContain("## Other Section");
      // Should only have one memory section
      const sectionCount = (content.match(/## Kowalski Intel/g) || []).length;
      expect(sectionCount).toBe(1);
    });
  });

  describe("recognition messages", () => {
    it("should generate recognition message for known dataset", async () => {
      await manager.load();

      const dataset = createTestDataset("familiar.csv");
      manager.rememberDataset(dataset);
      manager.rememberDataset(dataset); // Analyze again

      const message = manager.getRecognitionMessage(dataset);

      expect(message).not.toBeNull();
      expect(message).toContain("recognize");
      expect(message).toContain("2 previous missions");
    });

    it("should return null for unknown dataset", async () => {
      await manager.load();

      // Use unique columns to ensure it's not recognized
      const dataset = createTestDataset("unknown.csv");
      const message = manager.getRecognitionMessage(dataset);

      expect(message).toBeNull();
    });

    it("should detect renamed dataset by column structure", async () => {
      await manager.load();

      // Use fixed datasets so they have the same column structure
      const original = createFixedDataset("original.csv");
      manager.rememberDataset(original);

      // Same structure, different name
      const renamed = createFixedDataset("renamed.csv");
      const message = manager.getRecognitionMessage(renamed);

      expect(message).not.toBeNull();
      expect(message).toContain("original.csv");
      expect(message).toContain("same column structure");
    });
  });

  describe("singleton pattern", () => {
    it("should return same instance", async () => {
      const manager1 = getMemoryManager(TEST_DIR);
      const manager2 = getMemoryManager(TEST_DIR);

      expect(manager1).toBe(manager2);
    });

    it("should reset instance", async () => {
      const manager1 = getMemoryManager(TEST_DIR);
      resetMemoryManager();
      const manager2 = getMemoryManager(TEST_DIR);

      expect(manager1).not.toBe(manager2);
    });
  });

  describe("clear memory", () => {
    it("should clear all memory", async () => {
      await manager.load();

      // Create datasets with explicitly different columns
      const ds1: DataSet = {
        name: "data1.csv",
        columns: ["col_a", "col_b"],
        rows: [[1, 2]],
        types: ["number", "number"],
      };
      const ds2: DataSet = {
        name: "data2.csv",
        columns: ["col_x", "col_y", "col_z"],
        rows: [[1, 2, 3]],
        types: ["number", "number", "number"],
      };

      manager.rememberDataset(ds1);
      manager.rememberDataset(ds2);
      manager.updatePreferences({ chartType: "bar" });

      expect(manager.getStatus().datasetCount).toBe(2);

      manager.clear();

      expect(manager.getStatus().isEmpty).toBe(true);
      expect(manager.getPreferences().chartType).toBe("auto"); // Reset to default
    });
  });
});
