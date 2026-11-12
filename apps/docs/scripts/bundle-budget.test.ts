import { describe, expect, it } from "vitest";
import {
  checkBudgets,
  formatBudgetReport,
  parseRouteBundleStats,
} from "./bundle-budget.mts";

const stats = parseRouteBundleStats([
  { route: "/", firstLoadChunkPaths: ["a.js", "b.js"] },
  { route: "/docs/[[...slug]]", firstLoadChunkPaths: ["a.js", "c.js"] },
]);
const sizes: Record<string, number> = { "a.js": 100, "b.js": 50, "c.js": 400 };
const gzipSize = (chunkPath: string) => sizes[chunkPath]!;

describe("checkBudgets", () => {
  it("sums each route's first-load chunks", () => {
    expect(
      checkBudgets(stats, gzipSize, { "/": 200, "/docs/[[...slug]]": 450 }),
    ).toEqual([
      { route: "/", gzipBytes: 150, budget: 200 },
      { route: "/docs/[[...slug]]", gzipBytes: 500, budget: 450 },
    ]);
  });

  it("reports a budgeted route the build did not emit", () => {
    expect(checkBudgets(stats, gzipSize, { "/gone": 1 })).toEqual([
      { route: "/gone", gzipBytes: null, budget: 1 },
    ]);
  });
});

describe("formatBudgetReport", () => {
  it("passes when every route is within budget", () => {
    const { ok, report } = formatBudgetReport([
      { route: "/", gzipBytes: 150, budget: 200 },
    ]);
    expect(ok).toBe(true);
    expect(report).toContain("ok       /: 0.1 kB / 0.2 kB");
  });

  it("fails on a route over budget or missing", () => {
    expect(
      formatBudgetReport([{ route: "/", gzipBytes: 201, budget: 200 }]).ok,
    ).toBe(false);
    const missing = formatBudgetReport([
      { route: "/gone", gzipBytes: null, budget: 1 },
    ]);
    expect(missing.ok).toBe(false);
    expect(missing.report).toContain("MISSING  /gone");
  });
});

describe("parseRouteBundleStats", () => {
  it("rejects a malformed file", () => {
    expect(() => parseRouteBundleStats({})).toThrow();
    expect(() => parseRouteBundleStats([{ route: "/" }])).toThrow();
    expect(() =>
      parseRouteBundleStats([{ route: "/", firstLoadChunkPaths: [null] }]),
    ).toThrow();
  });
});
