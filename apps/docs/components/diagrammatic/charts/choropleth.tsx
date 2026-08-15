import { BLUE, TXT, VIEWBOX, seqOpacity } from "./lib";
import { TILE, TILES } from "./map-tiles";

export function ChoroplethChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {TILES.map((tile) => {
        const v =
          (Math.sin(tile.col * 1.3 + tile.row * 0.8) +
            Math.cos(tile.col * 0.5 - tile.row * 1.1) +
            2) /
          4;
        return (
          <rect
            key={`${tile.col}-${tile.row}`}
            x={tile.x}
            y={tile.y}
            width={TILE}
            height="10.8"
            rx="2.5"
            fill={BLUE}
            opacity={seqOpacity(v)}
          />
        );
      })}
      {[0.1, 0.35, 0.65, 1].map((v, i) => (
        <rect
          key={i}
          x={128 + i * 11}
          y={108}
          width="8.5"
          height="6"
          rx="1.5"
          fill={BLUE}
          opacity={seqOpacity(v)}
        />
      ))}
      <text x="122" y="113" textAnchor="end" {...TXT.axis}>
        users/km²: low
      </text>
      <text x="174" y="113" {...TXT.axis}>
        high
      </text>
    </svg>
  );
}
