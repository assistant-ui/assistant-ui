import { describe, expect, it } from "vitest";
import {
  createInitialThreadMessageHeights,
  reconcileThreadMessageHeights,
} from "../primitives/thread/useThreadMessageHeights";

describe("thread message heights", () => {
  it("initializes unknown message keys with estimated height", () => {
    const heights = createInitialThreadMessageHeights(["a", "b"], 2);

    expect(heights).toEqual(
      new Map([
        ["a", 2],
        ["b", 2],
      ]),
    );
  });

  it("preserves measured heights stored in previous state", () => {
    const next = reconcileThreadMessageHeights({
      previousHeights: new Map([["a", 4]]),
      nextKeys: ["a"],
      estimatedHeight: 1,
    });

    expect(next.heights.get("a")).toBe(4);
  });

  it("preserves surviving message heights across message replacement", () => {
    const next = reconcileThreadMessageHeights({
      previousHeights: new Map([
        ["a", 2],
        ["b", 5],
      ]),
      nextKeys: ["b", "c"],
      estimatedHeight: 1,
    });

    expect(next.heights).toEqual(
      new Map([
        ["b", 5],
        ["c", 1],
      ]),
    );
    expect(next.keyOrder).toEqual(["b", "c"]);
  });

  it("evicts removed message keys", () => {
    const next = reconcileThreadMessageHeights({
      previousHeights: new Map([
        ["a", 2],
        ["b", 5],
      ]),
      nextKeys: ["b"],
      estimatedHeight: 1,
    });

    expect(next.heights).toEqual(new Map([["b", 5]]));
  });

  it("updates height for an existing streaming message key", () => {
    const next = reconcileThreadMessageHeights({
      previousHeights: new Map([["assistant-1", 7]]),
      nextKeys: ["assistant-1"],
      estimatedHeight: 1,
    });

    expect(next.heights.get("assistant-1")).toBe(7);
  });
});
