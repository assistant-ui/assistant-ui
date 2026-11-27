import { describe, expect, it } from "vitest";
import {
  checkHtmlBudget,
  formatHtmlBudgetReport,
  routeFromServerPath,
} from "./html-budget.mts";

describe("routeFromServerPath", () => {
  it("maps the default prerender files to routes", () => {
    expect(routeFromServerPath("app/index.html")).toBe("/");
    expect(routeFromServerPath("app/docs.html")).toBe("/docs");
    expect(routeFromServerPath("app/docs/runtimes/ai-sdk/v7.html")).toBe(
      "/docs/runtimes/ai-sdk/v7",
    );
    expect(routeFromServerPath("app\\changelog\\2.html")).toBe("/changelog/2");
  });

  it("maps a deployment adapter's route cache files to routes", () => {
    const hash = "a".repeat(64);
    expect(
      routeFromServerPath(`route-cache/APP_PAGE/${hash}/$/index.html`),
    ).toBe("/");
    expect(
      routeFromServerPath(
        `route-cache/APP_PAGE/${hash}/$/docs/architecture.html`,
      ),
    ).toBe("/docs/architecture");
  });

  it("skips files that are not prerendered pages", () => {
    expect(routeFromServerPath("app/docs/architecture.rsc")).toBeNull();
    expect(routeFromServerPath("pages/404.html")).toBeNull();
    expect(
      routeFromServerPath("route-cache/APP_ROUTE/abc/$/styles/x.html"),
    ).toBeNull();
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

  it("counts a route found twice once, at its largest", () => {
    const results = checkHtmlBudget(
      [...pages, { route: "/a", bytes: 950 }],
      1_000,
      {},
    );
    expect(results.filter((r) => r.route === "/a")).toEqual([
      { route: "/a", bytes: 950, limit: 1_000, over: false },
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
