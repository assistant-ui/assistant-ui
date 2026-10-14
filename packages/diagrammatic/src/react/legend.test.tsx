import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Legend } from "./legend";

describe("dom legend", () => {
  it("lists a swatch and name per series on the palette tokens", () => {
    const html = renderToStaticMarkup(<Legend names={["search", "direct"]} />);
    expect(html).toContain("<ul");
    expect(html).toContain('data-dg-legend=""');
    expect(html).toContain('data-series="search"');
    expect(html).toContain("var(--dg-c1, #3b82f6)");
    expect(html).toContain("var(--dg-c2, #059669)");
    expect(html).toContain(">direct</li>");
  });

  it("takes host colors and passes list attributes through", () => {
    const html = renderToStaticMarkup(
      <Legend
        names={["hits", "errors"]}
        colors={["var(--ok)", "var(--bad)"]}
        className="legend"
        aria-label="series"
      />,
    );
    expect(html).toContain("background:var(--ok)");
    expect(html).toContain("background:var(--bad)");
    expect(html).toContain('class="legend"');
    expect(html).toContain('aria-label="series"');
    expect(html).not.toContain("--dg-c1");
  });
});
