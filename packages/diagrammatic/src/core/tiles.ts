export type Tile = { col: number; row: number; x: number; y: number };

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

export function tileCenter(tile: Tile): { x: number; y: number } {
  return { x: tile.x + TILE_SIZE / 2, y: tile.y + 10.8 / 2 };
}

export function tileAt(
  tiles: Tile[],
  col: number,
  row: number,
): Tile | undefined {
  return tiles.find((t) => t.col === col && t.row === row);
}
