import { describe, expect, it } from "vitest";
import { squarify } from "./layout";

const bounds = { x: 0, y: 0, w: 100, h: 60 };

describe("squarify non-positive values", () => {
  it("preserves the all-positive layout", () => {
    expect(squarify([5, 3, 2], bounds, 3)).toEqual([
      { x: 1.5, y: 1.5, w: 47, h: 57 },
      { x: 51.5, y: 1.5, w: 47, h: 33 },
      { x: 51.5, y: 37.5, w: 47, h: 21 },
    ]);
  });

  it("leaves zero and negative entries without area while keeping positive indices", () => {
    const positive = squarify([5, 3, 2], bounds, 3);
    const tiles = squarify([5, 0, 3, -2, 2], bounds, 3);

    expect(tiles).toHaveLength(5);
    expect([tiles[0], tiles[2], tiles[4]]).toEqual(positive);
    expect(tiles[1]).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(tiles[3]).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(tiles.flatMap(Object.values).every(Number.isFinite)).toBe(true);
  });

  it("returns only zero-size tiles when no value is positive", () => {
    for (const values of [
      [0, 0],
      [-3, -1],
      [0, -1],
    ]) {
      const tiles = squarify(values, bounds);
      expect(tiles).toHaveLength(values.length);
      expect(tiles).toEqual(values.map(() => ({ x: 0, y: 0, w: 0, h: 0 })));
      expect(tiles.flatMap(Object.values).every(Number.isFinite)).toBe(true);
    }
  });
});
