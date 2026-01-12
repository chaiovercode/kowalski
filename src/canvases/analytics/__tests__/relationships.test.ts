// Tests for Relationship Discovery Engine
// "Kowalski, validate the relationship detection!"

import { describe, it, expect } from "bun:test";
import {
  findRelationships,
  formatRelationshipKowalski,
} from "../relationships";
import type { DataSet } from "../types";

// Helper to create test datasets
function createDataSet(
  columns: string[],
  rows: (string | number | null)[][],
  types?: ("string" | "number" | "date")[],
  name = "test.csv"
): DataSet {
  return { name, columns, rows, types };
}

// Create related datasets (orders and customers)
function createOrdersDataset(): DataSet {
  return createDataSet(
    ["order_id", "customer_id", "amount"],
    [
      [1, 101, 100],
      [2, 102, 200],
      [3, 101, 150],
      [4, 103, 300],
      [5, 102, 250],
      [6, 104, 175],
      [7, 105, 125],
      [8, 103, 225],
    ],
    ["number", "number", "number"],
    "orders.csv"
  );
}

function createCustomersDataset(): DataSet {
  return createDataSet(
    ["customer_id", "name", "email"],
    [
      [101, "Alice", "alice@example.com"],
      [102, "Bob", "bob@example.com"],
      [103, "Charlie", "charlie@example.com"],
      [104, "Diana", "diana@example.com"],
      [105, "Eve", "eve@example.com"],
    ],
    ["number", "string", "string"],
    "customers.csv"
  );
}

// Create datasets with orphan records
function createOrdersWithOrphans(): DataSet {
  return createDataSet(
    ["order_id", "customer_id", "amount"],
    [
      [1, 101, 100],
      [2, 102, 200],
      [3, 999, 150], // Orphan - customer doesn't exist
      [4, 103, 300],
      [5, 888, 250], // Orphan - customer doesn't exist
    ],
    ["number", "number", "number"],
    "orders.csv"
  );
}

// Create datasets with fuzzy column names
function createSalesDataset(): DataSet {
  return createDataSet(
    ["sale_id", "cust_id", "product_id", "qty"],
    [
      [1, 101, "P001", 5],
      [2, 102, "P002", 3],
      [3, 103, "P001", 2],
    ],
    ["number", "number", "string", "number"],
    "sales.csv"
  );
}

function createProductsDataset(): DataSet {
  return createDataSet(
    ["product_id", "product_name", "price"],
    [
      ["P001", "Widget A", 10],
      ["P002", "Widget B", 20],
      ["P003", "Gadget X", 50],
    ],
    ["string", "string", "number"],
    "products.csv"
  );
}

