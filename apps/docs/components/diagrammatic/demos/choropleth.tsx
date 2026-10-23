import { ABSTRACT_TILES, Choropleth, HEX_TILES } from "diagrammatic";
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
    read: "The east edge is the dark band, and it darkens further toward the south. The capital and the west coast form two smaller hot spots. The interior stays pale, because this is a rate and a large tile is not a large problem.",
    source: "Checkout POST errors per 1k sessions, week of 11 Aug.",
    chart: (
      <Choropleth
        aspect={1.7}
        title="Checkout errors per 1k sessions"
        values={RATES}
        legendLabel="errors / 1k sessions"
      />
    ),
  },
  {
    title: "Incident rate on a honeycomb map",
    setup:
      "The metric remains errors per 1k sessions, now on hexagonal cells. One region, one hex. Adjacency is approximate. This is not a hexbin.",
    read: "The eastern hexes are the dark cluster, and every column darkens toward the south. The west sits in between, and the middle stays pale.",
    source: "Checkout POST errors per 1k sessions, week of 11 Aug.",
    chart: (
      <Choropleth
        aspect={1.7}
        title="Incident rate by region"
        tiles={HEX_TILES}
        values={HEX_TILES.map((tile) => {
          if (tile.col >= 8) return 16 + tile.row * 1.6;
          if (tile.col <= 2) return 8 + tile.row;
          return 3 + tile.row * 0.5;
        })}
        legendLabel="errors / 1k sessions"
      />
    ),
  },
];
