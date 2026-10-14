import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { textWidth } from "../../core/text";
import { typeScale } from "../svg";
import { DivergingBar } from "./diverging-bar";

describe("DivergingBar negative labels", () => {
  it("keeps a usable bar span with negative labels at small widths", () => {
    const html = renderToStaticMarkup(
      <DivergingBar width={90} items={[{ label: "Sales", value: -100 }]} />,
    );
    const bar = /<rect\b([^>]*)>/.exec(html)?.[1] ?? "";
    const barWidth = Number(/\bwidth="([^"]+)"/.exec(bar)?.[1]);
    expect(barWidth).toBeGreaterThanOrEqual(6);
  });

  it("omits a negative value that cannot be shown whole beside its row label", () => {
    const narrow = renderToStaticMarkup(
      <DivergingBar width={90} items={[{ label: "Sales", value: -100 }]} />,
    );
    const longLabel = renderToStaticMarkup(
      <DivergingBar
        width={180}
        items={[{ label: "A very long row label here", value: -1200 }]}
      />,
    );
    for (const html of [narrow, longLabel]) {
      const contents = [...html.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(
        ([, content]) => content,
      );
      expect(contents.filter((content) => content?.startsWith("-"))).toEqual(
        [],
      );
      expect(contents).toContain("");
    }
  });

  it("keeps the negative value text clear of its row label", () => {
    const html = renderToStaticMarkup(
      <DivergingBar width={320} items={[{ label: "Sales", value: -100 }]} />,
    );
    const texts = [...html.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)];
    const row = texts.find(([, , content]) => content === "Sales");
    const value = texts.find(([, , content]) => content === "-100");
    expect(row).toBeDefined();
    expect(value).toBeDefined();
    const rowRight = Number(/\bx="([^"]+)"/.exec(row?.[1] ?? "")?.[1]);
    const valueRight = Number(/\bx="([^"]+)"/.exec(value?.[1] ?? "")?.[1]);
    const T = typeScale();
    const rowLeft = rowRight - textWidth(row?.[2] ?? "", T.label.px);
    const valueLeft = valueRight - textWidth(value?.[2] ?? "", T.axis.px);
    expect(valueRight).toBeGreaterThan(rowLeft);
    expect(valueLeft).toBeGreaterThanOrEqual(rowRight);
  });

  it("keeps the original geometry when the negative value stays in the plot", () => {
    const html = renderToStaticMarkup(
      <DivergingBar
        width={320}
        items={[
          { label: "A", value: 100 },
          { label: "B", value: -1 },
        ]}
      />,
    );
    const xOf = (content: string) => {
      const tag = [...html.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].find(
        ([, , text]) => text === content,
      )?.[1];
      return Number(/\bx="([^"]+)"/.exec(tag ?? "")?.[1]);
    };
    expect(xOf("B")).toBe(35);
    expect(xOf("-1")).toBe(151.83);
  });
});
