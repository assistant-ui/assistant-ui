import { ABSTRACT_TILES, Choropleth } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Active users per square km",
    note: "Intensity on an abstract landmass; the dark coast is the population, not the geography.",
    chart: (
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
    ),
  },
  {
    title: "Annual rainfall by region",
    note: "A wet west that dries eastward: one gradient, read like weather.",
    chart: (
      <Choropleth
        title="Annual rainfall"
        values={ABSTRACT_TILES.map((tile) =>
          Math.max(0.05, 1 - tile.col / 18 + 0.16 * Math.sin(tile.row * 1.9)),
        )}
        legendLabel="mm/year"
      />
    ),
  },
  {
    title: "Fiber coverage by district",
    note: "Cities and their corridors saturate first; the interior stays pale for another budget cycle.",
    chart: (
      <Choropleth
        title="Fiber coverage"
        values={ABSTRACT_TILES.map((tile) => {
          const hubA = Math.exp(
            -((tile.col - 5) ** 2 + (tile.row - 2) ** 2) / 8,
          );
          const hubB = Math.exp(
            -((tile.col - 13) ** 2 + (tile.row - 5) ** 2) / 10,
          );
          return Math.min(1, 0.08 + hubA + hubB);
        })}
        legendLabel="% covered"
      />
    ),
  },
];
