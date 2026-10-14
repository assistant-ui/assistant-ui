import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCENT, NEG, seqOpacity } from "../../core/theme";
import { Heatmap } from "./heatmap";

const marks = (html: string) =>
  [...html.matchAll(/<rect\b[^>]*>/g)].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        value,
      ]),
    ),
  );

describe("Heatmap calendar negatives", () => {
  it("colors losses separately and scales both signs by absolute magnitude", () => {
    const html = renderToStaticMarkup(
      <Heatmap
        mark="calendar"
        matrix={{
          rows: [""],
          cols: ["", "", "", ""],
          values: [[-0.2, -0.8, 0.4, 0]],
        }}
      />,
    );
    const cells = marks(html);
    expect(cells).toHaveLength(4);
    expect(cells.map((cell) => cell["data-i"])).toEqual(["0", "1", "2", "3"]);
    expect(Number(cells[0]?.opacity)).toBe(seqOpacity(0.2 / 0.8));
    expect(Number(cells[1]?.opacity)).toBe(seqOpacity(0.8 / 0.8));
    expect(Number(cells[1]?.opacity)).toBeGreaterThan(
      Number(cells[0]?.opacity),
    );
    expect(cells[0]?.fill).toBe(NEG);
    expect(cells[1]?.fill).toBe(NEG);
    expect(cells[2]?.fill).toBe(ACCENT);
    expect(Number(cells[2]?.opacity)).toBe(seqOpacity(0.4 / 0.8));
    expect(cells[3]?.fill).toBe(ACCENT);
    expect(Number(cells[3]?.opacity)).toBe(0.06);
  });

  it("preserves nonnegative calendar markup", () => {
    const html = renderToStaticMarkup(
      <Heatmap
        mark="calendar"
        width={120}
        matrix={{
          rows: [""],
          cols: ["", "", ""],
          values: [[0, 0.5, 2]],
        }}
      />,
    );
    expect(html).toBe(
      [
        '<svg viewBox="0 0 120 72" width="120" height="72" font-size="11" aria-hidden="true" data-dg="" style="display:block;max-width:100%;height:auto;font-family:var(--dg-font, inherit);font-variant-numeric:tabular-nums">',
        '<rect x="16" y="24.1" width="24.33" height="20.9" rx="4" fill="var(--dg-c1, #3b82f6)" opacity="0.06" data-part="mark" data-i="0" data-i2="0"></rect>',
        '<rect x="44.33" y="24.1" width="24.33" height="20.9" rx="4" fill="var(--dg-c1, #3b82f6)" opacity="0.315" data-part="mark" data-i="1" data-i2="0"></rect>',
        '<rect x="72.67" y="24.1" width="24.33" height="20.9" rx="4" fill="var(--dg-c1, #3b82f6)" opacity="0.9" data-part="mark" data-i="2" data-i2="0"></rect></svg>',
      ].join(""),
    );
  });
});
