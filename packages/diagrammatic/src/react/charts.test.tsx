import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as dg from "../index";
import { FIXTURES, series } from "./testUtils";

describe("every chart form", () => {
  for (const [name, element] of Object.entries(FIXTURES)) {
    it(`${name} renders a marked, finite SVG`, () => {
      const html = renderToStaticMarkup(element);
      expect(html).toContain("<svg");
      expect(html).toContain('data-part="mark"');
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
      expect(html).not.toContain("undefined");
      // Alpha is a ratio, and a ratio carried at full precision prints digits
      // that are not identical on every platform.
      expect(html).not.toMatch(/opacity="[\d.]*\.\d{6,}"/);
    });
  }

  it("names the chart for assistive tech when title is given", () => {
    const html = renderToStaticMarkup(
      <dg.Line data={[1, 2, 3]} title="Monthly active users" />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Monthly active users"');
    expect(html).toContain("<title>Monthly active users</title>");
  });

  it("stays decorative without a title", () => {
    const html = renderToStaticMarkup(<dg.Line data={[1, 2, 3]} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });

  it("resolves every color through a --dg token", () => {
    const html = renderToStaticMarkup(<dg.StackedArea series={series} />);
    expect(html).toContain("var(--dg-c1, #3b82f6)");
    expect(html).not.toMatch(/(?:fill|stroke)="#(?!fff)/);
  });

  it("passes native svg props through and merges style", () => {
    const html = renderToStaticMarkup(
      <dg.Line
        data={[1, 2, 3]}
        data-testid="chart"
        aria-label="Signups"
        style={{ maxWidth: "20rem" }}
      />,
    );
    expect(html).toContain('data-testid="chart"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Signups"');
    expect(html).toContain("max-width:20rem");
    expect(html).toContain("display:block");
  });

  it("swallows unconsumed base props instead of leaking them to the svg", () => {
    const html = renderToStaticMarkup(
      <dg.Funnel
        items={[
          { label: "a", value: 10 },
          { label: "b", value: 4 },
        ]}
        format={(v) => `$${v}`}
        labels={["x", "y"]}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).not.toContain("format=");
    expect(html).not.toContain('labels="');
  });

  it("ignores a highlight pointing past the last dendrogram merge", () => {
    const html = renderToStaticMarkup(
      <dg.Dendrogram
        leaves={["a", "b", "c"]}
        merges={[
          { a: 0, b: 1, height: 1 },
          { a: 3, b: 2, height: 2 },
        ]}
        highlight={9}
      />,
    );
    expect(html).toContain("<svg");
  });

  it("forwards refs on every chart form", () => {
    for (const [name, componentOrValue] of Object.entries(dg)) {
      if (typeof componentOrValue !== "object" || componentOrValue === null)
        continue;
      if (!("displayName" in componentOrValue)) continue;
      expect((componentOrValue as { displayName?: string }).displayName).toBe(
        name,
      );
    }
    expect((dg.Sankey as { $$typeof?: symbol }).$$typeof?.toString()).toContain(
      "react.forward_ref",
    );
  });
});
