import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Bar } from "./bar";

describe("Bar single log value", () => {
  it("draws a bar to the plot middle", () => {
    const html = renderToStaticMarkup(
      <Bar xScale="log" items={[{ label: "A", value: 10 }]} />,
    );
    const grid = /<line[^>]*x1="([^"]+)"[^>]*data-part="grid"/.exec(html);
    const mark =
      /<g[^>]*data-part="mark"[^>]*><text[^>]*>[^<]*<\/text><rect[^>]*width="([^"]+)"/.exec(
        html,
      );
    expect(grid).not.toBeNull();
    expect(mark).not.toBeNull();
    const left = Number(grid![1]);
    const width = Number(mark![1]);
    const svgWidth = Number(/<svg[^>]*width="([^"]+)"/.exec(html)?.[1]);
    expect(width).toBeGreaterThan(2);
    expect(left + width).toBeGreaterThan(left + (svgWidth - left) * 0.45);
    expect(left + width).toBeLessThan(left + (svgWidth - left) * 0.55);
  });
});
