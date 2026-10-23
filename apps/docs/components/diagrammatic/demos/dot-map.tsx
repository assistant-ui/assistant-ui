import { ABSTRACT_TILES, DotMap } from "diagrammatic";
import type { DemoExample } from "./types";

const COUNTS = ABSTRACT_TILES.map((tile) => {
  const east = tile.col >= 13;
  const capital = tile.col >= 4 && tile.col <= 7 && tile.row <= 2;
  const west = tile.col <= 3 && tile.row <= 4;
  if (capital) return 8 + tile.col;
  if (east) return 5 + Math.max(0, 3 - tile.row);
  if (west) return 4;
  if (tile.row >= 6) return 1;
  return 2;
});

export const glyph = (
  <DotMap title="WAU" counts={COUNTS} unitLabel="1 dot = 50 WAU" />
);

export const examples: DemoExample[] = [
  {
    title: "One dot is fifty weekly actives",
    setup:
      "Texture instead of fill. A low-count region stays sparse. The unit is printed on the figure.",
    read: "The capital tiles have 12 to 15 dots each. Interior tiles carry one or two. Dot counts keep sparse areas visibly sparse.",
    source: "Weekly actives, week of 11 Aug. 1 dot = 50 people.",
    chart: (
      <DotMap
        aspect={1.7}
        title="Weekly actives"
        counts={COUNTS}
        unitLabel="1 dot = 50 weekly actives"
      />
    ),
  },
];
