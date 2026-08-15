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

export type Tile = { col: number; row: number; x: number; y: number };

export const TILE = 10.4;
export const PITCH = 11.6;

export const TILES: Tile[] = MASK.flatMap((line, row) =>
  line
    .split("")
    .flatMap((cell, col) =>
      cell === "X" ? [{ col, row, x: 8 + col * PITCH, y: 12 + row * 12 }] : [],
    ),
);

export function tileCenter(tile: Tile): { x: number; y: number } {
  return { x: tile.x + TILE / 2, y: tile.y + 10.8 / 2 };
}

export function tileAt(col: number, row: number): Tile | undefined {
  return TILES.find((t) => t.col === col && t.row === row);
}
