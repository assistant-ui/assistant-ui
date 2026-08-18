import { describe, expect, it } from "vitest";
import { HEX_TILES, tileCenter, tileJitter } from "./tiles";

describe("HEX_TILES", () => {
  it("is a honeycomb landmass with unique cells", () => {
    expect(HEX_TILES.length).toBeGreaterThan(20);
    expect(HEX_TILES.every((tile) => tile.kind === "hex")).toBe(true);
    const keys = HEX_TILES.map((tile) => `${tile.col}:${tile.row}`);
    expect(new Set(keys).size).toBe(HEX_TILES.length);
  });

  it("keeps centres on the canvas", () => {
    for (const tile of HEX_TILES) {
      const { x, y } = tileCenter(tile);
      expect(x).toBeGreaterThan(10);
      expect(x).toBeLessThan(190);
      expect(y).toBeGreaterThan(8);
      expect(y).toBeLessThan(120);
    }
  });

  it("jitters hex dots around the centre", () => {
    const tile = HEX_TILES[0]!;
    const a = tileJitter(tile, 0);
    const b = tileJitter(tile, 3);
    expect(a).not.toEqual(b);
    expect(Math.hypot(a.x - tile.x, a.y - tile.y)).toBeLessThan(
      (tile.size ?? 6) * 0.8,
    );
  });
});
