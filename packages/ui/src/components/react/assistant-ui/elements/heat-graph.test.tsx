import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
