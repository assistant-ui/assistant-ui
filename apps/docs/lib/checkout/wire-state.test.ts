import { describe, expect, it } from "vitest";
import { initialCheckoutState } from "./protocol";
import { IncompatibleCheckoutError, parseCheckoutState } from "./wire-state";

describe("checkout wire state", () => {
  it("passes a snapshot of the current version through unchanged", () => {
    const state = initialCheckoutState();
    expect(parseCheckoutState(state)).toBe(state);
  });

  it("treats a missing snapshot as still loading", () => {
    expect(parseCheckoutState(undefined)).toBeUndefined();
  });

  it.each([
    ["another version", { ...initialCheckoutState(), version: 1 }],
    ["a list that is not a list", { ...initialCheckoutState(), inputs: null }],
    [
      "a list entry that is not an object",
      { ...initialCheckoutState(), steps: ["s1"] },
    ],
    ["an unknown status", { ...initialCheckoutState(), status: "paid" }],
    ["a missing agent", { ...initialCheckoutState(), agent: null }],
    ["a non object", "state"],
  ])("rejects %s", (_, value) => {
    expect(() => parseCheckoutState(value)).toThrow(IncompatibleCheckoutError);
  });
});
