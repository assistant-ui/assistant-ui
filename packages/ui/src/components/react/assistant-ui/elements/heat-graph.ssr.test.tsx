import { cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { HeatGraph } from "./heat-graph";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("prerenders an omitted end independently of the clock, then shows today's window", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const graph = <HeatGraph data={[{ date: "2025-01-15", count: 5 }]} />;

  vi.setSystemTime(new Date(2026, 0, 10, 12));
  const first = renderToString(graph);
  vi.setSystemTime(new Date(2027, 1, 11, 12));
  const second = renderToString(graph);

  expect(first).toBe(second);
  expect(first).not.toContain("2026");
  expect(first).not.toContain("2027");
  expect(first).toMatch(/class="aspect-square[^"]*bg-blue-500/);

  const { container } = render(graph);
  expect(container.querySelectorAll(".rounded-sm").length).toBeGreaterThan(365);
  expect(container.querySelectorAll(".aspect-square.bg-blue-500")).toHaveLength(
    0,
  );
});

it("keeps an empty graph empty in server HTML until mount", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const graph = <HeatGraph data={[]} />;

  vi.setSystemTime(new Date(2026, 0, 10, 12));
  const first = renderToString(graph);
  vi.setSystemTime(new Date(2027, 1, 11, 12));
  const second = renderToString(graph);

  expect(first).toBe(second);
  expect(first).not.toContain("aspect-square");

  const { container } = render(graph);
  expect(container.querySelectorAll(".aspect-square").length).toBeGreaterThan(
    365,
  );
});
