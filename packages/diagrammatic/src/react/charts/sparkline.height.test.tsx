import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sparkbar } from "./sparkbar";
import { Sparkline } from "./sparkline";

const rootStyle = (html: string) => html.match(/<svg[^>]*style="([^"]*)"/)![1]!;

describe("micro chart height", () => {
  it("draws a block row at the height it is given", () => {
    const style = rootStyle(
      renderToStaticMarkup(<Sparkline block height={40} data={[1, 3, 2]} />),
    );
    expect(style).toContain("width:100%");
    expect(style).toContain("height:40px");
  });

  it("draws an inline chart at the height it is given without a width", () => {
    const style = rootStyle(
      renderToStaticMarkup(<Sparkbar height={24} data={[1, 3, 2]} />),
    );
    expect(style).toContain("height:24px");
  });

  it("keeps the 1em default for a height that is not a positive number", () => {
    for (const height of [0, -4, Number.NaN]) {
      const html = renderToStaticMarkup(
        <Sparkline block height={height} data={[1, 3, 2]} />,
      );
      expect(rootStyle(html)).toContain("height:1em");
      expect(html).not.toMatch(/<svg[^>]* height="/);
    }
  });

  it("keeps the 1em default when no height is given", () => {
    expect(
      rootStyle(renderToStaticMarkup(<Sparkline block data={[1, 3, 2]} />)),
    ).toContain("height:1em");
    expect(
      rootStyle(renderToStaticMarkup(<Sparkline data={[1, 3, 2]} />)),
    ).toContain("height:1em");
  });
});
