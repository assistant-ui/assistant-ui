import { Chord } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Trade flows between regions",
    note: "Ribbon width is volume; the americas-asia ribbon dwarfs the rest of the circle.",
    chart: (
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
    ),
  },
  {
    title: "Messages between four departments",
    note: "Eng and product talk constantly; the thin sales-eng ribbon is the org chart's blind spot.",
    chart: (
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
    ),
  },
  {
    title: "Passengers between four hubs",
    note: "Every pair is connected, but the two coastal hubs exchange half the traffic alone.",
    chart: (
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
    ),
  },
];
