// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Network } from "../react/charts/network";
import { getSeriesColor } from "./datum";

afterEach(cleanup);

describe("getSeriesColor", () => {
  it("reads the painted node circle past Network's transparent hit circle", () => {
    const { container } = render(
      <Network graph={{ nodes: [{ id: "solo" }], links: [] }} />,
    );
    const node = container.querySelector('g[data-series="solo"]')!;
    const circles = node.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    expect(circles[0]!.getAttribute("fill")).toBe("transparent");
    circles[0]!.style.fill = "transparent";
    circles[1]!.style.fill = "rgb(12, 34, 56)";
    expect(getSeriesColor(node, "solo")).toBe("rgb(12, 34, 56)");
  });

  it("skips unpainted descendants and reads the first drawable stroke", () => {
    const { container } = render(
      <svg>
        <g data-series="stroked">
          <g>
            <path style={{ fill: "none", stroke: "none" }} />
            <path style={{ fill: "none", stroke: "rgb(25, 45, 65)" }} />
          </g>
        </g>
      </svg>,
    );
    expect(getSeriesColor(container.querySelector("g")!, "stroked")).toBe(
      "rgb(25, 45, 65)",
    );
  });

  it("keeps computed fill resolution for a non-group mark", () => {
    const { container } = render(
      <svg>
        <path data-series="line" style={{ fill: "rgb(70, 80, 90)" }} />
      </svg>,
    );
    expect(getSeriesColor(container.querySelector("path")!, "line")).toBe(
      "rgb(70, 80, 90)",
    );
  });
});
