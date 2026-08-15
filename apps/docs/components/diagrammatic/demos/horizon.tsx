import { Horizon } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Server load across 24 hours, folded three times",
    note: "The darker the band, the higher the fold; a tall line lives in a short strip.",
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
    note: "The flood week is the dark block; everything else stays in the first fold.",
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
    note: "Rush hours fold twice; the 3am floor barely registers.",
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
