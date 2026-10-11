import { describe, expect, it } from "vitest";
import {
  boundsOf,
  decadeTicks,
  niceStep,
  niceTicks,
  resolveTicks,
  tickValues,
  upperBound,
  wantsTicks,
} from "./scale";

describe("niceStep", () => {
  it("lands on the nearest 1-2-5 rung", () => {
    expect(niceStep(0.9)).toBe(1);
    expect(niceStep(1.4)).toBe(1);
    expect(niceStep(1.5)).toBe(2);
    expect(niceStep(3.5)).toBe(5);
    expect(niceStep(8)).toBe(10);
    expect(niceStep(230)).toBe(200);
  });

  it("survives a degenerate span", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
  });
});

describe("niceTicks", () => {
  it("rounds a domain onto the ladder", () => {
    expect(niceTicks(0, 1000, 4).map((tick) => tick.at)).toEqual([
      0, 200, 400, 600, 800, 1000,
    ]);
  });

  it("stays inside the domain instead of stretching it", () => {
    const ticks = niceTicks(3, 47, 4);
    expect(ticks[0]!.at).toBeGreaterThanOrEqual(3);
    expect(ticks[ticks.length - 1]!.at).toBeLessThanOrEqual(47);
  });

  it("labels through the given format", () => {
    expect(niceTicks(0, 4000, 4, (v) => `${v / 1000}k`)[4]).toEqual({
      at: 4000,
      label: "4k",
    });
  });

  it("collapses a flat domain to one tick", () => {
    expect(niceTicks(5, 5)).toEqual([{ at: 5, label: "5" }]);
  });
});

describe("decadeTicks", () => {
  it("returns the powers of ten inside the domain", () => {
    expect(decadeTicks(3, 4200).map((tick) => tick.at)).toEqual([
      10, 100, 1000,
    ]);
  });

  it("refuses a domain that reaches zero", () => {
    expect(decadeTicks(0, 100)).toEqual([]);
  });
});

describe("resolveTicks", () => {
  it("passes an explicit ladder through untouched", () => {
    const ladder = [{ at: 7, label: "seven" }];
    expect(resolveTicks(ladder, 0, 10)).toBe(ladder);
  });

  it("counts in decades on log paper", () => {
    expect(resolveTicks(3, 1, 10000, "log")!.map((t) => t.at)).toEqual([
      1, 10, 100, 1000, 10000,
    ]);
  });

  it("draws nothing when no axis was asked for", () => {
    expect(resolveTicks(undefined, 0, 10)).toBeUndefined();
    expect(resolveTicks(0, 0, 10)).toBeUndefined();
  });
});

describe("tick requests", () => {
  it("reads whether an axis was asked for", () => {
    expect(wantsTicks(undefined)).toBe(false);
    expect(wantsTicks([])).toBe(false);
    expect(wantsTicks(0)).toBe(false);
    expect(wantsTicks(4)).toBe(true);
    expect(wantsTicks([{ at: 1, label: "1" }])).toBe(true);
  });

  it("seeds a domain from an explicit ladder only", () => {
    expect(tickValues([{ at: 12, label: "12" }])).toEqual([12]);
    expect(tickValues(4)).toEqual([]);
  });
});

describe("domains", () => {
  it("takes the data, the explicit ladder, and the guides", () => {
    expect(upperBound([4, 9])).toBe(9);
    expect(upperBound([4, 9], [{ at: 20, label: "20" }])).toBe(20);
    expect(upperBound([4, 9], undefined, [{ at: 30 }])).toBe(30);
  });

  it("ignores a tick count, which is resolved against the domain instead", () => {
    expect(upperBound([4, 9], 4)).toBe(9);
  });

  it("never falls below the floor", () => {
    expect(upperBound([])).toBe(1);
    expect(upperBound([0.2], undefined, undefined, 10)).toBe(10);
  });

  it("reconciles the same three sources on a free axis", () => {
    expect(boundsOf([4, 9], [{ at: 1, label: "1" }], [{ at: 30 }])).toEqual([
      1, 30,
    ]);
  });
});
