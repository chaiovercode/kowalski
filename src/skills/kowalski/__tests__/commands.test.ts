// Tests for Kowalski Commands
import { describe, test, expect } from "bun:test";
import { resolve } from "path";
import { scanDirectory, reconSweep, formatReconResult } from "../commands/recon";
import { loadDataFile, performAnalysis } from "../commands/analyze";
import { getHelpText } from "../commands/help";

const SAMPLE_DATA_DIR = resolve(import.meta.dir, "../../../../sample_data");

describe("commands", () => {
  describe("recon", () => {
    describe("scanDirectory", () => {
      test("finds CSV files in directory", async () => {
        const files = await scanDirectory(SAMPLE_DATA_DIR);
        expect(files.length).toBeGreaterThan(0);

        const csvFiles = files.filter((f) => f.extension === "csv");
        expect(csvFiles.length).toBeGreaterThan(0);
      });

      test("returns row counts for files", async () => {
        const files = await scanDirectory(SAMPLE_DATA_DIR);
        const salesFile = files.find((f) => f.name === "sales.csv");

        expect(salesFile).toBeDefined();
        expect(salesFile?.rows).toBeGreaterThan(0);
      });

      test("handles non-existent directory gracefully", async () => {
        const files = await scanDirectory("/non/existent/path");
        expect(files).toEqual([]);
      });
    });

    describe("reconSweep", () => {
      test("returns ReconResult structure", async () => {
        const result = await reconSweep(SAMPLE_DATA_DIR);

        expect(result).toHaveProperty("files");
        expect(result).toHaveProperty("memoryStatus");
        expect(Array.isArray(result.files)).toBe(true);
      });
    });

    describe("formatReconResult", () => {
      test("formats empty result", () => {
        const result = formatReconResult({
          files: [],
          memoryStatus: "empty",
        });

        expect(result).toContain("No data files detected");
        expect(typeof result).toBe("string");
      });

      test("formats result with files", () => {
        const result = formatReconResult({
          files: [
            {
              name: "test.csv",
              path: "/path/to/test.csv",
              extension: "csv",
              rows: 100,
              status: "new",
            },
          ],
          memoryStatus: "empty",
        });

        expect(result).toContain("test.csv");
        expect(typeof result).toBe("string");
      });
    });
  });

  describe("analyze", () => {
    describe("loadDataFile", () => {
      test("loads CSV file successfully", async () => {
        const data = await loadDataFile(`${SAMPLE_DATA_DIR}/sales.csv`);

        expect(data.name).toBe("sales.csv");
        expect(data.columns.length).toBeGreaterThan(0);
        expect(data.rows.length).toBeGreaterThan(0);
      });

      test("infers column types", async () => {
        const data = await loadDataFile(`${SAMPLE_DATA_DIR}/sales.csv`);

        expect(data.types).toBeDefined();
        expect(data.types?.length).toBe(data.columns.length);
      });

      test("throws on non-existent file", async () => {
        await expect(loadDataFile("/non/existent/file.csv")).rejects.toThrow();
      });
    });

    describe("performAnalysis", () => {
      test("generates analysis result", async () => {
        const data = await loadDataFile(`${SAMPLE_DATA_DIR}/sales.csv`);
        const { analysis, insights, edaReport } = performAnalysis(data);

        expect(analysis).toHaveProperty("summary");
        expect(analysis).toHaveProperty("statistics");
        expect(analysis).toHaveProperty("correlations");
        expect(Array.isArray(insights)).toBe(true);
        expect(edaReport).toHaveProperty("overview");
        expect(edaReport).toHaveProperty("findings");
        expect(edaReport).toHaveProperty("bottomLine");
      });

      test("calculates statistics for numeric columns", async () => {
        const data = await loadDataFile(`${SAMPLE_DATA_DIR}/sales.csv`);
        const { analysis } = performAnalysis(data);

        // sales.csv has revenue, units, cost columns
        expect(analysis.statistics).toHaveProperty("revenue");
        expect(analysis.statistics?.revenue.type).toBe("numeric");
        expect(analysis.statistics?.revenue.mean).toBeDefined();
      });

      test("detects correlations", async () => {
        const data = await loadDataFile(`${SAMPLE_DATA_DIR}/sales.csv`);
        const { analysis } = performAnalysis(data);

        // Should find correlations between numeric columns
        expect(analysis.correlations).toBeDefined();
        expect(analysis.correlations?.length).toBeGreaterThan(0);
      });
    });
  });

  describe("help", () => {
    describe("getHelpText", () => {
      test("returns non-empty help text", () => {
        const help = getHelpText();
        expect(help.length).toBeGreaterThan(100);
      });

      test("includes command documentation", () => {
        const help = getHelpText();
        expect(help).toContain("/kowalski");
        expect(help).toContain("analyze");
        expect(help).toContain("compare");
        expect(help).toContain("help");
      });

      test("includes supported formats", () => {
        const help = getHelpText();
        expect(help).toContain("CSV");
        expect(help).toContain("JSON");
        expect(help).toContain("TSV");
      });

      test("includes examples", () => {
        const help = getHelpText();
        expect(help).toContain("EXAMPLES");
      });
    });
  });
});
