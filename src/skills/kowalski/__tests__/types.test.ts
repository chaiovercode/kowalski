// Tests for Kowalski Types
import { describe, test, expect } from "bun:test";
import { getConfidenceLevel, CONFIDENCE_THRESHOLDS } from "../types";

describe("types", () => {
  describe("CONFIDENCE_THRESHOLDS", () => {
    test("thresholds are correctly defined", () => {
      expect(CONFIDENCE_THRESHOLDS.AUTO_PROCEED).toBe(90);
      expect(CONFIDENCE_THRESHOLDS.NOTE_UNCERTAINTY).toBe(70);
      expect(CONFIDENCE_THRESHOLDS.ASK_QUESTION).toBe(50);
      expect(CONFIDENCE_THRESHOLDS.REQUIRE_INPUT).toBe(0);
    });
  });

  describe("getConfidenceLevel", () => {
    test("90%+ returns auto", () => {
      expect(getConfidenceLevel(90)).toBe("auto");
      expect(getConfidenceLevel(95)).toBe("auto");
      expect(getConfidenceLevel(100)).toBe("auto");
    });

    test("70-89% returns proceed_with_note", () => {
      expect(getConfidenceLevel(70)).toBe("proceed_with_note");
      expect(getConfidenceLevel(89)).toBe("proceed_with_note");
    });

    test("50-69% returns ask_question", () => {
      expect(getConfidenceLevel(50)).toBe("ask_question");
      expect(getConfidenceLevel(69)).toBe("ask_question");
    });

    test("<50% returns require_input", () => {
      expect(getConfidenceLevel(0)).toBe("require_input");
      expect(getConfidenceLevel(49)).toBe("require_input");
    });
  });
});
