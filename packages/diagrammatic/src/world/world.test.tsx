import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotWorldMap, WORLD, WORLD_HEIGHT, WorldMap } from "./index";

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
});
