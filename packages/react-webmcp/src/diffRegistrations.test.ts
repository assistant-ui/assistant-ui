import { describe, expect, it } from "vitest";
import {
  diffRegistrations,
  type WebMcpRegistrationEntry,
} from "./diffRegistrations";

const entry = (description = "", inputSchemaJson = "{}") => ({
  description,
  inputSchemaJson,
});

const map = (
  entries: Record<string, WebMcpRegistrationEntry> = {},
): Map<string, WebMcpRegistrationEntry> => new Map(Object.entries(entries));

describe("diffRegistrations", () => {
  it("reports new names as added", () => {
    expect(diffRegistrations(map(), map({ a: entry() }))).toEqual({
      added: ["a"],
      updated: [],
      removed: [],
    });
  });

  it("reports missing names as removed", () => {
    expect(diffRegistrations(map({ a: entry() }), map())).toEqual({
      added: [],
      updated: [],
      removed: ["a"],
    });
  });

  it("reports a description change as updated", () => {
    expect(
      diffRegistrations(map({ a: entry("old") }), map({ a: entry("new") })),
    ).toEqual({ added: [], updated: ["a"], removed: [] });
  });

  it("reports a schema JSON change as updated", () => {
    expect(
      diffRegistrations(
        map({ a: entry("", '{"type":"object"}') }),
        map({ a: entry("", '{"type":"object","properties":{}}') }),
      ),
    ).toEqual({ added: [], updated: ["a"], removed: [] });
  });

  it("reports unchanged entries as a no-op", () => {
    expect(
      diffRegistrations(map({ a: entry("d", "{}") }), map({ a: entry("d") })),
    ).toEqual({ added: [], updated: [], removed: [] });
  });

  it("re-adds a name whose previous registration was skipped", () => {
    expect(
      diffRegistrations(map({ a: entry() }), map({ a: entry(), b: entry() })),
    ).toEqual({ added: ["b"], updated: [], removed: [] });
  });

  it("handles mixed changes in one pass", () => {
    expect(
      diffRegistrations(
        map({ keep: entry(), change: entry("old"), drop: entry() }),
        map({ keep: entry(), change: entry("new"), fresh: entry() }),
      ),
    ).toEqual({ added: ["fresh"], updated: ["change"], removed: ["drop"] });
  });

  it.each(["__proto__", "constructor", "toString"])(
    "detects removal of a tool named %s",
    (name) => {
      expect(
        diffRegistrations(new Map([[name, entry("a")]]), new Map()).removed,
      ).toEqual([name]);
    },
  );

  it.each(["__proto__", "constructor", "toString"])(
    "treats a new tool named %s as added",
    (name) => {
      expect(
        diffRegistrations(new Map(), new Map([[name, entry("new")]])),
      ).toEqual({ added: [name], updated: [], removed: [] });
    },
  );
});
