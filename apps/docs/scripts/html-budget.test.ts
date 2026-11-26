import { describe, expect, it } from "vitest";
import {
  checkHtmlBudget,
  formatHtmlBudgetReport,
  routeFromHtmlPath,
} from "./html-budget.mts";

describe("routeFromHtmlPath", () => {
  it("maps prerender files to routes", () => {
    expect(routeFromHtmlPath("index.html")).toBe("/");
    expect(routeFromHtmlPath("docs.html")).toBe("/docs");
    expect(routeFromHtmlPath("docs/runtimes/ai-sdk/v7.html")).toBe(
      "/docs/runtimes/ai-sdk/v7",
    );
    expect(routeFromHtmlPath("changelog\\2.html")).toBe("/changelog/2");
  });
});

describe("checkHtmlBudget", () => {
  const pages = [
    { route: "/a", bytes: 900 },
    { route: "/b", bytes: 1_200 },
    { route: "/c", bytes: 4_000 },
  ];

  it("flags pages over the budget, heaviest first", () => {
    const results = checkHtmlBudget(pages, 1_000, {});
    expect(results.map((r) => [r.route, r.over])).toEqual([
      ["/c", true],
      ["/b", true],
      ["/a", false],
    ]);
  });

  it("gives an excepted page its own ceiling", () => {
    const exceptions = { "/c": { bytes: 5_000 } };
    const results = checkHtmlBudget(pages, 1_000, exceptions);
    expect(results.find((r) => r.route === "/c")).toMatchObject({
      limit: 5_000,
      over: false,
    });
    const { ok, report } = formatHtmlBudgetReport(results, {
      budget: 1_000,
      exceptions,
    });
    expect(ok).toBe(false);
    expect(report).toContain("OVER");
    expect(report).toContain("/b");
  });

  it("passes when every page fits and reports the heaviest", () => {
    const results = checkHtmlBudget(pages, 5_000, {});
    const { ok, report } = formatHtmlBudgetReport(results, {
      budget: 5_000,
      heaviest: 2,
      exceptions: {},
    });
    expect(ok).toBe(true);
    expect(report).toContain("3 pages");
    expect(report).toContain("/c");
    expect(report).not.toContain("/a");
  });

  it("warns about an exception that is no longer needed", () => {
    const exceptions = { "/a": { bytes: 5_000 } };
    const results = checkHtmlBudget(pages, 1_000, exceptions);
    const { ok, report } = formatHtmlBudgetReport(
      results.filter((r) => r.route === "/a"),
      { budget: 1_000, exceptions },
    );
    expect(ok).toBe(true);
    expect(report).toContain("STALE");
  });

  it("fails when the build left no pages", () => {
    expect(formatHtmlBudgetReport([]).ok).toBe(false);
  });
});
