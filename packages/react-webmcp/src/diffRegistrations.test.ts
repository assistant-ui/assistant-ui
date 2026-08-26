import { describe, expect, it } from "vitest";
import { diffRegistrations } from "./diffRegistrations";

const entry = (description = "", inputSchemaJson = "{}") => ({
  description,
  inputSchemaJson,
});

describe("diffRegistrations", () => {
  it("reports new names as added", () => {
    expect(diffRegistrations({}, { a: entry() })).toEqual({
      added: ["a"],
      updated: [],
      removed: [],
    });
  });

  it("reports missing names as removed", () => {
    expect(diffRegistrations({ a: entry() }, {})).toEqual({
      added: [],
      updated: [],
      removed: ["a"],
    });
  });

  it("reports a description change as updated", () => {
    expect(diffRegistrations({ a: entry("old") }, { a: entry("new") })).toEqual(
      { added: [], updated: ["a"], removed: [] },
    );
  });

  it("reports a schema JSON change as updated", () => {
    expect(
      diffRegistrations(
        { a: entry("", '{"type":"object"}') },
        { a: entry("", '{"type":"object","properties":{}}') },
      ),
    ).toEqual({ added: [], updated: ["a"], removed: [] });
  });

  it("reports unchanged entries as a no-op", () => {
    expect(
      diffRegistrations({ a: entry("d", "{}") }, { a: entry("d", "{}") }),
    ).toEqual({ added: [], updated: [], removed: [] });
  });

  it("re-adds a name whose previous registration was skipped", () => {
    expect(
      diffRegistrations({ a: entry() }, { a: entry(), b: entry() }),
    ).toEqual({ added: ["b"], updated: [], removed: [] });
  });

  it("handles mixed changes in one pass", () => {
    expect(
      diffRegistrations(
        { keep: entry(), change: entry("old"), drop: entry() },
        { keep: entry(), change: entry("new"), fresh: entry() },
      ),
    ).toEqual({ added: ["fresh"], updated: ["change"], removed: ["drop"] });
  });
});
