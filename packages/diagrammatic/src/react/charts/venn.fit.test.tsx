import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textWidth } from "../../core/text";
import { Venn } from "./venn";

const attribute = (tag: string, name: string): number => {
  const value = new RegExp(`${name}="([\\d.]+)"`).exec(tag)?.[1];
  expect(value, `${name} in ${tag}`).toBeDefined();
  return Number(value);
};

describe("Venn fit", () => {
  it("keeps both circles inside a square viewBox", () => {
    const html = renderToStaticMarkup(
      <Venn
        a={{ label: "A", value: 1 }}
        b={{ label: "B", value: 2 }}
        overlap={1}
        width={400}
        height={400}
      />,
    );
    const viewBox = /viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/.exec(html);
    expect(viewBox).not.toBeNull();
    const x = Number(viewBox![1]);
    const y = Number(viewBox![2]);
    const width = Number(viewBox![3]);
    const height = Number(viewBox![4]);
    const circles = [...html.matchAll(/<circle\b[^>]*>/g)].map(([tag]) => ({
      cx: attribute(tag, "cx"),
      cy: attribute(tag, "cy"),
      r: attribute(tag, "r"),
    }));
    expect(circles).toHaveLength(2);
    for (const { cx, cy, r } of circles) {
      expect(cx - r).toBeGreaterThanOrEqual(x);
      expect(cx + r).toBeLessThanOrEqual(x + width);
      expect(cy - r).toBeGreaterThanOrEqual(y);
      expect(cy + r).toBeLessThanOrEqual(y + height);
    }
  });

  it("keeps a mid-length side label in full at the default size", () => {
    const html = renderToStaticMarkup(
      <Venn
        a={{ label: "Desktop users", value: 1 }}
        b={{ label: "Mobile users", value: 2 }}
        overlap={1}
      />,
    );

    expect(html).toContain(">Desktop users</text>");
  });

  it("keeps long labels and values apart on each baseline", () => {
    const html = renderToStaticMarkup(
      <Venn
        a={{ label: "A very long first set label", value: 1 }}
        b={{ label: "A very long second set label", value: 2 }}
        overlap={3}
        format={(value) => `${value}12345678901234567890`}
      />,
    );
    const svg = /<svg\b[^>]*>/.exec(html)?.[0];
    expect(svg).toBeDefined();
    const baseSize = attribute(svg!, "font-size");
    const texts = [...html.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(
      ([, attrs, content]) => ({
        x: attribute(attrs!, "x"),
        y: attribute(attrs!, "y"),
        width: textWidth(
          content!,
          baseSize * Number(/font-size="([\d.]+)em"/.exec(attrs!)?.[1] ?? 1),
        ),
      }),
    );
    expect(texts).toHaveLength(6);
    const baselines = [...new Set(texts.map(({ y }) => y))];
    expect(baselines).toHaveLength(2);
    for (const y of baselines) {
      const row = texts
        .filter((text) => text.y === y)
        .sort((a, b) => a.x - b.x);
      expect(row).toHaveLength(3);
      for (let i = 0; i < row.length - 1; i++) {
        const left = row[i]!;
        const right = row[i + 1]!;
        expect(
          left.x + left.width / 2,
          `baseline ${y}, pair ${i}`,
        ).toBeLessThanOrEqual(right.x - right.width / 2);
      }
    }
  });
});
