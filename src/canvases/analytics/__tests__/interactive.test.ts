// Interactive Dashboard tests for Phase 6
// "Testing the tactical interface, Skipper."

import { describe, it, expect } from "bun:test";
import type { DataSet } from "../types";
import type { DataFilter, NumericFilter, CategoricalFilter, DateFilter } from "../../../ipc/types";

// Filter application logic (extracted for testing)
function applyFilters(data: DataSet, filters: DataFilter[]): DataSet {
  if (filters.length === 0) return data;

  const filteredRows = data.rows.filter((row) => {
    return filters.every((filter) => {
      const colIdx = data.columns.indexOf(filter.column);
      if (colIdx === -1) return true;

      const value = row[colIdx];

      if (filter.type === "numeric") {
        if (typeof value !== "number") return false;
        if (filter.min !== undefined && value < filter.min) return false;
        if (filter.max !== undefined && value > filter.max) return false;
        return true;
      }

      if (filter.type === "categorical") {
        return filter.values.includes(String(value));
      }

      if (filter.type === "date") {
        const dateValue = new Date(String(value)).getTime();
        if (filter.startDate && dateValue < new Date(filter.startDate).getTime()) return false;
        if (filter.endDate && dateValue > new Date(filter.endDate).getTime()) return false;
        return true;
      }

      return true;
    });
  });

  return {
    ...data,
    rows: filteredRows,
  };
}

const createTestData = (): DataSet => ({
  name: "test.csv",
  columns: ["id", "name", "value", "category", "date"],
  rows: [
    [1, "Alpha", 100, "A", "2024-01-01"],
    [2, "Beta", 200, "B", "2024-02-15"],
    [3, "Gamma", 150, "A", "2024-03-10"],
    [4, "Delta", 300, "C", "2024-04-20"],
    [5, "Epsilon", 175, "B", "2024-05-05"],
  ],
  types: ["number", "string", "number", "string", "date"],
});

describe("Filter Application", () => {
  describe("Numeric Filters", () => {
    it("should filter by minimum value", () => {
      const data = createTestData();
      const filter: NumericFilter = {
        type: "numeric",
        column: "value",
        min: 150,
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(4); // 150, 200, 150, 300, 175 >= 150
    });

    it("should filter by maximum value", () => {
      const data = createTestData();
      const filter: NumericFilter = {
        type: "numeric",
        column: "value",
        max: 175,
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(3); // 100, 150, 175 <= 175
    });

    it("should filter by range", () => {
      const data = createTestData();
      const filter: NumericFilter = {
        type: "numeric",
        column: "value",
        min: 150,
        max: 200,
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(3); // 150, 200, 175
      expect(result.rows.map((r) => r[2])).toEqual([200, 150, 175]);
    });

    it("should exclude non-numeric values", () => {
      const data: DataSet = {
        ...createTestData(),
        rows: [
          [1, "Alpha", 100, "A", "2024-01-01"],
          [2, "Beta", "invalid", "B", "2024-02-15"],
          [3, "Gamma", null, "A", "2024-03-10"],
        ],
      };
      const filter: NumericFilter = {
        type: "numeric",
        column: "value",
        min: 0,
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(1); // Only the first row has valid numeric value
    });
  });

  describe("Categorical Filters", () => {
    it("should filter by single category", () => {
      const data = createTestData();
      const filter: CategoricalFilter = {
        type: "categorical",
        column: "category",
        values: ["A"],
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(2);
      expect(result.rows.map((r) => r[3])).toEqual(["A", "A"]);
    });

    it("should filter by multiple categories", () => {
      const data = createTestData();
      const filter: CategoricalFilter = {
        type: "categorical",
        column: "category",
        values: ["A", "B"],
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(4);
    });

    it("should return empty for non-matching categories", () => {
      const data = createTestData();
      const filter: CategoricalFilter = {
        type: "categorical",
        column: "category",
        values: ["X", "Y"],
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(0);
    });

    it("should handle empty values array", () => {
      const data = createTestData();
      const filter: CategoricalFilter = {
        type: "categorical",
        column: "category",
        values: [],
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(0);
    });
  });

  describe("Date Filters", () => {
    it("should filter by start date", () => {
      const data = createTestData();
      const filter: DateFilter = {
        type: "date",
        column: "date",
        startDate: "2024-03-01",
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(3); // March, April, May
    });

    it("should filter by end date", () => {
      const data = createTestData();
      const filter: DateFilter = {
        type: "date",
        column: "date",
        endDate: "2024-02-28",
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(2); // January, February
    });

    it("should filter by date range", () => {
      const data = createTestData();
      const filter: DateFilter = {
        type: "date",
        column: "date",
        startDate: "2024-02-01",
        endDate: "2024-04-01",
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(2); // February, March
    });
  });

  describe("Multiple Filters", () => {
    it("should apply AND logic for multiple filters", () => {
      const data = createTestData();
      const filters: DataFilter[] = [
        { type: "categorical", column: "category", values: ["A", "B"] },
        { type: "numeric", column: "value", min: 150 },
      ];

      const result = applyFilters(data, filters);

      // Category A or B: Alpha(100), Beta(200), Gamma(150), Epsilon(175)
      // Value >= 150: Beta(200), Gamma(150), Epsilon(175)
      // Both: Beta(200), Gamma(150), Epsilon(175) but only in A or B
      expect(result.rows.length).toBe(3);
    });

    it("should handle non-existent column", () => {
      const data = createTestData();
      const filter: NumericFilter = {
        type: "numeric",
        column: "nonexistent",
        min: 0,
      };

      const result = applyFilters(data, [filter]);

      // Non-existent columns should pass through
      expect(result.rows.length).toBe(5);
    });

    it("should return all rows when no filters", () => {
      const data = createTestData();
      const result = applyFilters(data, []);

      expect(result.rows.length).toBe(5);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty dataset", () => {
      const data: DataSet = {
        name: "empty.csv",
        columns: ["a", "b"],
        rows: [],
        types: ["string", "number"],
      };
      const filter: NumericFilter = {
        type: "numeric",
        column: "b",
        min: 0,
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(0);
    });

    it("should preserve other dataset properties", () => {
      const data = createTestData();
      const filter: NumericFilter = {
        type: "numeric",
        column: "value",
        min: 200,
      };

      const result = applyFilters(data, [filter]);

      expect(result.name).toBe(data.name);
      expect(result.columns).toEqual(data.columns);
      expect(result.types).toEqual(data.types);
    });

    it("should handle null and undefined values", () => {
      const data: DataSet = {
        name: "nulls.csv",
        columns: ["value"],
        rows: [[100], [null], [undefined], [200]],
        types: ["number"],
      };
      const filter: NumericFilter = {
        type: "numeric",
        column: "value",
        min: 50,
      };

      const result = applyFilters(data, [filter]);

      expect(result.rows.length).toBe(2); // Only 100 and 200
    });
  });
});

describe("IPC Types", () => {
  it("should support NumericFilter type", () => {
    const filter: NumericFilter = {
      type: "numeric",
      column: "price",
      min: 10,
      max: 100,
    };
    expect(filter.type).toBe("numeric");
  });

  it("should support CategoricalFilter type", () => {
    const filter: CategoricalFilter = {
      type: "categorical",
      column: "status",
      values: ["active", "pending"],
    };
    expect(filter.type).toBe("categorical");
  });

  it("should support DateFilter type", () => {
    const filter: DateFilter = {
      type: "date",
      column: "created_at",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    };
    expect(filter.type).toBe("date");
  });
});
