import { Horizon } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <Horizon
    title="Server load across 24 hours"
    data={[
      2, 3.5, 5, 4.2, 6, 7.5, 6.2, 8, 9.5, 8.5, 7, 9, 6.5, 5, 6, 4.5, 3, 4,
    ]}
    bands={3}
    labels={["00", "06", "12", "18", "24"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Server load across 24 hours, folded three times",
    setup:
      "A dashboard has forty servers and forty rows of vertical space, so each load chart gets one short band. The horizon form folds a tall line into layers: the darker the band, the higher the fold.",
    read: "The dark blocks around hours 8 and 11 are the load peaks, readable in a strip a line chart could not survive in. Readers need the key — dark means folded, not different — so keep the fold count at two or three.",
    chart: (
      <Terminal title="fleet load — 24h">
        <Horizon
          title="Server load across 24 hours"
          data={[
            2, 3.5, 5, 4.2, 6, 7.5, 6.2, 8, 9.5, 8.5, 7, 9, 6.5, 5, 6, 4.5, 3,
            4,
          ]}
          bands={3}
          labels={["00", "06", "12", "18", "24"]}
        />
      </Terminal>
    ),
  },
];
