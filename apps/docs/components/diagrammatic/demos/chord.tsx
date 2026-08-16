import { Chord } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Slide } from "./scenes";

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
    read: "The americas–asia ribbon dwarfs the rest of the circle — the Pacific is the world economy's main street. Africa's arc touches everything thinly, which is both its trade profile and its negotiating position, drawn.",
    chart: (
      <Paper
        kicker="Trade"
        title="The Pacific's main street"
        source="Source: customs aggregates"
      >
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
      </Paper>
    ),
  },
  {
    title: "Messages between four departments",
    setup:
      "A workplace-analytics tool renders a quarter of cross-team messages as chords, and the org chart meets the actual communication graph for the first time.",
    read: "Eng and product talk constantly — the fat ribbon is the roadmap being negotiated in real time. The thin sales–eng ribbon is the org's blind spot; every escalation that surprised engineering this quarter traveled through it.",
    chart: (
      <AppCard title="Who talks to whom" meta="one quarter">
        <Chord
          title="Cross-team messages"
          groups={["eng", "product", "sales", "support"]}
          flows={[
            { from: "eng", to: "product", value: 34 },
            { from: "product", to: "sales", value: 16 },
            { from: "sales", to: "support", value: 22 },
            { from: "support", to: "eng", value: 12 },
            { from: "eng", to: "sales", value: 4 },
          ]}
        />
      </AppCard>
    ),
  },
  {
    title: "Passengers between four hubs",
    setup:
      "An aviation analyst charts passenger flows between four hub airports. Every pair connects, so the matrix wraps onto a circle and becomes readable.",
    read: "The jfk–lhr ribbon is the Atlantic bridge, half the circle's traffic on its own. Every pair is connected but nowhere near equally, and the ribbons expose the difference between 'we fly there' and 'that route is the business'.",
    chart: (
      <Slide title="Between four hubs" footer="aviation review">
        <Chord
          title="Passengers between hubs"
          groups={["jfk", "lhr", "hnd", "dxb"]}
          flows={[
            { from: "jfk", to: "lhr", value: 28 },
            { from: "lhr", to: "dxb", value: 18 },
            { from: "hnd", to: "jfk", value: 12 },
            { from: "dxb", to: "hnd", value: 14 },
            { from: "lhr", to: "hnd", value: 8 },
          ]}
        />
      </Slide>
    ),
  },
];
