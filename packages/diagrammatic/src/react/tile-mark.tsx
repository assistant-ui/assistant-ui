import type { Tile } from "../core/tiles";
import { HEX_R, TILE_HEIGHT, TILE_SIZE } from "../core/tiles";
import { hexPath } from "../core/geometry";

export function TileMark({
  tile,
  fill,
  opacity,
  ...rest
}: {
  tile: Tile;
  fill: string;
  opacity?: number | string;
  "data-part"?: string;
  "data-i"?: number;
}) {
  if (tile.kind === "hex") {
    return (
      <path
        d={hexPath(tile.x, tile.y, tile.size ?? HEX_R)}
        fill={fill}
        opacity={opacity}
        {...rest}
      />
    );
  }
  return (
    <rect
      x={tile.x}
      y={tile.y}
      width={TILE_SIZE}
      height={TILE_HEIGHT}
      fill={fill}
      opacity={opacity}
      {...rest}
    />
  );
}
