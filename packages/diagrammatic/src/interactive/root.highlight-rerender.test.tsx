// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Line } from "../react/charts/line";
import { Root } from "./root";

afterEach(cleanup);

describe("Interactive.Root highlight after rerender", () => {
  it("stamps new matching and nonmatching marks when the highlight stays the same", () => {
    const { container, rerender } = render(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "north", data: [1, 2] },
            { name: "south", data: [2, 1] },
          ]}
        />
      </Root>,
    );

    rerender(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "north", data: [1, 2, 3] },
            { name: "south", data: [2, 1] },
            { name: "east", data: [3, 2] },
          ]}
        />
      </Root>,
    );

    const newPoint = container.querySelector(
      'circle[data-part="mark"][data-series="north"][data-i="2"]',
    );
    const newSeries = container.querySelector(
      'path[data-part="mark"][data-series="east"]',
    );
    expect(newPoint).not.toBeNull();
    expect(newSeries).not.toBeNull();
    expect(newPoint!.hasAttribute("data-dg-active")).toBe(true);
    expect(newPoint!.hasAttribute("data-dg-muted")).toBe(false);
    expect(newSeries!.hasAttribute("data-dg-muted")).toBe(true);
    expect(newSeries!.hasAttribute("data-dg-active")).toBe(false);
  });

  it("replaces stale stamps when a reused mark changes series", () => {
    const { container, rerender } = render(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "north", data: [1, 2] },
            { name: "south", data: [2, 1] },
          ]}
        />
      </Root>,
    );
    const paths = container.querySelectorAll('path[data-part="mark"]');
    expect(paths[0]!.hasAttribute("data-dg-active")).toBe(true);
    expect(paths[1]!.hasAttribute("data-dg-muted")).toBe(true);

    rerender(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "south", data: [1, 2] },
            { name: "north", data: [2, 1] },
          ]}
        />
      </Root>,
    );

    expect(paths[0]!.getAttribute("data-series")).toBe("south");
    expect(paths[0]!.hasAttribute("data-dg-active")).toBe(false);
    expect(paths[0]!.hasAttribute("data-dg-muted")).toBe(true);
    expect(paths[1]!.getAttribute("data-series")).toBe("north");
    expect(paths[1]!.hasAttribute("data-dg-muted")).toBe(false);
    expect(paths[1]!.hasAttribute("data-dg-active")).toBe(true);
  });
});
