import { describe, expect, it } from "vitest";
import { ring } from "./geometry";

type Point = [number, number];
type Arc = { from: Point; to: Point; sweep: number };

const arcsOf = (d: string): Arc[] => {
  const arcs: Arc[] = [];
  let pen: Point = [0, 0];
  let subpathStart: Point = pen;
  for (const [, command, args] of d.matchAll(/([MALZ])([^MALZ]*)/g)) {
    const n = args!.trim().split(/\s+/).filter(Boolean).map(Number);
    if (command === "M") {
      pen = [n[0]!, n[1]!];
      subpathStart = pen;
    } else if (command === "L") {
      pen = [n[0]!, n[1]!];
    } else if (command === "A") {
      const to: Point = [n[5]!, n[6]!];
      arcs.push({ from: pen, to, sweep: n[4]! });
      pen = to;
    } else {
      pen = subpathStart;
    }
  }
  return arcs;
};

const expectDrawable = (d: string) => {
  const arcs = arcsOf(d);
  expect(arcs.length).toBeGreaterThan(0);
  for (const arc of arcs) expect(arc.to).not.toEqual(arc.from);
};

const TURN = Math.PI * 2;

describe("ring full turn", () => {
  it("keeps the path of a partial sector", () => {
    expect(ring(100, 100, 40, 80, 0, Math.PI)).toBe(
      "M100 20 A80 80 0 0 1 100 180 L100 140 A40 40 0 0 0 100 60 Z",
    );
    expect(ring(100, 100, 40, 80, 0, 1.5 * Math.PI)).toBe(
      "M100 20 A80 80 0 1 1 20 100 L60 100 A40 40 0 1 0 100 60 Z",
    );
  });

  it("draws a full-turn pie as one closed circle without a radial edge", () => {
    const d = ring(100, 100, 0.001, 80, 0, TURN);

    expectDrawable(d);
    expect(d).not.toContain("L");
    expect(arcsOf(d).map((arc) => arc.to)).toEqual([
      [100, 180],
      [100, 20],
    ]);
  });

  it("keeps the hole of a full-turn donut by winding the inner circle the other way", () => {
    const d = ring(100, 100, 40, 80, 0, TURN);
    const arcs = arcsOf(d);

    expectDrawable(d);
    expect(d).not.toContain("L");
    expect(d.match(/M/g)).toHaveLength(2);
    expect(arcs.map((arc) => [arc.to, arc.sweep])).toEqual([
      [[100, 180], 1],
      [[100, 20], 1],
      [[100, 140], 0],
      [[100, 60], 0],
    ]);
  });

  it("closes the circle when the turn starts away from twelve o'clock", () => {
    const d = ring(100, 100, 40, 80, 1.2, 1.2 + TURN);

    expectDrawable(d);
    expect(d).not.toContain("L");
  });

  it("draws a sector that rounding closes on itself as the full circle", () => {
    const share = 1_000_000 / 1_000_001;
    const d = ring(211, 199.05, 0.001, 170.95, 0, share * TURN);

    expectDrawable(d);
    expect(d).toBe(ring(211, 199.05, 0.001, 170.95, 0, TURN));
  });

  it("keeps the hole when only the near-full inner arc rounds closed", () => {
    const d = ring(211, 199.05, 106, 170.95, 0, (150_000 / 150_001) * TURN);

    expect(d).toBe(
      "M211 28.1 A170.95 170.95 0 1 1 210.99 28.1 L211 93.05 A106 106 0 0 0 211 305.05 A106 106 0 0 0 211 93.05 Z",
    );
    expectDrawable(d);
  });

  it("keeps the path when both near-full arcs have distinct endpoints", () => {
    expect(ring(100, 100, 40, 80, 0, (999 / 1_000) * TURN)).toBe(
      "M100 20 A80 80 0 1 1 99.5 20 L99.75 60 A40 40 0 1 0 100 60 Z",
    );
  });

  it("leaves a tiny sector with coinciding endpoints as a sector", () => {
    expect(ring(211, 199.05, 106, 170.95, 0, 1e-6)).toBe(
      "M211 28.1 A170.95 170.95 0 0 1 211 28.1 L211 93.05 A106 106 0 0 0 211 93.05 Z",
    );
  });

  it("leaves a sliver that rounds to a point as a sector", () => {
    expect(ring(100, 100, 40, 80, 0, 1e-6)).toBe(
      "M100 20 A80 80 0 0 1 100 20 L100 60 A40 40 0 0 0 100 60 Z",
    );
  });
});
