import { Upset } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const SETS = ["sev-1", "weekend", "customer", "regression", "paging"];
const HITS = [
  { sets: ["paging"], value: 38 },
  { sets: ["customer"], value: 27 },
  { sets: ["sev-1", "paging"], value: 18 },
  { sets: ["weekend", "paging"], value: 14 },
  { sets: ["regression"], value: 12 },
  { sets: ["sev-1", "customer", "paging"], value: 9 },
  { sets: ["customer", "regression"], value: 7 },
  { sets: ["sev-1", "weekend", "paging"], value: 6 },
  { sets: ["weekend", "customer"], value: 4 },
  { sets: ["sev-1", "weekend", "customer", "paging"], value: 3 },
];

export const glyph = (
  <Upset
    title="Incident tags"
    sets={SETS.slice(0, 4)}
    intersections={HITS.slice(0, 6)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Which tags travel together",
    setup:
      "One quarter of incidents, five tags. The bars on top are combination size. The dots say which tags are in that combination. Venn cannot hold this.",
    read: "Paging alone is the largest pile. The dangerous column is the three-tag stack: sev-1, customer, and paging, nine times. Weekend paging without a customer is 14; weekend plus customer plus sev-1 is only three. The pages that wake someone and name an account are the meeting.",
    source: "Incident tickets, Q1. n = 138. A ticket may carry several tags.",
    chart: (
      <FigTooltip
        labels={HITS.map((row) => row.sets.join(" + "))}
        series={{ count: HITS.map((row) => row.value) }}
      >
        <Upset
          density="figure"
          aspect={1.7}
          title="Incident tag co-occurrence"
          sets={SETS}
          intersections={HITS}
        />
      </FigTooltip>
    ),
  },
];
