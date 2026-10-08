import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeatGraph } from "./heat-graph";

afterEach(cleanup);

const today = new Date();
const DATA = Array.from({ length: 40 }, (_, index) => ({
  date: new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - index,
  ),
  count: index % 9,
}));

describe("HeatGraph", () => {
  it("tints cells and legend swatches with theme tokens instead of fixed colors", () => {
    const { container } = render(<HeatGraph data={DATA} />);

    const swatches = Array.from(
      container.querySelectorAll<HTMLElement>(".rounded-sm"),
    );
    expect(swatches.length).toBeGreaterThan(365);
    for (const swatch of swatches) {
      expect(swatch.style.backgroundColor).toBe("");
    }
    expect(
      swatches.some((swatch) =>
        swatch.classList.contains("bg-foreground/[0.06]"),
      ),
    ).toBe(true);
    expect(
      swatches.some((swatch) => swatch.classList.contains("dark:bg-blue-400")),
    ).toBe(true);
  });

  it("scrolls the month labels and grid together when the card is narrow", () => {
    const { container } = render(<HeatGraph data={DATA} />);

    const scroller = container.querySelector(".overflow-x-auto");
    expect(scroller).not.toBeNull();
    const months = Array.from(
      container.querySelectorAll('span[style*="grid-column"]'),
    );
    expect(months.length).toBeGreaterThan(1);
    for (const month of months) {
      expect(scroller?.contains(month)).toBe(true);
    }
    expect(scroller?.querySelector(".rounded-sm")).not.toBeNull();
  });

  it("opens the scrollable grid on the newest weeks", () => {
    const { container } = render(<HeatGraph data={DATA} />);

    const scroller = container.querySelector(".overflow-x-auto");
    expect(scroller?.classList.contains("flex-row-reverse")).toBe(true);
    expect(
      scroller?.querySelector('[style*="grid-template-columns"]'),
    ).not.toBeNull();
  });

  it("labels a month once a calendar week has passed, across a DST change", () => {
    const timeZone = process.env["TZ"];
    process.env["TZ"] = "America/New_York";
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 2, 9, 0, 30));
      render(<HeatGraph data={[]} />);

      expect(screen.queryAllByText("Mar")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
      if (timeZone === undefined) delete process.env["TZ"];
      else process.env["TZ"] = timeZone;
    }
  });

  it("keeps the month labels on the grid's window after midnight passes", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 5, 7, 23, 59));
      const data: { date: Date; count: number }[] = [];
      const { rerender } = render(<HeatGraph data={data} />);
      const labels = screen.queryAllByText("Jun").length;

      vi.setSystemTime(new Date(2026, 5, 8, 0, 1));
      rerender(<HeatGraph data={data} />);

      expect(screen.queryAllByText("Jun")).toHaveLength(labels);
    } finally {
      vi.useRealTimers();
    }
  });

  it("labels each month at its first week, never two within a week of each other", () => {
    const { container } = render(<HeatGraph data={DATA} />);

    const totalWeeks = Number(
      container
        .querySelector('[style*="grid-template-columns"]')
        ?.getAttribute("style")
        ?.match(/repeat\((\d+)/)?.[1],
    );
    const columns = Array.from(
      container.querySelectorAll('span[style*="grid-column"]'),
      (month) =>
        Number(month.getAttribute("style")?.match(/grid-column: (\d+)/)?.[1]),
    );
    expect(totalWeeks).toBeGreaterThanOrEqual(52);
    expect(columns.length).toBeGreaterThanOrEqual(11);
    columns.forEach((column, index) => {
      expect(column).toBeLessThan(totalWeeks);
      if (index > 0) expect(column - columns[index - 1]!).toBeGreaterThan(2);
    });
  });
});
