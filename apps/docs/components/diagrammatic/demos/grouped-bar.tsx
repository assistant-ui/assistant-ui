import { GroupedBar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const GROUPS = ["Q1 24", "Q2 24", "Q3 24", "Q4 24", "Q1 25", "Q2 25"];
const SEV1 = [6, 8, 5, 11, 4, 3];
const SEV2 = [18, 21, 16, 28, 14, 12];
const SEV3 = [41, 38, 44, 52, 36, 33];

export const glyph = (
  <GroupedBar
    title="Incidents by severity"
    groups={["Q4", "Q1", "Q2"]}
    series={[
      { name: "SEV-1", data: [11, 4, 3] },
      { name: "SEV-2", data: [28, 14, 12] },
      { name: "SEV-3", data: [52, 36, 33] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Incidents by severity, six quarters",
    setup:
      "The reliability review compares three severities inside each quarter. Grouping keeps SEV-1 against SEV-1; a stack would hide the only number the board quotes.",
    read: "Q4 24 is the outage quarter: SEV-1 triples past the budget of eight. The next two quarters fall back under the line, which is the on-call hiring landing, not seasonality. SEV-3 barely moves.",
    source: "Incident bot, production only. n = 486.",
    chart: (
      <FigTooltip
        labels={GROUPS}
        series={{ "SEV-1": SEV1, "SEV-2": SEV2, "SEV-3": SEV3 }}
        total
      >
        <GroupedBar
          density="figure"
          aspect={2}
          title="Incidents by severity"
          groups={GROUPS}
          series={[
            { name: "SEV-1", data: SEV1 },
            { name: "SEV-2", data: SEV2 },
            { name: "SEV-3", data: SEV3 },
          ]}
          yTicks={[
            { at: 0, label: "0" },
            { at: 25, label: "25" },
            { at: 50, label: "50" },
          ]}
          guides={[{ at: 8, label: "SEV-1 budget" }]}
        />
      </FigTooltip>
    ),
  },
];