describe("findRelationships", () => {
  describe("basic relationship detection", () => {
    it("should detect exact column name match", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      expect(result.relationships.length).toBeGreaterThan(0);

      const custRel = result.relationships.find(
        (r) => r.sourceColumn === "customer_id" || r.targetColumn === "customer_id"
      );
      expect(custRel).toBeDefined();
      expect(custRel!.matchType).toBe("exact");
    });

    it("should calculate correct match statistics", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      const custRel = result.relationships.find(
        (r) => r.sourceColumn === "customer_id" && r.sourceDataset === "customers.csv"
      );

      if (custRel) {
        expect(custRel.statistics.matchPercentage).toBe(100);
        expect(custRel.statistics.sourceOrphanCount).toBe(0);
      }
    });

    it("should detect one-to-many relationship", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      // Customers (unique) to Orders (not unique) should be one-to-many
      const rel = result.relationships.find(
        (r) =>
          (r.sourceDataset === "customers.csv" && r.targetDataset === "orders.csv") ||
          (r.sourceDataset === "orders.csv" && r.targetDataset === "customers.csv")
      );

      expect(rel).toBeDefined();
      // The type depends on which side is "source"
      expect(["one_to_many", "many_to_one"]).toContain(rel!.type);
    });
  });

  describe("fuzzy matching", () => {
    it("should detect fuzzy column name match", () => {
      const sales = createSalesDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([sales, customers]);

      // cust_id should match customer_id
      const rel = result.relationships.find(
        (r) =>
          (r.sourceColumn === "cust_id" && r.targetColumn === "customer_id") ||
          (r.sourceColumn === "customer_id" && r.targetColumn === "cust_id")
      );

      expect(rel).toBeDefined();
      expect(rel!.matchType).toBe("fuzzy");
    });

    it("should match product_id across datasets", () => {
      const sales = createSalesDataset();
      const products = createProductsDataset();

      const result = findRelationships([sales, products]);

      const rel = result.relationships.find(
        (r) => r.sourceColumn === "product_id" || r.targetColumn === "product_id"
      );

      expect(rel).toBeDefined();
      expect(rel!.matchType).toBe("exact");
    });
  });

  describe("orphan detection", () => {
    it("should detect orphan records", () => {
      const orders = createOrdersWithOrphans();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      // Should have some orphan analysis
      expect(result.orphanAnalysis.length).toBeGreaterThan(0);

      const orphan = result.orphanAnalysis.find((o) => o.dataset === "orders.csv");
      if (orphan) {
        expect(orphan.orphanCount).toBeGreaterThan(0);
        expect(orphan.possibleReasons.length).toBeGreaterThan(0);
      }
    });

    it("should calculate correct match percentage with orphans", () => {
      const orders = createOrdersWithOrphans();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      const rel = result.relationships.find(
        (r) => r.sourceColumn === "customer_id" || r.targetColumn === "customer_id"
      );

      if (rel) {
        // With 2 orphan customer_ids out of 5 unique in orders, match should be < 100%
        expect(rel.statistics.matchPercentage).toBeLessThan(100);
      }
    });
  });

  describe("confidence scoring", () => {
    it("should have higher confidence for exact matches", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      const exactMatch = result.relationships.find((r) => r.matchType === "exact");
      if (exactMatch) {
        expect(exactMatch.confidence).toBeGreaterThanOrEqual(50);
      }
    });

    it("should sort relationships by confidence", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();
      const products = createProductsDataset();

      const result = findRelationships([orders, customers, products]);

      // Should be sorted by confidence descending
      for (let i = 1; i < result.relationships.length; i++) {
        expect(result.relationships[i - 1].confidence).toBeGreaterThanOrEqual(
          result.relationships[i].confidence
        );
      }
    });
  });

  describe("edge cases", () => {
    it("should handle single dataset", () => {
      const orders = createOrdersDataset();

      const result = findRelationships([orders]);

      expect(result.relationships).toHaveLength(0);
      expect(result.summary).toContain("single dataset");
    });

    it("should handle empty datasets", () => {
      const empty1 = createDataSet(["id"], [], ["number"], "empty1.csv");
      const empty2 = createDataSet(["id"], [], ["number"], "empty2.csv");

      const result = findRelationships([empty1, empty2]);

      expect(result.relationships).toHaveLength(0);
    });

    it("should handle datasets with no matching columns", () => {
      const ds1 = createDataSet(
        ["a", "b", "c"],
        [[1, 2, 3]],
        ["number", "number", "number"],
        "ds1.csv"
      );
      const ds2 = createDataSet(
        ["x", "y", "z"],
        [[4, 5, 6]],
        ["number", "number", "number"],
        "ds2.csv"
      );

      const result = findRelationships([ds1, ds2]);

      expect(result.relationships).toHaveLength(0);
    });

    it("should handle multiple datasets", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();
      const products = createProductsDataset();
      const sales = createSalesDataset();

      const result = findRelationships([orders, customers, products, sales]);

      expect(result.datasets).toHaveLength(4);
      // Should find multiple relationships across datasets
    });
  });

  describe("diagram generation", () => {
    it("should generate ASCII diagram", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      expect(result.diagram).toBeDefined();
      if (result.relationships.length > 0) {
        expect(result.diagram).toContain("orders.csv");
        expect(result.diagram).toContain("customers.csv");
      }
    });

    it("should include match percentage in diagram", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      if (result.relationships.length > 0) {
        expect(result.diagram).toContain("match");
      }
    });
  });

  describe("summary generation", () => {
    it("should generate summary", () => {
      const orders = createOrdersDataset();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      expect(result.summary).toBeDefined();
      expect(result.summary).toContain("Analyzed");
    });

    it("should mention orphans in summary when present", () => {
      const orders = createOrdersWithOrphans();
      const customers = createCustomersDataset();

      const result = findRelationships([orders, customers]);

      if (result.orphanAnalysis.length > 0) {
        expect(result.summary).toContain("orphan");
      }
    });
  });
});

describe("formatRelationshipKowalski", () => {
  it("should format results in Kowalski's voice", () => {
    const orders = createOrdersDataset();
    const customers = createCustomersDataset();

    const result = findRelationships([orders, customers]);
    const formatted = formatRelationshipKowalski(result);

    expect(formatted).toContain("KOWALSKI");
    expect(formatted).toContain("Skipper");
  });

  it("should include join recommendation when relationships found", () => {
    const orders = createOrdersDataset();
    const customers = createCustomersDataset();

    const result = findRelationships([orders, customers]);
    const formatted = formatRelationshipKowalski(result);

    if (result.relationships.length > 0) {
      expect(formatted).toContain("JOIN");
    }
  });

  it("should provide guidance when no relationships found", () => {
    const ds1 = createDataSet(
      ["a", "b"],
      [[1, 2]],
      ["number", "number"],
      "ds1.csv"
    );
    const ds2 = createDataSet(
      ["x", "y"],
      [[3, 4]],
      ["number", "number"],
      "ds2.csv"
    );

    const result = findRelationships([ds1, ds2]);
    const formatted = formatRelationshipKowalski(result);

    expect(formatted).toContain("no detectable relationships");
    expect(formatted).toContain("Recommendations");
  });
});
