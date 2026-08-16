import { ABSTRACT_TILES, Choropleth } from "diagrammatic";
import type { DemoExample } from "./types";

const RATES = ABSTRACT_TILES.map((tile) => {
  const east = tile.col >= 13;
  const westCoast = tile.col <= 3 && tile.row <= 4;
  const capital = tile.col >= 4 && tile.col <= 7 && tile.row <= 2;
  if (east) return 18 + tile.row * 1.4;
  if (capital) return 14 + tile.col;
  if (westCoast) return 9 + tile.row;
  return 2.4 + tile.row * 0.4;
});

export const glyph = (
  <Choropleth
    title="Errors per 1k sessions"
    values={RATES}
    legendLabel="errors / 1k"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Checkout errors per 1k sessions",
    setup:
      "A rate, never a count. The tiles are an abstract landmass. The legend is the scale a reader can use.",
    read: "The east edge is dark because that region still talks to the old inventory host. The interior is pale on purpose. Big empty tiles stay quiet because this is a rate.",
    source: "Checkout POST errors per 1k sessions, week of 11 Aug.",
    chart: (
      <Choropleth
        density="figure"
        aspect={1.7}
        title="Checkout errors per 1k sessions"
        values={RATES}
        legendLabel="errors / 1k sessions"
      />
    ),
  },
];
