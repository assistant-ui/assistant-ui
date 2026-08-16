import { Beeswarm } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <Beeswarm
    title="PR review latency"
    values={[
      2, 3, 3.5, 4, 4.2, 4.4, 5, 5.2, 5.5, 6, 6.2, 6.5, 7, 7.2, 7.4, 8, 8.5, 9,
      10, 11, 12, 14, 16, 20, 24, 48,
    ]}
    flag={{ at: 48, label: "48h" }}
    labels={["0h", "12h", "24h", "36h", "48h"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "PR review latency, every point kept",
    setup:
      "An engineering manager suspects review times are fine 'except when they're not', and refuses to let a histogram round the exceptions away. Every PR gets its own dot on one axis.",
    read: "The swarm thickens between four and eight hours — healthy — and then there is the flagged 48-hour dot, which is one real PR with an author and a story, not a statistic. Averages absorb outliers; swarms point at them.",
    chart: (
      <Terminal title="pr review latency">
        <Beeswarm
          title="PR review latency"
          values={[
            2, 3, 3.5, 4, 4.2, 4.4, 5, 5.2, 5.5, 6, 6.2, 6.5, 7, 7.2, 7.4, 8,
            8.5, 9, 10, 11, 12, 14, 16, 20, 24, 48,
          ]}
          flag={{ at: 48, label: "48h" }}
          labels={["0h", "12h", "24h", "36h", "48h"]}
        />
      </Terminal>
    ),
  },
];
