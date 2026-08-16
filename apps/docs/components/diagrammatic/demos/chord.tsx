import { Chord } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <Chord
    title="Trade flows between regions"
    groups={["americas", "europe", "asia", "africa"]}
    flows={[
      { from: "americas", to: "asia", value: 30 },
      { from: "americas", to: "europe", value: 18 },
      { from: "europe", to: "africa", value: 14 },
      { from: "asia", to: "africa", value: 8 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Trade flows between regions",
    setup:
      "A trade economist draws four regions on one circle, ribbons between them sized by volume, because when everyone trades with everyone, columns stop working and the circle starts.",
    read: "The americas–asia ribbon dwarfs the rest of the circle — the Pacific is the world economy's main street, and the europe–asia ribbon beside it is the second. Africa's arc touches all four partners thinly, which is both its trade profile and its negotiating position; oceania's whole arc rides on asia. Eight ribbons, one glance, no matrix.",
    chart: (
      <Paper
        kicker="Trade"
        title="The Pacific's main street"
        source="Source: customs aggregates"
      >
        <Chord
          title="Trade flows between regions"
          groups={["americas", "europe", "asia", "africa", "oceania"]}
          flows={[
            { from: "americas", to: "asia", value: 30 },
            { from: "europe", to: "asia", value: 22 },
            { from: "americas", to: "europe", value: 18 },
            { from: "europe", to: "africa", value: 11 },
            { from: "asia", to: "africa", value: 8 },
            { from: "asia", to: "oceania", value: 7 },
            { from: "americas", to: "africa", value: 4 },
            { from: "americas", to: "oceania", value: 3 },
          ]}
        />
      </Paper>
    ),
  },
];
