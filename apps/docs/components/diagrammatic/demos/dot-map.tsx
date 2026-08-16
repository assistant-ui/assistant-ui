import { ABSTRACT_TILES, DotMap } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

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
  {
    title: "The sheep census",
    setup:
      "An agriculture ministry maps the livestock census the traditional way: one dot per five hundred sheep, placed where the flocks graze.",
    read: "The highlands are all dots and no towns; the coastal plain is the reverse. The dot map's oldest trick still works — two economies, one country, no legend beyond '1 dot = 500 sheep'.",
    chart: (
      <Paper
        kicker="Country"
        title="The sheep census"
        source="Source: agriculture ministry"
      >
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
      </Paper>
    ),
  },
  {
    title: "EV chargers installed this year",
    setup:
      "An energy agency maps the year's charger installations, one dot per ten chargers, to check the rollout against the plan's promise of 'corridors first'.",
    read: "The dots trace the highway corridor before they fill the neighborhoods around it — the plan, working. The empty cells far from the diagonal are next year's map, and the agency knows exactly where the press release photo gets taken.",
    chart: (
      <Report title="Chargers installed" chip="this year">
        <DotMap
          title="EV chargers installed"
          counts={ABSTRACT_TILES.map((tile) => {
            const corridor = Math.abs(tile.row - (2 + tile.col * 0.22));
            return Math.max(0, Math.round(4 - corridor * 2.2));
          })}
          unitLabel="1 dot = 10 chargers"
        />
      </Report>
    ),
  },
];
