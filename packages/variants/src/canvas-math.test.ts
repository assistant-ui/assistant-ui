import { describe, expect, it } from "vitest";
import {
  cardScale,
  clampZoom,
  COLUMN_WIDTH,
  DEFAULT_WIDTH,
  fitView,
  MAX_ZOOM,
  MIN_ZOOM,
  navigate,
  zoomAt,
} from "./canvas-math";

describe("cardScale", () => {
  it("scales wide groups down to the column width", () => {
    expect(cardScale(960)).toEqual({ width: 960, scale: COLUMN_WIDTH / 960 });
  });

  it("never scales narrow groups up", () => {
    expect(cardScale(120)).toEqual({ width: 120, scale: 1 });
  });

  it("falls back to a default width when the group cannot be measured", () => {
    expect(cardScale(0)).toEqual({
      width: DEFAULT_WIDTH,
      scale: COLUMN_WIDTH / DEFAULT_WIDTH,
    });
    expect(cardScale(Number.NaN).width).toBe(DEFAULT_WIDTH);
  });
});

describe("fitView", () => {
  it("zooms out to fit and centers", () => {
    const view = fitView(
      { width: 2000, height: 500 },
      { width: 1096, height: 800 },
    );
    expect(view.zoom).toBe(0.5);
    expect(view.x).toBe(48);
    expect(view.y).toBe((800 - 250) / 2);
  });

  it("never zooms in past 100%", () => {
    const view = fitView(
      { width: 200, height: 100 },
      { width: 1000, height: 800 },
    );
    expect(view).toEqual({ x: 400, y: 350, zoom: 1 });
  });

  it("keeps tall content at the top padding", () => {
    const view = fitView(
      { width: 100, height: 100_000 },
      { width: 1000, height: 800 },
    );
    expect(view.zoom).toBe(MIN_ZOOM);
    expect(view.y).toBe(48);
  });

  it("ignores empty content", () => {
    expect(fitView({ width: 0, height: 0 }, { width: 10, height: 10 })).toEqual(
      { x: 0, y: 0, zoom: 1 },
    );
  });
});

describe("zoomAt", () => {
  it("keeps the anchor point fixed", () => {
    const view = zoomAt({ x: 100, y: 50, zoom: 1 }, 2, { x: 300, y: 250 });
    expect(view).toEqual({ x: -100, y: -150, zoom: 2 });
    const worldX = (300 - view.x) / view.zoom;
    expect(worldX).toBe(200);
  });

  it("clamps zoom", () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 3 }, 10, { x: 0, y: 0 }).zoom).toBe(
      MAX_ZOOM,
    );
    expect(clampZoom(0)).toBe(MIN_ZOOM);
  });
});

describe("navigate", () => {
  const rows = [[100, 400, 700], [], [120, 600]];

  it("moves within a row and stops at the ends", () => {
    expect(navigate(rows, { row: 0, col: 1 }, "ArrowRight")).toEqual({
      row: 0,
      col: 2,
    });
    expect(navigate(rows, { row: 0, col: 2 }, "ArrowRight")).toEqual({
      row: 0,
      col: 2,
    });
    expect(navigate(rows, { row: 0, col: 0 }, "ArrowLeft")).toEqual({
      row: 0,
      col: 0,
    });
  });

  it("jumps rows to the closest card, skipping empty rows", () => {
    expect(navigate(rows, { row: 0, col: 2 }, "ArrowDown")).toEqual({
      row: 2,
      col: 1,
    });
    expect(navigate(rows, { row: 2, col: 0 }, "ArrowUp")).toEqual({
      row: 0,
      col: 0,
    });
    expect(navigate(rows, { row: 2, col: 0 }, "ArrowDown")).toEqual({
      row: 2,
      col: 0,
    });
  });

  it("ignores an unknown row", () => {
    expect(navigate(rows, { row: 9, col: 0 }, "ArrowDown")).toEqual({
      row: 9,
      col: 0,
    });
  });
});
