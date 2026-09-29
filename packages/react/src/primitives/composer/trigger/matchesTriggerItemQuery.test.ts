import { describe, it, expect } from "vitest";
import { matchesTriggerItemQuery } from "./matchesTriggerItemQuery";
import type { Unstable_TriggerItem } from "@assistant-ui/core";

const item = (
  overrides: Partial<Unstable_TriggerItem>,
): Unstable_TriggerItem => ({
  id: "summarize",
  type: "command",
  label: "Summarize",
  ...overrides,
});

describe("matchesTriggerItemQuery", () => {
  it("matches every item on an empty query", () => {
    expect(matchesTriggerItemQuery(item({}), "")).toBe(true);
  });

  it("matches case-insensitively against the id", () => {
    expect(
      matchesTriggerItemQuery(item({ id: "SummArize", label: "y" }), "marize"),
    ).toBe(true);
  });

  it("matches case-insensitively against the label", () => {
    expect(
      matchesTriggerItemQuery(
        item({ id: "x", label: "Translate Text" }),
        "late",
      ),
    ).toBe(true);
  });

  it("matches against the description when present", () => {
    expect(
      matchesTriggerItemQuery(
        item({ id: "x", label: "y", description: "Condense the thread" }),
        "condense",
      ),
    ).toBe(true);
  });

  it("does not match when no field contains the query", () => {
    expect(
      matchesTriggerItemQuery(item({ description: "nothing here" }), "zzz"),
    ).toBe(false);
  });

  it("does not throw on items without a description", () => {
    expect(matchesTriggerItemQuery(item({}), "zzz")).toBe(false);
  });
});
