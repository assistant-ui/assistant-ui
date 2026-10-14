import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { textWidth } from "../../core/text";
import { typeScale } from "../svg";
import { DivergingBar } from "./diverging-bar";

describe("DivergingBar negative labels", () => {
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
