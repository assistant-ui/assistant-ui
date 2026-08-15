import { Horizon } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Server load across 24 hours, folded three times",
    setup:
      "A dashboard has forty servers and forty rows of vertical space, so each load chart gets one short band. The horizon form folds a tall line into layers: the darker the band, the higher the fold.",
    read: "The dark blocks around hours 8 and 11 are the load peaks, readable in a strip a line chart could not survive in. Readers need the key — dark means folded, not different — so keep the fold count at two or three.",
    chart: (
      <Horizon
        title="Server load across 24 hours"
        data={[
          2, 3.5, 5, 4.2, 6, 7.5, 6.2, 8, 9.5, 8.5, 7, 9, 6.5, 5, 6, 4.5, 3, 4,
        ]}
        bands={3}
        labels={["00", "06", "12", "18", "24"]}
      />
    ),
  },
  {
    title: "River level above normal, one month of readings",
    setup:
      "A flood-monitoring page shows thirty gauges at once, one skinny band each. This is the gauge that mattered last month: a river's level above seasonal normal, twice-daily readings.",
    read: "The flood week is the one dark block; everything else lives in the first fold. The form's economy is the point — an operator scanning thirty of these finds the dark block in seconds, which is the entire job.",
    chart: (
      <Horizon
        title="River level above normal"
        data={[
          0.4, 0.6, 0.5, 0.8, 1.2, 2.6, 3.4, 3.8, 3.2, 2.4, 1.6, 1.1, 0.9, 0.7,
          0.6, 0.8, 0.7, 0.5,
        ]}
        bands={3}
        labels={["w1", "w2", "w3", "w4"]}
      />
    ),
  },
  {
    title: "Street noise outside the studio, one day",
    setup:
      "A podcast studio logs sound levels to find recordable hours. The producer wants the whole day in a strip above the booking calendar, so the tall daily curve gets folded.",
    read: "Both rush hours fold twice — those windows are unusable — while the 3am floor barely registers in the first band. The recordable valley from 9 to 11 is visible as the pale gap between dark blocks, and that is when sessions get booked.",
    chart: (
      <Horizon
        title="Street noise level"
        data={[
          1, 0.6, 0.5, 0.8, 2.2, 4.4, 5.2, 4, 3.2, 3.6, 3, 3.4, 3.8, 3.2, 4.6,
          5.4, 4.2, 2.6,
        ]}
        bands={3}
        labels={["00", "06", "12", "18", "24"]}
      />
    ),
  },
];
