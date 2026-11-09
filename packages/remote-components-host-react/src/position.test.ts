import { describe, expect, it } from "vitest";
import { computePosition, type PositionInput } from "./position.js";

const base: PositionInput = {
  anchor: { x: 100, y: 100, width: 80, height: 20 },
  floating: { width: 120, height: 60 },
  viewport: { width: 800, height: 600 },
  placement: { side: "bottom", align: "start" },
  offset: 4,
  padding: 8,
};

describe("computePosition", () => {
  it("places below, start-aligned", () => {
    expect(computePosition(base)).toMatchObject({
      x: 100,
      y: 124,
      side: "bottom",
    });
  });

  it("aligns center and end", () => {
    expect(
      computePosition({
        ...base,
        placement: { side: "bottom", align: "center" },
      }).x,
    ).toBe(80);
    expect(
      computePosition({ ...base, placement: { side: "bottom", align: "end" } })
        .x,
    ).toBe(60);
  });

  it("flips to top near the bottom edge", () => {
    const r = computePosition({
      ...base,
      anchor: { x: 100, y: 560, width: 80, height: 20 },
    });
    expect(r.side).toBe("top");
    expect(r.y).toBe(560 - 4 - 60);
  });

  it("does not flip when the other side has less room", () => {
    const r = computePosition({
      ...base,
      viewport: { width: 800, height: 150 },
      anchor: { x: 100, y: 30, width: 80, height: 20 },
    });
    expect(r.side).toBe("bottom");
  });

  it("shifts inside the right and left edges", () => {
    expect(
      computePosition({
        ...base,
        anchor: { x: 760, y: 100, width: 30, height: 20 },
      }).x,
    ).toBe(800 - 8 - 120);
    expect(
      computePosition({
        ...base,
        anchor: { x: -50, y: 100, width: 30, height: 20 },
      }).x,
    ).toBe(8);
  });

  it("prefers the start edge when wider than the viewport", () => {
    expect(
      computePosition({ ...base, floating: { width: 900, height: 60 } }).x,
    ).toBe(8);
  });

  it("handles left/right sides with flipping", () => {
    const right = computePosition({
      ...base,
      placement: { side: "right", align: "start" },
    });
    expect(right).toMatchObject({ x: 184, y: 100, side: "right" });
    const flipped = computePosition({
      ...base,
      placement: { side: "right", align: "start" },
      anchor: { x: 700, y: 100, width: 80, height: 20 },
    });
    expect(flipped).toMatchObject({ x: 700 - 4 - 120, side: "left" });
  });

  it("reports available space on the chosen side", () => {
    expect(computePosition(base).available).toBe(600 - 120 - 4 - 8);
  });

  it("caps the height to the room on the chosen side", () => {
    // 600px viewport, anchor in the middle: 80px menu fits; a 900px one does not.
    const tall = computePosition({
      ...base,
      floating: { width: 120, height: 900 },
      anchor: { x: 100, y: 400, width: 80, height: 20 },
    });
    expect(tall.side).toBe("top"); // more room above (388) than below (168)
    expect(tall.maxHeight).toBe(400 - 4 - 8);
    expect(tall.y).toBe(8); // top edge at the padding, not off-screen
    const right = computePosition({
      ...base,
      placement: { side: "right", align: "start" },
      floating: { width: 120, height: 900 },
    });
    expect(right.maxHeight).toBe(600 - 16);
    expect(right.y).toBe(8);
  });
});
