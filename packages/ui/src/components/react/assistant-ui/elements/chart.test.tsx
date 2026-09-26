import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Chart } from "./chart";

afterEach(cleanup);

const delta = (text: string) => screen.getByText(text);

describe("Chart delta", () => {
  it("reads a leading minus sign as a fall, bad news by default", () => {
    render(
      <Chart
        label="Revenue"
        value="$12k"
        delta="-4%"
        points={[3, 2]}
        visibleCount={2}
      />,
    );

    expect(delta("-4%").getAttribute("data-trend")).toBe("down");
    expect(delta("-4%").className).toContain("text-red-600");
  });

  it("colors a fall as good news when a rise is bad", () => {
    render(
      <Chart
        label="p50 latency"
        value="180ms"
        delta="-12ms"
        upIsGood={false}
        points={[200, 180]}
        visibleCount={2}
      />,
    );

    expect(delta("-12ms").className).toContain("text-emerald-600");
  });

  it("takes an explicit trend over the sign, and keeps a flat one neutral", () => {
    const view = render(
      <Chart
        label="Errors"
        value="12"
        delta="0"
        trend="flat"
        points={[0, 0]}
        visibleCount={2}
      />,
    );
    expect(delta("0").getAttribute("data-trend")).toBe("flat");
    expect(delta("0").className).toContain("text-foreground/45");

    view.rerender(
      <Chart
        label="Signups"
        value="1.2k"
        delta="120"
        trend="down"
        points={[1, 2]}
        visibleCount={2}
      />,
    );
    expect(delta("120").className).toContain("text-red-600");
  });
});
