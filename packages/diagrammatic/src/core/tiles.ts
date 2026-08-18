export type Tile = {
  col: number;
  row: number;
  x: number;
  y: number;
  kind?: "rect" | "hex";
  size?: number;
};

const MASK = [
  "....XXXX........",
  "..XXXXXXXX......",
  ".XXXXXXXXXX..XX.",
  ".XXXXXXXXX...XXX",
  "..XXXXXXX....XX.",
  "...XXXXX........",
  "....XXX....X....",
  ".....X.....XX...",
];

export const TILE_SIZE = 10.4;
export const TILE_PITCH = 11.6;
export const TILE_ROW_PITCH = 12;
export const TILE_HEIGHT = 10.8;
export const HEX_R = 6.4;

const HEX_MASK = [
  "...XXXXX....",
  "..XXXXXXX...",
  ".XXXXXXXXX..",
  ".XXXXXXXXXX.",
  "..XXXXXXXXX.",
  "...XXXXXXX..",
  "....XXXXX...",
  ".....XXX....",
];

/**
 * The built-in abstract landmass the spatial charts draw on. Pass your own
 * tiles to swap in a different grid; real geography is out of scope here.
 */
export const ABSTRACT_TILES: Tile[] = MASK.flatMap((line, row) =>
  line
    .split("")
    .flatMap((cell, col) =>
      cell === "X"
        ? [{ col, row, x: 8 + col * TILE_PITCH, y: 12 + row * TILE_ROW_PITCH }]
        : [],
    ),
);

const HEX_DX = HEX_R * Math.sqrt(3);
const HEX_DY = HEX_R * 1.5;
const HEX_ORIGIN_X = 28;
const HEX_ORIGIN_Y = 18;

/**
 * A honeycomb landmass for the same spatial hosts. `x`/`y` are cell centres.
 * Pass as `tiles` on Choropleth, SymbolMap, DotMap, or FlowMap.
 */
export const HEX_TILES: Tile[] = HEX_MASK.flatMap((line, row) =>
  line.split("").flatMap((cell, col) =>
    cell === "X"
      ? [
          {
            col,
            row,
            kind: "hex" as const,
            size: HEX_R - 0.45,
            x: HEX_ORIGIN_X + col * HEX_DX + (row % 2 ? HEX_DX / 2 : 0),
            y: HEX_ORIGIN_Y + row * HEX_DY,
          },
        ]
      : [],
  ),
);

export function tileCenter(tile: Tile): { x: number; y: number } {
  if (tile.kind === "hex") return { x: tile.x, y: tile.y };
  return { x: tile.x + TILE_SIZE / 2, y: tile.y + TILE_HEIGHT / 2 };
}

export function tileJitter(tile: Tile, k: number): { x: number; y: number } {
  if (tile.kind === "hex") {
    const r = tile.size ?? HEX_R;
    const jx = (((tile.col * 7 + tile.row * 13 + k * 29) % 8) - 3.5) * r * 0.16;
    const jy = (((tile.col * 11 + tile.row * 5 + k * 17) % 7) - 3) * r * 0.16;
    return { x: tile.x + jx, y: tile.y + jy };
  }
  const jx = ((tile.col * 7 + tile.row * 13 + k * 29) % 8) + 1.2;
  const jy = ((tile.col * 11 + tile.row * 5 + k * 17) % 7) + 1.6;
  return { x: tile.x + jx, y: tile.y + jy };
}

export function tileAt(
  tiles: Tile[],
  col: number,
  row: number,
): Tile | undefined {
  return tiles.find((t) => t.col === col && t.row === row);
}
