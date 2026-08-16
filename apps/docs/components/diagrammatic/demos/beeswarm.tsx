import { Beeswarm } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Terminal } from "./scenes";

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
  {
    title: "Marathon field by age",
    setup:
      "A race organizer plots every finisher's age as a dot, because sponsors keep asking who actually runs this thing and deserve a truthful shape rather than a mean.",
    read: "The swarm thickens through the thirties, thins after fifty, and then there is the flagged dot at 71 — the finisher the local paper will interview. The gaps matter too: almost nobody under 22, which is a marketing brief in one empty stretch.",
    chart: (
      <Paper kicker="Race" title="Who runs the marathon">
        <Beeswarm
          title="Finisher ages"
          values={[
            19, 22, 24, 25, 26, 27, 28, 28, 29, 30, 31, 31, 32, 33, 33, 34, 35,
            35, 36, 37, 38, 39, 40, 42, 44, 46, 49, 53, 58, 71,
          ]}
          flag={{ at: 71, label: "71" }}
          labels={["20", "35", "50", "65"]}
        />
      </Paper>
    ),
  },
  {
    title: "Flat white prices across the city",
    setup:
      "A coffee blog surveys 22 cafés for its annual price index and plots every café as a dot, names withheld, one exception flagged.",
    read: "Most of the city clusters within a dollar of $4.20; the flagged $7.50 dot is the airport, priced for people who cannot leave. A swarm of 22 points carries the whole survey without a single average being quoted.",
    chart: (
      <AppCard title="Flat white index" meta="22 cafés">
        <Beeswarm
          title="Flat white prices"
          values={[
            3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.8, 3.9, 4, 4, 4.1, 4.2, 4.2, 4.3,
            4.4, 4.5, 4.6, 4.8, 5, 5.2, 5.5, 7.5,
          ]}
          flag={{ at: 7.5, label: "$7.50" }}
          labels={["$3", "$4.50", "$6", "$7.50"]}
        />
      </AppCard>
    ),
  },
];
