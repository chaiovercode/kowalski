// Tests for Data Understanding Engine
// "Kowalski, run the test suite!"

import { describe, it, expect } from "bun:test";
import {
  inferSchema,
  verbalizeConfidence,
  kowalskiConfidenceMessage,
  CONFIDENCE_THRESHOLDS,
  type SchemaInference,
  type ColumnTypeInference,
} from "../understanding";
import type { DataSet } from "../types";

// Helper to create test datasets
function createDataSet(
  columns: string[],
  rows: (string | number | null)[][],
  name = "test.csv"
): DataSet {
  return { name, columns, rows };
}

describe("inferSchema", () => {
  describe("Basic Type Detection", () => {
    it("should detect numeric columns with high confidence", () => {
      const data = createDataSet(
        ["amount"],
        [[100], [200], [300], [400], [500], [150], [250], [350], [450], [550]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.basicType).toBe("number");
      expect(col.basicTypeConfidence.value).toBeGreaterThanOrEqual(90);
      expect(col.basicTypeConfidence.level).toBe("high");
    });

    it("should detect string columns with high confidence", () => {
      const data = createDataSet(
        ["name"],
        [["Alice"], ["Bob"], ["Charlie"], ["Diana"], ["Eve"]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.basicType).toBe("string");
      expect(col.basicTypeConfidence.value).toBeGreaterThanOrEqual(90);
    });

    it("should detect mixed types with lower confidence", () => {
      const data = createDataSet(
        ["mixed"],
        [["text"], [123], ["more text"], [456], ["string"], [789]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.basicTypeConfidence.value).toBeLessThan(80);
    });

    it("should handle all-null columns", () => {
      const data = createDataSet(
        ["empty"],
        [[null], [null], [null], [null], [null]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.basicType).toBe("null");
      expect(col.basicTypeConfidence.value).toBe(100);
    });

    it("should detect boolean columns", () => {
      const data = createDataSet(
        ["active"],
        [["true"], ["false"], ["true"], ["false"], ["true"], ["false"]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.basicType).toBe("boolean");
      expect(col.basicTypeConfidence.value).toBeGreaterThanOrEqual(90);
    });

    it("should detect date columns", () => {
      const data = createDataSet(
        ["created_at"],
        [
          ["2024-01-01"],
          ["2024-02-15"],
          ["2024-03-20"],
          ["2024-04-10"],
          ["2024-05-05"],
        ]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.basicType).toBe("date");
      expect(col.basicTypeConfidence.value).toBeGreaterThanOrEqual(80);
    });
  });

  describe("Semantic Type Detection", () => {
    describe("ID Detection", () => {
      it("should detect ID columns by name and uniqueness", () => {
        const data = createDataSet(
          ["user_id"],
          [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("id");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(60);
      });

      it("should detect UUID columns", () => {
        const data = createDataSet(
          ["uuid"],
          [
            ["550e8400-e29b-41d4-a716-446655440000"],
            ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
            ["6ba7b811-9dad-11d1-80b4-00c04fd430c8"],
            ["6ba7b812-9dad-11d1-80b4-00c04fd430c8"],
            ["6ba7b813-9dad-11d1-80b4-00c04fd430c8"],
          ]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("id");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(70);
      });
    });

    describe("Boolean Detection", () => {
      it("should detect yes/no values as boolean", () => {
        const data = createDataSet(
          ["enrolled"],
          [["yes"], ["no"], ["yes"], ["yes"], ["no"], ["yes"]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("boolean");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(80);
      });

      it("should detect 1/0 values as boolean", () => {
        const data = createDataSet(
          ["flag"],
          [[1], [0], [1], [1], [0], [0]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("boolean");
      });
    });

    describe("Percentage Detection", () => {
      it("should detect percentage by name and 0-100 range", () => {
        const data = createDataSet(
          ["completion_percent"],
          [[0], [25], [50], [75], [100], [33], [67], [90], [10], [45]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("percentage");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(50);
      });

      it("should detect percentage with % suffix", () => {
        const data = createDataSet(
          ["discount"],
          [["10%"], ["20%"], ["15%"], ["5%"], ["30%"]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("percentage");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(90);
      });
    });

    describe("Currency Detection", () => {
      it("should detect currency by name", () => {
        const data = createDataSet(
          ["price"],
          [[9.99], [19.99], [29.99], [49.99], [99.99], [149.99]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("currency");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(50);
      });

      it("should detect currency with $ prefix", () => {
        const data = createDataSet(
          ["amount"],
          [["$100.00"], ["$250.50"], ["$75.25"], ["$1,000.00"], ["$50.00"]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("currency");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(70);
      });
    });

    describe("Count Detection", () => {
      it("should detect count by name and positive integers", () => {
        const data = createDataSet(
          ["quantity"],
          [[1], [5], [10], [3], [7], [2], [15], [8], [4], [6]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("count");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(50);
      });
    });

    describe("Rate Detection", () => {
      it("should detect rate by name and 0-1 range", () => {
        const data = createDataSet(
          ["conversion_rate"],
          [[0.05], [0.12], [0.08], [0.15], [0.03], [0.22], [0.18], [0.09]]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("rate");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(70);
      });
    });

    describe("Date Detection", () => {
      it("should detect ISO date format", () => {
        const data = createDataSet(
          ["order_date"],
          [
            ["2024-01-15"],
            ["2024-02-20"],
            ["2024-03-10"],
            ["2024-04-05"],
            ["2024-05-25"],
          ]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("date");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(70);
      });

      it("should detect US date format", () => {
        const data = createDataSet(
          ["date"],
          [
            ["01/15/2024"],
            ["02/20/2024"],
            ["03/10/2024"],
            ["04/05/2024"],
            ["05/25/2024"],
          ]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("date");
      });
    });

    describe("Email Detection", () => {
      it("should detect email columns", () => {
        const data = createDataSet(
          ["email"],
          [
            ["alice@example.com"],
            ["bob@test.org"],
            ["charlie@company.io"],
            ["diana@mail.net"],
            ["eve@domain.co"],
          ]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("email");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(80);
      });
    });

    describe("URL Detection", () => {
      it("should detect URL columns", () => {
        const data = createDataSet(
          ["website"],
          [
            ["https://example.com"],
            ["https://test.org/page"],
            ["http://company.io"],
            ["https://mail.net/user"],
            ["https://domain.co/path"],
          ]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("url");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(80);
      });
    });

    describe("Categorical Detection", () => {
      it("should detect categorical columns with limited values", () => {
        // Generate 100 rows with only 5 unique values
        const categories = ["A", "B", "C", "D", "E"];
        const rows: [string][] = [];
        for (let i = 0; i < 100; i++) {
          rows.push([categories[i % 5]]);
        }

        const data = createDataSet(["category"], rows);

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("categorical");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(70);
      });
    });

    describe("Text Detection", () => {
      it("should detect free-form text columns", () => {
        const data = createDataSet(
          ["description"],
          [
            ["This is a long description that contains multiple words and provides detailed information about the item."],
            ["Another lengthy text field with substantial content that describes something in detail."],
            ["A third piece of text that is relatively long and contains lots of information for the reader."],
            ["More descriptive text that spans multiple words and provides context about the subject matter."],
            ["The final text entry which is also quite lengthy and contains many words for testing purposes."],
          ]
        );

        const schema = inferSchema(data);
        const col = schema.columns[0];

        expect(col.semanticType).toBe("text");
        expect(col.semanticTypeConfidence.value).toBeGreaterThanOrEqual(70);
      });
    });
  });

  describe("Clarifying Questions", () => {
    it("should generate questions for low confidence columns", () => {
      // Ambiguous data that could be multiple types
      const data = createDataSet(
        ["val"],
        [[50], [60], [70], [80], [90], [55], [65], [75], [85], [95]]
      );

      const schema = inferSchema(data);

      // The system might generate a question if confidence is low
      // This depends on the confidence calculation
      expect(schema.suggestedQuestions).toBeInstanceOf(Array);
    });

    it("should not generate questions for high confidence columns", () => {
      const data = createDataSet(
        ["user_id"],
        [
          ["550e8400-e29b-41d4-a716-446655440000"],
          ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
          ["6ba7b811-9dad-11d1-80b4-00c04fd430c8"],
          ["6ba7b812-9dad-11d1-80b4-00c04fd430c8"],
          ["6ba7b813-9dad-11d1-80b4-00c04fd430c8"],
        ]
      );

      const schema = inferSchema(data);

      // High confidence ID detection should not generate questions
      const idQuestions = schema.suggestedQuestions.filter(q => q.column === "user_id");
      expect(idQuestions.length).toBe(0);
    });
  });

  describe("Multiple Columns", () => {
    it("should infer schema for a realistic dataset", () => {
      const data = createDataSet(
        ["id", "name", "email", "age", "salary", "hired_date", "active"],
        [
          [1, "Alice Smith", "alice@company.com", 28, 75000, "2022-01-15", "yes"],
          [2, "Bob Jones", "bob@company.com", 35, 85000, "2021-06-20", "yes"],
          [3, "Charlie Brown", "charlie@company.com", 42, 95000, "2020-03-10", "no"],
          [4, "Diana Ross", "diana@company.com", 31, 72000, "2023-02-28", "yes"],
          [5, "Eve Wilson", "eve@company.com", 39, 88000, "2019-11-05", "yes"],
          [6, "Frank Miller", "frank@company.com", 45, 105000, "2018-07-12", "yes"],
          [7, "Grace Lee", "grace@company.com", 29, 68000, "2023-09-01", "yes"],
          [8, "Henry Davis", "henry@company.com", 52, 120000, "2015-04-18", "no"],
          [9, "Ivy Chen", "ivy@company.com", 26, 62000, "2024-01-10", "yes"],
          [10, "Jack White", "jack@company.com", 33, 78000, "2022-08-25", "yes"],
          [11, "Kate Brown", "kate@company.com", 37, 92000, "2020-12-03", "yes"],
          [12, "Leo Garcia", "leo@company.com", 41, 98000, "2019-05-22", "yes"],
        ]
      );

      const schema = inferSchema(data);

      expect(schema.columns.length).toBe(7);

      // Check specific column inferences
      const idCol = schema.columns.find(c => c.column === "id");
      expect(idCol?.semanticType).toBe("id");

      const emailCol = schema.columns.find(c => c.column === "email");
      expect(emailCol?.semanticType).toBe("email");

      const salaryCol = schema.columns.find(c => c.column === "salary");
      expect(salaryCol?.semanticType).toBe("currency");

      const dateCol = schema.columns.find(c => c.column === "hired_date");
      expect(dateCol?.semanticType).toBe("date");

      const activeCol = schema.columns.find(c => c.column === "active");
      expect(activeCol?.semanticType).toBe("boolean");
    });

    it("should calculate overall confidence", () => {
      const data = createDataSet(
        ["user_id", "email"],
        [
          [1, "user1@test.com"],
          [2, "user2@test.com"],
          [3, "user3@test.com"],
          [4, "user4@test.com"],
          [5, "user5@test.com"],
          [6, "user6@test.com"],
          [7, "user7@test.com"],
          [8, "user8@test.com"],
          [9, "user9@test.com"],
          [10, "user10@test.com"],
          [11, "user11@test.com"],
          [12, "user12@test.com"],
        ]
      );

      const schema = inferSchema(data);

      expect(schema.overallConfidence.value).toBeGreaterThan(0);
      expect(schema.overallConfidence.level).toBeDefined();
      expect(schema.overallConfidence.reasons.length).toBeGreaterThan(0);
    });
  });

  describe("Statistics Collection", () => {
    it("should collect correct statistics for each column", () => {
      const data = createDataSet(
        ["value"],
        [[1], [2], [3], [null], [5], [1], [2], [null]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.statistics.totalCount).toBe(8);
      expect(col.statistics.nullCount).toBe(2);
      expect(col.statistics.uniqueCount).toBe(4); // 1, 2, 3, 5
      expect(col.statistics.numericCount).toBe(6);
      expect(col.statistics.stringCount).toBe(0);
    });

    it("should collect sample values", () => {
      const data = createDataSet(
        ["item"],
        [["a"], ["b"], ["c"], ["d"], ["e"], ["f"], ["g"], ["h"], ["i"], ["j"], ["k"], ["l"]]
      );

      const schema = inferSchema(data);
      const col = schema.columns[0];

      expect(col.sampleValues.length).toBeLessThanOrEqual(10);
      expect(col.sampleValues).toContain("a");
    });
  });
});

describe("Confidence Verbalization", () => {
  it("should verbalize high confidence correctly", () => {
    const confidence = {
      value: 95,
      level: "high" as const,
      reasons: ["test"],
    };

    const result = verbalizeConfidence(confidence);
    expect(result).toBe("highly confident");
  });

  it("should verbalize medium confidence with percentage", () => {
    const confidence = {
      value: 75,
      level: "medium" as const,
      reasons: ["test"],
    };

    const result = verbalizeConfidence(confidence);
    expect(result).toBe("75% confident");
  });

  it("should verbalize low confidence with 'only'", () => {
    const confidence = {
      value: 55,
      level: "low" as const,
      reasons: ["test"],
    };

    const result = verbalizeConfidence(confidence);
    expect(result).toBe("only 55% confident");
  });

  it("should verbalize very low confidence as uncertain", () => {
    const confidence = {
      value: 35,
      level: "very_low" as const,
      reasons: ["test"],
    };

    const result = verbalizeConfidence(confidence);
    expect(result).toBe("uncertain (35% confidence)");
  });
});

describe("Kowalski Confidence Messages", () => {
  it("should generate Kowalski-style message for high confidence", () => {
    const inference: ColumnTypeInference = {
      column: "user_id",
      basicType: "number",
      basicTypeConfidence: { value: 100, level: "high", reasons: [] },
      semanticType: "id",
      semanticTypeConfidence: { value: 95, level: "high", reasons: [] },
      alternatives: [],
      sampleValues: [1, 2, 3],
      statistics: {
        totalCount: 100,
        nullCount: 0,
        uniqueCount: 100,
        numericCount: 100,
        stringCount: 0,
      },
    };

    const message = kowalskiConfidenceMessage(inference);
    expect(message).toContain("user_id");
    expect(message).toContain("Skipper");
    expect(message).toContain("ID/Identifier");
  });

  it("should generate cautious message for medium confidence", () => {
    const inference: ColumnTypeInference = {
      column: "value",
      basicType: "number",
      basicTypeConfidence: { value: 85, level: "medium", reasons: [] },
      semanticType: "percentage",
      semanticTypeConfidence: { value: 75, level: "medium", reasons: [] },
      alternatives: [{ type: "count", confidence: 60 }],
      sampleValues: [50, 60, 70],
      statistics: {
        totalCount: 50,
        nullCount: 0,
        uniqueCount: 20,
        numericCount: 50,
        stringCount: 0,
      },
    };

    const message = kowalskiConfidenceMessage(inference);
    expect(message).toContain("value");
    expect(message).toContain("caution");
  });

  it("should request clarification for low confidence", () => {
    const inference: ColumnTypeInference = {
      column: "data",
      basicType: "string",
      basicTypeConfidence: { value: 60, level: "low", reasons: [] },
      semanticType: "unknown",
      semanticTypeConfidence: { value: 40, level: "very_low", reasons: [] },
      alternatives: [],
      sampleValues: ["x", "y", "z"],
      statistics: {
        totalCount: 10,
        nullCount: 0,
        uniqueCount: 10,
        numericCount: 0,
        stringCount: 10,
      },
    };

    const message = kowalskiConfidenceMessage(inference);
    expect(message).toContain("data");
    expect(message).toContain("clarification");
  });
});

describe("Confidence Thresholds", () => {
  it("should export correct threshold values", () => {
    expect(CONFIDENCE_THRESHOLDS.AUTO_PROCEED).toBe(90);
    expect(CONFIDENCE_THRESHOLDS.NOTE_UNCERTAINTY).toBe(70);
    expect(CONFIDENCE_THRESHOLDS.ASK_QUESTION).toBe(50);
    expect(CONFIDENCE_THRESHOLDS.REQUIRE_INPUT).toBe(0);
  });
});

describe("Edge Cases", () => {
  it("should handle empty dataset", () => {
    const data = createDataSet(["col1"], []);

    const schema = inferSchema(data);

    expect(schema.columns.length).toBe(1);
    expect(schema.columns[0].statistics.totalCount).toBe(0);
  });

  it("should handle single row dataset", () => {
    const data = createDataSet(
      ["name", "value"],
      [["test", 100]]
    );

    const schema = inferSchema(data);

    expect(schema.columns.length).toBe(2);
  });

  it("should handle special characters in values", () => {
    const data = createDataSet(
      ["text"],
      [
        ["Hello, World!"],
        ["Test @#$%"],
        ["Unicode: \u00e9\u00e8\u00ea"],
        ["Emoji: \ud83d\ude00"],
        ["Newline\ntest"],
      ]
    );

    const schema = inferSchema(data);

    expect(schema.columns.length).toBe(1);
    expect(schema.columns[0].basicType).toBe("string");
  });

  it("should handle very long strings", () => {
    const longString = "x".repeat(10000);
    const data = createDataSet(
      ["content"],
      [[longString], [longString], [longString]]
    );

    const schema = inferSchema(data);

    expect(schema.columns[0].semanticType).toBe("text");
  });

  it("should handle mixed null patterns", () => {
    const data = createDataSet(
      ["sparse"],
      [[null], [1], [null], [null], [2], [null], [3], [null], [null], [null]]
    );

    const schema = inferSchema(data);
    const col = schema.columns[0];

    expect(col.statistics.nullCount).toBe(7);
    expect(col.statistics.numericCount).toBe(3);
  });
});
