import { describe, expect, it } from "vitest";
import {
  findXuluxSuggestion,
  XULUX_SUGGESTION_GROUPS,
  XULUX_SUGGESTIONS,
} from "./xulux-suggestions";

describe("XULUX_SUGGESTIONS", () => {
  it("contains all twelve landing suggestions", () => {
    expect(XULUX_SUGGESTION_GROUPS).toHaveLength(4);
    expect(XULUX_SUGGESTIONS).toHaveLength(12);
  });

  it("uses unique stable ids", () => {
    const ids = XULUX_SUGGESTIONS.map((suggestion) => suggestion.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("provides replay content for every suggestion", () => {
    for (const suggestion of XULUX_SUGGESTIONS) {
      expect(suggestion.prompt.length).toBeGreaterThan(0);
      expect(suggestion.replay.text.length).toBeGreaterThan(0);
      expect(findXuluxSuggestion(suggestion.id)).toBe(suggestion);
    }
  });

  it("returns no replay for an unknown id", () => {
    expect(findXuluxSuggestion("unknown")).toBeUndefined();
  });
});
