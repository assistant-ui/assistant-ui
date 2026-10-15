import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Gauge } from "./gauge";

describe("Gauge at small widths", () => {
  it.each([100, 48, 40])(
    "keeps the %ipx dial arcs inside the frame",
    (width) => {
      const html = renderToStaticMarkup(
        <Gauge value={0.68} width={width} label="rpm" redline={0.8} />,
      );
      const height = Number(/<svg[^>]* height="([^"]+)"/.exec(html)?.[1]);
      const paths = [
        ...html.matchAll(/<path[^>]*data-part="(?:grid|mark)"[^>]*>/g),
      ];
      expect(paths).toHaveLength(3);
      const centerY = Number(/d="M[-\d.]+ ([-\d.]+) A/.exec(paths[0]![0])?.[1]);

      for (const [path] of paths) {
        const d = /d="M[^A]+A([-\d.]+) ([-\d.]+)/.exec(path);
        const stroke = /stroke-width="([-\d.]+)"/.exec(path);
        expect(d).not.toBeNull();
        expect(stroke).not.toBeNull();
        expect(Number(d![1])).toBeGreaterThan(0);
        expect(Number(d![2])).toBeGreaterThan(0);
        expect(Number(stroke![1])).toBeGreaterThan(0);
        const reach = Number(d![1]) + Number(stroke![1]) / 2;
        expect(width / 2 - reach).toBeGreaterThanOrEqual(0);
        expect(width / 2 + reach).toBeLessThanOrEqual(width);
        expect(centerY - reach).toBeGreaterThanOrEqual(0);
        expect(centerY + Number(stroke![1]) / 2).toBeLessThanOrEqual(height);
      }

      const dial = paths[0]![0];
      const geometry = /d="M([-\d.]+) ([-\d.]+) A([-\d.]+)/.exec(dial);
      expect(geometry).not.toBeNull();
      const startX = Number(geometry![1]);
      const arcY = Number(geometry![2]);
      const radius = Number(geometry![3]);
      const halfStroke = Number(/stroke-width="([-\d.]+)"/.exec(dial)?.[1]) / 2;
      expect(startX - halfStroke).toBeGreaterThanOrEqual(0);
      expect(startX + 2 * radius + halfStroke).toBeLessThanOrEqual(width);
      expect(arcY - radius - halfStroke).toBeGreaterThanOrEqual(0);
      expect(arcY + halfStroke).toBeLessThanOrEqual(height);
      expect(html).not.toContain(">rpm</text>");
    },
  );

  it("keeps the 200px dial label clear of the value", () => {
    const html = renderToStaticMarkup(
      <Gauge value={0.68} width={200} label="rpm" />,
    );
    const valueY = Number(
      /<text[^>]*y="([\d.]+)"[^>]*>68%<\/text>/.exec(html)?.[1],
    );
    const dialLabel = /<text[^>]*>rpm<\/text>/.exec(html)?.[0];
    expect(dialLabel).toBeDefined();
    const labelY = Number(/y="([\d.]+)"/.exec(dialLabel!)?.[1]);
    const labelSize = Number(/font-size="([\d.]+)em"/.exec(dialLabel!)?.[1]);
    const baseSize = Number(/<svg[^>]*font-size="([\d.]+)"/.exec(html)?.[1]);
    expect(labelY - valueY).toBeGreaterThanOrEqual(labelSize * baseSize * 0.75);
  });

  it.each([false, true])(
    "keeps the 200px value text at main's size (needle=%s)",
    (needle) => {
      const html = renderToStaticMarkup(
        <Gauge value={0.68} width={200} needle={needle} />,
      );
      expect(/font-size="([\d.]+em)"[^>]*>68%<\/text>/.exec(html)?.[1]).toBe(
        "1.4em",
      );
    },
  );
});
