import { describe, expect, it } from "vitest";
import {
  meanRows,
  pairNoise,
  rowVerdict,
  type BenchRow,
} from "./paired-compare.mjs";

const row = (id: string, mean: number, rme = 1): BenchRow => ({
  id,
  name: id,
  mean,
  hz: 1 / mean,
  rme,
  p99: mean * 2,
  samples: 10,
});

const run = (...rows: BenchRow[]) => new Map(rows.map((r) => [r.id, r]));

describe("meanRows", () => {
  it("averages means and keeps the most conservative rme", () => {
    const out = meanRows([run(row("a", 100, 2)), run(row("a", 300, 5))]);
    expect(out.get("a")!.mean).toBe(200);
    expect(out.get("a")!.rme).toBe(5);
    expect(out.get("a")!.samples).toBe(20);
  });

  it("averages over the runs where a benchmark is present", () => {
    const out = meanRows([
      run(row("a", 100), row("b", 10)),
      run(row("a", 200)),
    ]);
    expect(out.get("a")!.mean).toBe(150);
    expect(out.get("b")!.mean).toBe(10);
  });

  it("cancels linear drift from the side difference under C R R C slots", () => {
    // One suite run per time slot; a linear per-slot penalty k lands on
    // current at slots 0 and 3, on ref at slots 1 and 2. Equal slot sums
    // mean the drift term drops out of the difference of the side means.
    const base = 100;
    const k = 25;
    const curRuns = [run(row("a", base)), run(row("a", base + 3 * k))];
    const refRuns = [run(row("a", base + k)), run(row("a", base + 2 * k))];
    const cur = meanRows(curRuns).get("a")!.mean;
    const ref = meanRows(refRuns).get("a")!.mean;
    expect(cur).toBe(ref);
  });
});

describe("pairNoise", () => {
  it("equals the absolute pair-delta difference at two pairs", () => {
    const refRuns = [run(row("a", 100)), run(row("a", 100))];
    const curRuns = [run(row("a", 110)), run(row("a", 130))];
    // Pair deltas are +10% and +30%; 2×sd/√2 of two points is their range.
    expect(pairNoise(refRuns, curRuns).get("a")).toBeCloseTo(20);
  });

  it("reports zero noise when every pair agrees", () => {
    const refRuns = [run(row("a", 100)), run(row("a", 200))];
    const curRuns = [run(row("a", 120)), run(row("a", 240))];
    expect(pairNoise(refRuns, curRuns).get("a")).toBeCloseTo(0);
  });

  it("tightens instead of loosening as equally noisy pairs accumulate", () => {
    const two = pairNoise(
      [run(row("a", 100)), run(row("a", 100))],
      [run(row("a", 110)), run(row("a", 130))],
    ).get("a")!;
    const four = pairNoise(
      Array.from({ length: 4 }, () => run(row("a", 100))),
      [110, 130, 110, 130].map((m) => run(row("a", m))),
    ).get("a")!;
    expect(four).toBeLessThan(two);
  });

  it("omits benchmarks without at least two complete pairs", () => {
    const refRuns = [run(row("a", 100)), run()];
    const curRuns = [run(row("a", 110)), run(row("a", 120))];
    expect(pairNoise(refRuns, curRuns).has("a")).toBe(false);
  });
});

describe("rowVerdict", () => {
  it("verdicts a delta beyond every floor", () => {
    const out = rowVerdict(row("a", 100, 1), row("a", 110, 1));
    expect(out.verdict).toBe("SLOWER");
    expect(out.delta).toBeCloseTo(10);
    expect(out.noise).toBe(3);
  });

  it("verdicts FASTER when the second side is quicker", () => {
    expect(rowVerdict(row("a", 100, 1), row("a", 90, 1)).verdict).toBe(
      "FASTER",
    );
  });

  it("stays ~same inside the 3% absolute floor", () => {
    expect(rowVerdict(row("a", 100, 0), row("a", 102, 0)).verdict).toBe(
      "~same",
    );
  });

  it("lets 2x rme raise the floor past 3%", () => {
    const out = rowVerdict(row("a", 100, 4), row("a", 106, 1));
    expect(out.noise).toBe(8);
    expect(out.verdict).toBe("~same");
  });

  it("lets the pair spread dominate both other floors", () => {
    const out = rowVerdict(row("a", 100, 1), row("a", 120, 1), 25);
    expect(out.noise).toBe(25);
    expect(out.verdict).toBe("~same");
  });
});
