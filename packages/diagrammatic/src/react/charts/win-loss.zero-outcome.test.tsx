import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GRID, NEG, POS } from "../../core/theme";
import { WinLoss } from "./win-loss";

const rectAttrs = (html: string, index: number) => {
  const tag = new RegExp(`<rect\\b[^>]*\\bdata-i="${index}"[^>]*>`).exec(
    html,
  )?.[0];
  expect(tag).toBeTypeOf("string");
  return Object.fromEntries(
    [...tag!.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, name, value]) => [
      name!,
      value!,
    ]),
  );
};

describe("WinLoss zero outcome", () => {
  it("renders a draw on the baseline in GRID while wins and losses stay unchanged", () => {
    const html = renderToStaticMarkup(<WinLoss data={[1, 0, -1]} />);
    const win = rectAttrs(html, 0);
    const draw = rectAttrs(html, 1);
    const loss = rectAttrs(html, 2);

    expect(win).toMatchObject({ fill: POS, y: "2.5", opacity: "0.85" });
    expect(loss).toMatchObject({ fill: NEG, y: "11", opacity: "0.7" });
    expect(draw.fill).toBe(GRID);
    expect(Number(draw.y) + Number(draw.height) / 2).toBe(10);
    expect(draw.width).toBe(win.width);
    expect(draw.width).toBe(loss.width);
  });
});
