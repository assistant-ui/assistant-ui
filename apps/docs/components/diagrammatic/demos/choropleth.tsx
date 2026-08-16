import { ABSTRACT_TILES, Choropleth } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Active users per square km",
    setup:
      "A launch review colors an abstract landmass by user density — the tiles stand in for any country's regions, which is the point: the form works before the geography is real.",
    read: "The dark coast is the population, not the geography: density follows the cities, and the pale interior is distance, not disinterest. Choropleths whisper their oldest caveat here — big empty regions shout, small dense ones hide.",
    chart: (
      <AppCard title="Users per km²" meta="launch review">
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
      </AppCard>
    ),
  },
];
