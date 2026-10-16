import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StripPlot } from "./strip-plot";

describe("StripPlot empty rows", () => {
  it("omits the mean marker for an empty row", () => {
    const html = renderToStaticMarkup(
      <StripPlot
        rows={[
          { label: "empty", values: [] },
          { label: "filled", values: [2, 4] },
        ]}
      />,
    );
    const row = (i: number) =>
      html.match(new RegExp(`<g[^>]*data-i="${i}"[^>]*>(.*?)</g>`, "s"))?.[1] ??
      "";
    expect([...row(0).matchAll(/<line\b/g)]).toHaveLength(1);
    expect([...row(1).matchAll(/<line\b/g)]).toHaveLength(2);
  });
});
