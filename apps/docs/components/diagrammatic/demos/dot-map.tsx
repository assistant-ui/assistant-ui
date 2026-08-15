import { ABSTRACT_TILES, DotMap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Where the users are",
    note: "Each dot is a hundred people; density becomes texture instead of a color scale.",
    chart: (
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
    ),
  },
  {
    title: "The sheep census",
    note: "The highlands are all dots and no towns; the coastal plain is the reverse.",
    chart: (
      <DotMap
        title="Sheep census"
        counts={ABSTRACT_TILES.map((tile) =>
          Math.max(
            0,
            Math.round(
              2.6 * Math.sin(tile.row * 0.9 + 0.6) +
                2 * Math.cos(tile.col * 0.7) +
                (tile.row < 3 ? 2 : 0),
            ),
          ),
        )}
        unitLabel="1 dot = 500 sheep"
      />
    ),
  },
  {
    title: "EV chargers installed this year",
    note: "Dots trace the highway corridor before they fill the neighborhoods around it.",
    chart: (
      <DotMap
        title="EV chargers installed"
        counts={ABSTRACT_TILES.map((tile) => {
          const corridor = Math.abs(tile.row - (2 + tile.col * 0.22));
          return Math.max(0, Math.round(4 - corridor * 2.2));
        })}
        unitLabel="1 dot = 10 chargers"
      />
    ),
  },
];
