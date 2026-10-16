import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { frame } from "../svg";
import { Column } from "./column";

describe("Column single log value", () => {
  const F = frame({}, 5 / 3, { labels: true, ticks: false });

  it.each([1, 3])(
    "draws columns to the plot middle for %s identical value(s)",
    (count) => {
      const html = renderToStaticMarkup(
        <Column
          yScale="log"
          items={Array.from({ length: count }, (_, i) => ({
            label: String(i),
            value: 10,
          }))}
        />,
      );
      const marks = [
        ...html.matchAll(
          /<g[^>]*data-part="mark"[^>]*><rect[^>]*height="([^"]+)"/g,
        ),
      ];
      expect(marks).toHaveLength(count);
      for (const mark of marks) {
        const height = Number(mark[1]);
        expect(Number.isFinite(height)).toBe(true);
        expect(height).toBeCloseTo((F.bottom - F.top) / 2, 1);
      }
    },
  );
});
