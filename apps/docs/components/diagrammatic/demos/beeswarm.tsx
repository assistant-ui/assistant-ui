import { Beeswarm } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
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
        <FigTooltip
          series={{
            hours: [
              1.5, 2, 2.4, 2.8, 3, 3.2, 3.5, 3.8, 4, 4.1, 4.2, 4.4, 4.6, 4.8, 5,
              5.1, 5.2, 5.4, 5.5, 5.7, 6, 6.1, 6.2, 6.4, 6.5, 6.8, 7, 7.1, 7.2,
              7.4, 7.6, 8, 8.2, 8.5, 9, 9.5, 10, 11, 12, 13, 14, 16, 20, 24, 48,
            ],
          }}
          unit="h"
        >
          <Beeswarm
            title="PR review latency"
            values={[
              1.5, 2, 2.4, 2.8, 3, 3.2, 3.5, 3.8, 4, 4.1, 4.2, 4.4, 4.6, 4.8, 5,
              5.1, 5.2, 5.4, 5.5, 5.7, 6, 6.1, 6.2, 6.4, 6.5, 6.8, 7, 7.1, 7.2,
              7.4, 7.6, 8, 8.2, 8.5, 9, 9.5, 10, 11, 12, 13, 14, 16, 20, 24, 48,
            ]}
            flag={{ at: 48, label: "48h" }}
            labels={["0h", "12h", "24h", "36h", "48h"]}
          />
        </FigTooltip>
      </Terminal>
    ),
  },
];
