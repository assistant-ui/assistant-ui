import { ABSTRACT_TILES, DotMap } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Where the users are",
    setup:
      "Instead of coloring regions, a growth report scatters one dot per hundred users across the landmass, because density as texture keeps region size from lying.",
    read: "The dot clouds hug the same coast the choropleth darkened, but here a big sparse region reads sparse instead of shouting its area. Each dot is a hundred people; the eye counts crowds the way it never counts color.",
    chart: (
      <AppCard title="Where the users are" meta="1 dot = 100">
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
      </AppCard>
    ),
  },
];
