import { Beeswarm } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const HOURS = [
  0.6, 0.8, 1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3,
  2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8,
  3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.4,
  5.6, 5.8, 6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.3, 7.6, 8.0, 8.4, 8.8, 9.2, 9.8,
  10.4, 11.0, 11.8, 12.6, 13.5, 14.8, 16.2, 18.0, 20.4, 22.0, 24.5, 28.0, 31.0,
  36.0, 42.0, 48.0, 54.0, 62.0,
];

export const glyph = (
  <Beeswarm
    title="PR review hours"
    values={HOURS.slice(0, 26)}
    flag={{ at: 48, label: "48h" }}
    labels={["0h", "24h", "48h"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Every PR in March, time to first review",
    setup:
      "Seventy-eight pull requests, one dot each. A histogram would have rounded the 62-hour review into a bin. The flag is a person.",
    read: "The swarm thickens between two and six hours. Then the tail: six reviews past a working day, two past two days, one at 62 hours that sat over a long weekend on legacy-billing. The SLO is 12 hours; the dots past the last labelled tick are the conversation.",
    source: "First non-author review, March 2025. n = 78.",
    chart: (
      <FigTooltip series={{ hours: HOURS }} unit="h">
        <Beeswarm
          density="figure"
          aspect={2.2}
          title="Hours to first review"
          values={HOURS}
          flag={{ at: 62, label: "62h" }}
          labels={["0h", "12h", "24h", "48h"]}
        />
      </FigTooltip>
    ),
  },
];
