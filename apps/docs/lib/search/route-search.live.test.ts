import { describe, expect, it } from "vitest";
import { createDocsRouteSearch } from "./route-search";
import type { RoutePage } from "./route-query";

const enabled = process.env.RUN_JEV_SEARCH_EVAL === "1";

describe.skipIf(!enabled)("live docs route decisions", () => {
  it("routes natural-language searches across the published documentation", async () => {
    const response = await fetch("https://www.assistant-ui.com/api/search");
    expect(response.ok).toBe(true);
    const pages = (await response.json()) as RoutePage[];
    const apiKey = process.env.JEV_KEY;
    expect(apiKey).toBeTruthy();
    const search = createDocsRouteSearch({ pages, apiKey: apiKey! });
    for (const [query, expected] of [
      [
        "keep my conversations after refreshing the browser",
        /cloud|persist|history/,
      ],
      ["connect my LangGraph backend", /langgraph/],
      ["let people attach images to a message", /attachment|image/],
      ["best pizza restaurants near me", null],
    ] as const) {
      const start = performance.now();
      const results = await search(query, "All");
      console.info(
        JSON.stringify({
          query,
          urls: results.map((page) => page.url),
          ms: Math.round(performance.now() - start),
        }),
      );
      if (expected)
        expect(results.some((page) => expected.test(page.url))).toBe(true);
      else expect(results).toEqual([]);
    }
  }, 20_000);
});
