import { Beeswarm } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "PR review latency, every point kept",
    note: "The swarm shows each review; the flagged 48-hour dot is one real PR, not a statistic.",
    chart: (
      <Beeswarm
        title="PR review latency"
        values={[
          2, 3, 3.5, 4, 4.2, 4.4, 5, 5.2, 5.5, 6, 6.2, 6.5, 7, 7.2, 7.4, 8, 8.5,
          9, 10, 11, 12, 14, 16, 20, 24, 48,
        ]}
        flag={{ at: 48, label: "48h" }}
        labels={["0h", "12h", "24h", "36h", "48h"]}
      />
    ),
  },
  {
    title: "Marathon field by age",
    note: "The swarm thickens through the thirties; the flagged dot is the oldest finisher.",
    chart: (
      <Beeswarm
        title="Finisher ages"
        values={[
          19, 22, 24, 25, 26, 27, 28, 28, 29, 30, 31, 31, 32, 33, 33, 34, 35,
          35, 36, 37, 38, 39, 40, 42, 44, 46, 49, 53, 58, 71,
        ]}
        flag={{ at: 71, label: "71" }}
        labels={["20", "35", "50", "65"]}
      />
    ),
  },
  {
    title: "Flat white prices across the city",
    note: "Most cafés cluster within a dollar; the flagged dot is the airport.",
    chart: (
      <Beeswarm
        title="Flat white prices"
        values={[
          3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.8, 3.9, 4, 4, 4.1, 4.2, 4.2, 4.3, 4.4,
          4.5, 4.6, 4.8, 5, 5.2, 5.5, 7.5,
        ]}
        flag={{ at: 7.5, label: "$7.50" }}
        labels={["$3", "$4.50", "$6", "$7.50"]}
      />
    ),
  },
];
