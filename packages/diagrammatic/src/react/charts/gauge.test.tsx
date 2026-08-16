import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Gauge } from "./gauge";

describe("Gauge", () => {
  it("sets the nameplate larger than shared axis type", () => {
    const html = renderToStaticMarkup(
      <Gauge value={0.68} display="68%" label="error budget used" />,
    );
    expect(html).toContain(">error budget used</text>");
    expect(html).toMatch(/font-size="7.5"[^>]*>error budget used</);
    expect(html).toMatch(/font-size="15"[^>]*>68%</);
    expect(html).toMatch(/font-size="5"[^>]*>0</);
    expect(html).toMatch(/font-size="5"[^>]*>100</);
    expect(html).not.toMatch(/font-size="3.2"[^>]*>error budget used</);
  });

  it("adds headroom when tick labels are present", () => {
    const height = (html: string) =>
      Number(/viewBox="0 0 200 ([0-9.]+)"/.exec(html)?.[1]);
    const bare = height(renderToStaticMarkup(<Gauge value={0.5} />));
    const ticked = height(
      renderToStaticMarkup(
        <Gauge value={0.5} ticks={[{ at: 0.5, label: "50" }]} />,
      ),
    );
    expect(ticked).toBeGreaterThan(bare);
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
