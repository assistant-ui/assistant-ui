import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotWorldMap, WORLD, WORLD_HEIGHT, WorldMap } from "./index";
import { DOTS } from "./world-dots";

describe("WorldMap", () => {
  it("ships plausible pre-projected geometry", () => {
    expect(WORLD.length).toBeGreaterThan(150);
    expect(WORLD_HEIGHT).toBeGreaterThan(80);
    const isos = new Set(WORLD.map((c) => c.iso));
    for (const iso of ["CN", "US", "BR", "DE", "IN", "JP", "AU"]) {
      expect(isos.has(iso)).toBe(true);
    }
    for (const country of WORLD) {
      expect(country.d.startsWith("M")).toBe(true);
      expect(country.d.includes("NaN")).toBe(false);
    }
  });

  it("renders every country as an ISO-addressed mark", () => {
    const html = renderToStaticMarkup(
      <WorldMap title="usage" values={{ CN: 64, US: 37 }} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain('data-series="CN"');
    expect(html).toContain('data-series="US"');
    expect((html.match(/data-part="mark"/g) ?? []).length).toBe(WORLD.length);
    expect(html).not.toContain("NaN");
  });
});

describe("DotWorldMap", () => {
  it("renders grouped halftone countries and flow trails", () => {
    const html = renderToStaticMarkup(
      <DotWorldMap
        title="clusters"
        groups={{ primary: ["US"], replica: ["AU"] }}
        flows={[{ from: "US", to: "AU" }]}
      />,
    );
    expect(html).toContain('data-series="US"');
    expect(html).toContain('data-series2="AU"');
    expect(html).toContain("color-mix");
    expect(html).not.toContain("NaN");
  });

  it("draws each country's halftone as a few paths rather than an element per dot", () => {
    const html = renderToStaticMarkup(
      <DotWorldMap title="footprint" groups={{ shipping: ["US", "JP"] }} />,
    );
    const marks = [
      ...html.matchAll(
        /<g data-part="mark" data-series="(\w+)"[^>]*>(.*?)<\/g>/g,
      ),
    ];

    expect(html).not.toContain("<circle");
    expect(html).not.toContain("NaN");
    // ~4,200 glyphs; an element per glyph would be several times this.
    expect(html.length).toBeLessThan(150_000);
    expect(new Set(marks.map((mark) => mark[1])).size).toBe(marks.length);
    // One path per glyph kind: dots, squares and rings.
    for (const mark of marks) {
      expect(mark[2]!.match(/<path\b/g)?.length).toBeLessThanOrEqual(3);
    }
    // Every dot of the grid is still drawn: each glyph starts with one move.
    const glyphs = marks
      .flatMap((mark) => [...mark[2]!.matchAll(/ d="([^"]+)"/g)])
      .reduce((sum, d) => sum + (d[1]!.match(/M/g)?.length ?? 0), 0);
    expect(glyphs).toBe(DOTS.length / 3);

    // A translucent stroke on a zero-length segment paints darker in WebKit,
    // so the alpha rides on each path's opacity instead.
    const us = marks.find((mark) => mark[1] === "US")![0];
    const fr = marks.find((mark) => mark[1] === "FR")![0];
    expect(us).toContain('stroke="var(--dg-c1, #3b82f6)"');
    expect(us.match(/<path [^>]*opacity="0.9"/g)).toHaveLength(
      us.match(/<path/g)!.length,
    );
    expect(fr.match(/<path [^>]*opacity="0.22"/g)).toHaveLength(
      fr.match(/<path/g)!.length,
    );
  });
});
