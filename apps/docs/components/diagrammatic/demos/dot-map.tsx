import { ABSTRACT_TILES, DotMap } from "diagrammatic";

export function DotMapDemo() {
  return (
    <DotMap
      title="Where the users are"
      counts={ABSTRACT_TILES.map((tile) =>
        Math.max(
          0,
          Math.round(
            3.2 *
              (Math.sin(tile.col * 0.9 + tile.row * 1.4) +
                Math.cos(tile.col * 0.4 - tile.row * 0.7)),
          ),
        ),
      )}
      unitLabel="1 dot = 100 users"
    />
  );
}
