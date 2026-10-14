// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Area } from "../react/charts/area";
import { Fit, IDENTITY, Zoom, viewOf, zoomAbout } from "./index";

afterEach(cleanup);

const DAYS = [12, 18, 15, 24, 30];

describe("Fit", () => {
  it("renders the initial width before the box is measured", () => {
    const { container } = render(
      <Fit initial={640}>
        {({ width }) => <Area data={DAYS} width={width} />}
      </Fit>,
    );
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("640");
  });

  it("hands down the measured width", () => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return { width: 320, height: 120, top: 0, left: 0 } as DOMRect;
    };
    try {
      const sizes: { width: number }[] = [];
      const { container } = render(
        <Fit initial={640}>
          {(size) => {
            sizes.push(size);
            return <Area data={DAYS} width={size.width} />;
          }}
        </Fit>,
      );
      expect(sizes.at(-1)).toEqual({ width: 320 });
      expect(container.querySelector("svg")!.getAttribute("width")).toBe("320");
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  });
});

describe("zoomAbout", () => {
  it("keeps the point under the pointer fixed", () => {
    const next = zoomAbout(IDENTITY, 2, 100, 50);
    expect(next).toEqual({ k: 2, x: -100, y: -50 });
    const back = zoomAbout(next, 1, 100, 50);
    expect(back).toEqual({ k: 1, x: 0, y: 0 });
  });
});

describe("Zoom", () => {
  it("leaves the figure untransformed until it is zoomed", () => {
    const { container } = render(
      <Zoom data-testid="zoom">
        <Area data={DAYS} />
      </Zoom>,
    );
    const inner = container.querySelector(
      "[data-dg-zoom] > div",
    ) as HTMLElement;
    expect(inner.style.transform).toBe("translate(0px, 0px) scale(1)");
  });

  it("scales on the keyboard and resets", () => {
    const seen: number[] = [];
    const { container } = render(
      <Zoom onChange={(t) => seen.push(t.k)}>
        <Area data={DAYS} />
      </Zoom>,
    );
    const host = container.querySelector("[data-dg-zoom]")!;
    fireEvent.keyDown(host, { key: "+" });
    expect(seen.at(-1)).toBeCloseTo(1.3);
    fireEvent.keyDown(host, { key: "0" });
    expect(seen.at(-1)).toBe(1);
  });

  it("clamps to the given range", () => {
    const seen: number[] = [];
    const { container } = render(
      <Zoom max={2} onChange={(t) => seen.push(t.k)}>
        <Area data={DAYS} />
      </Zoom>,
    );
    const host = container.querySelector("[data-dg-zoom]")!;
    for (let i = 0; i < 8; i++) fireEvent.keyDown(host, { key: "+" });
    expect(Math.max(...seen)).toBe(2);
  });

  it("stays out of the way when disabled", () => {
    const seen: number[] = [];
    const { container } = render(
      <Zoom disabled onChange={(t) => seen.push(t.k)}>
        <Area data={DAYS} />
      </Zoom>,
    );
    const host = container.querySelector("[data-dg-zoom]")!;
    fireEvent.keyDown(host, { key: "+" });
    expect(seen).toHaveLength(0);
    expect(host.getAttribute("tabindex")).toBeNull();
  });
});

describe("viewOf", () => {
  it("opens on the whole box at rest", () => {
    expect(viewOf(IDENTITY, 400, 200)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("turns a scale into a proportionally smaller window", () => {
    expect(viewOf({ k: 4, x: 0, y: 0 }, 400, 200).w).toBe(0.25);
  });

  it("turns a pan into an offset and holds the window inside the box", () => {
    expect(viewOf({ k: 2, x: -200, y: 0 }, 400, 200).x).toBe(0.25);
    expect(viewOf({ k: 2, x: -4000, y: 0 }, 400, 200).x).toBe(0.5);
    expect(viewOf({ k: 2, x: 4000, y: 0 }, 400, 200).x).toBe(0);
  });
});

describe("Zoom windows", () => {
  it("hands a view to a function child instead of transforming it", () => {
    const seen: number[] = [];
    const { container } = render(
      <Zoom>
        {(view) => {
          seen.push(view.w);
          return <Area data={DAYS} view={view} />;
        }}
      </Zoom>,
    );
    expect(seen.at(-1)).toBe(1);
    expect(container.querySelector("[data-dg-zoom] > div")).toBeNull();
    fireEvent.keyDown(container.querySelector("[data-dg-zoom]")!, { key: "+" });
    expect(seen.at(-1)).toBeCloseTo(1 / 1.3);
  });
});
