import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useHeatGraphContext } from "../context";
import { Root } from "./Root";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function LastDay() {
  const { cells } = useHeatGraphContext();
  return (
    <span data-testid="last-day">{cells.at(-1)?.date.toDateString()}</span>
  );
}

it("prerenders an omitted end from data independently of the clock, then follows today", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const graph = (
    <Root data={[{ date: "2025-01-15", count: 5 }]}>
      <LastDay />
    </Root>
  );

  vi.setSystemTime(new Date(2026, 0, 10, 12));
  const first = renderToString(graph);
  vi.setSystemTime(new Date(2027, 1, 11, 12));
  const second = renderToString(graph);

  expect(first).toBe(second);
  expect(first).toContain("Wed Jan 15 2025");
  expect(first).not.toContain("2026");
  expect(first).not.toContain("2027");

  render(graph);
  expect(screen.getByTestId("last-day").textContent).toBe("Thu Feb 11 2027");
});

it("keeps an explicit end in the server output", () => {
  const html = renderToString(
    <Root data={[]} end="2025-01-15">
      <LastDay />
    </Root>,
  );
  expect(html).toContain("Wed Jan 15 2025");
});

it("prerenders an empty grid without a clock-derived end", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const graph = (
    <Root data={[]}>
      <LastDay />
    </Root>
  );

  vi.setSystemTime(new Date(2026, 0, 10, 12));
  const first = renderToString(graph);
  vi.setSystemTime(new Date(2027, 1, 11, 12));
  expect(renderToString(graph)).toBe(first);
  expect(first).not.toContain("2026");
  expect(first).not.toContain("2027");

  render(graph);
  expect(screen.getByTestId("last-day").textContent).toBe("Thu Feb 11 2027");
});
