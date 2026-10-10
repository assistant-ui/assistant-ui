import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Gauge } from "./gauge";

describe("Gauge", () => {
  it("uses ordered em sizes for the dial labels", () => {
    const html = renderToStaticMarkup(
      <Gauge value={0.68} display="68%" label="error budget used" />,
    );
    const fontSizeOf = (label: string) => {
      const match = new RegExp(
        `font-size="([0-9.]+em)"[^>]*>${label}</text>`,
      ).exec(html);
      return Number(match?.[1]?.slice(0, -2));
    };
    expect(html).toContain(">error budget used</text>");
    const nameplate = fontSizeOf("error budget used");
    const value = fontSizeOf("68%");
    const min = fontSizeOf("0");
    const max = fontSizeOf("100");
    expect(value).toBeGreaterThan(nameplate);
    expect(nameplate).toBeGreaterThan(min);
    expect(min).toBe(max);
  });

  it("adds headroom when tick labels are present", () => {
    const height = (html: string) =>
      Number(/<svg[^>]* height="([0-9.]+)"/.exec(html)?.[1]);
    const bare = height(renderToStaticMarkup(<Gauge value={0.5} />));
    const ticked = height(
      renderToStaticMarkup(
        <Gauge value={0.5} ticks={[{ at: 0.5, label: "50" }]} />,
      ),
    );
    expect(ticked).toBeGreaterThan(bare);
    expect(ticked - bare).toBe(36);
  });

  it("sizes tick labels in em from the dial radius", () => {
    const html = renderToStaticMarkup(
      <Gauge
        value={0.5}
        ticks={[
          { at: 0, label: "0" },
          { at: 0.5, label: "mid" },
        ]}
      />,
    );
    const em = (markup: string) =>
      Number(/font-size="([\d.]+)em"[^>]*>mid</.exec(markup)?.[1]);
    expect(em(html)).toBeGreaterThanOrEqual(1);
    const small = renderToStaticMarkup(
      <Gauge
        value={0.5}
        width={240}
        ticks={[
          { at: 0, label: "0" },
          { at: 0.5, label: "mid" },
        ]}
      />,
    );
    expect(em(small)).toBeGreaterThanOrEqual(0.9);
    expect(em(small)).toBeLessThanOrEqual(em(html));
  });

  it("parks end tick labels below the dial, not on the tick", () => {
    const html = renderToStaticMarkup(
      <Gauge
        value={0.57}
        min=""
        max=""
        ticks={[
          { at: 0, label: "0" },
          { at: 0.5, label: "90" },
          { at: 1, label: "300" },
        ]}
      />,
    );
    const yOf = (label: string) => {
      const match = new RegExp(`y="([0-9.]+)"[^>]*>${label}<`).exec(html);
      return Number(match?.[1]);
    };
    expect(yOf("300")).toBeGreaterThan(yOf("90"));
    expect(yOf("0")).toBeGreaterThan(yOf("90"));
  });

  it("omits empty end captions", () => {
    const html = renderToStaticMarkup(
      <Gauge value={0.5} label="rpm" min="" max="" needle />,
    );
    expect(html).toContain(">rpm</text>");
    expect(html).not.toMatch(/>(0|100)<\/text>/);
  });
});
