import { ABSTRACT_TILES, Choropleth } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

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
  {
    title: "Annual rainfall by region",
    setup:
      "A water authority maps the year's rainfall by region. One gradient, west to east, read the way everyone already reads weather maps.",
    read: "A wet west that dries eastward, with the mountain rows catching extra on the way — the rain shadow drawn in intensity steps. Every reservoir argument in this country happens across that gradient.",
    chart: (
      <Paper
        kicker="Climate"
        title="Where the rain falls"
        source="Source: gauge network, annual"
      >
        <Choropleth
          title="Annual rainfall"
          values={ABSTRACT_TILES.map((tile) =>
            Math.max(0.05, 1 - tile.col / 18 + 0.16 * Math.sin(tile.row * 1.9)),
          )}
          legendLabel="mm/year"
        />
      </Paper>
    ),
  },
  {
    title: "Fiber coverage by district",
    setup:
      "A broadband regulator publishes coverage by district ahead of the subsidy vote. The map is the argument both sides will point at.",
    read: "Two saturated blooms around the cities, corridors reaching between them, and an interior that stays pale for another budget cycle. The gradient's edge — where coverage falls off — is exactly where the subsidy is supposed to aim.",
    chart: (
      <Report title="Fiber coverage" chip="by district">
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
      </Report>
    ),
  },
];
