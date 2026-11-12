import { describe, expect, it } from "vitest";
import { SizeGuard } from "./size-guard.js";

const r = (width: number, height: number) => ({
  width,
  height,
  minContent: 0,
  maxContent: 0,
});

describe("SizeGuard", () => {
  it("passes heights through when nothing oscillates", () => {
    const g = new SizeGuard();
    expect(g.report(r(300, 100), 0)).toBe(100);
    expect(g.report(r(300, 120), 10)).toBe(120);
    expect(g.report(r(280, 140), 20)).toBe(140);
    expect(g.pinned).toBe(false);
  });

  it("pins the larger height when the width flips between two values", () => {
    const g = new SizeGuard();
    const heights: number[] = [];
    for (let i = 0; i < 8; i++)
      heights.push(
        i % 2 === 0
          ? g.report(r(300, 300), i * 16)
          : g.report(r(285, 285), i * 16),
      );
    expect(g.pinned).toBe(true);
    // Once pinned, the narrow width keeps the tall height: the scrollbar stays.
    expect(g.report(r(285, 285), 200)).toBe(300);
    expect(g.report(r(285, 285), 2000)).toBe(300);
  });

  it("releases the pin when the host width really changes", () => {
    const g = new SizeGuard();
    for (let i = 0; i < 8; i++)
      g.report(i % 2 === 0 ? r(300, 300) : r(285, 285), i * 16);
    expect(g.pinned).toBe(true);
    expect(g.report(r(200, 200), 300)).toBe(200);
    expect(g.pinned).toBe(false);
  });

  it("releases the pin when the content changes at the same width", () => {
    const g = new SizeGuard();
    for (let i = 0; i < 8; i++)
      g.report(i % 2 === 0 ? r(300, 300) : r(285, 285), i * 16);
    expect(g.report(r(285, 400), 300)).toBe(400);
    expect(g.pinned).toBe(false);
  });

  it("ignores slow alternation outside the window", () => {
    const g = new SizeGuard(1000, 4);
    for (let i = 0; i < 8; i++)
      g.report(i % 2 === 0 ? r(300, 300) : r(285, 285), i * 600);
    expect(g.pinned).toBe(false);
  });
});
