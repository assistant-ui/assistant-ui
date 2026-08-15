import { ABSTRACT_TILES, Choropleth } from "diagrammatic";

export function ChoroplethDemo() {
  return (
    <Choropleth
      title="Active users per square km"
      values={ABSTRACT_TILES.map(
        (tile) =>
          (Math.sin(tile.col * 1.3 + tile.row * 0.8) +
            Math.cos(tile.col * 0.5 - tile.row * 1.1) +
            2) /
          4,
      )}
      legendLabel="users/km²"
    />
  );
}
