import { Column, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper, Report } from "./scenes";

export const glyph = (
  <Column
    title="Quarterly revenue"
    items={[
      { label: "Q1", value: 3_800_000 },
      { label: "Q2", value: 5_200_000 },
      { label: "Q3", value: 4_400_000 },
      { label: "Q4", value: 6_600_000 },
      { label: "Q1", value: 5_800_000 },
      { label: "Q2", value: 7_400_000 },
      { label: "Q3", value: 9_000_000 },
    ]}
    highlight="last"
    format={(v) => `$${formatCompact(v)}`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "The benchmark card: one entity, one color, every value printed",
    setup:
      "The chart every model release ships: contenders as columns, each its own identity color, the score printed on top, a footnote defining the metric. Here it is rebuilt whole — `categorical` colors each item from the token palette, `values` prints every score, and the card chrome is a few lines of your own markup.",
    read: "Identity color follows the entity, so the same hue can track kestrel across every chart in the report. The gap between third and first is 10.8 points, readable without touching the axis — which is what value labels are for.",
    chart: (
      <Report
        title="FrontierBench 1.1 Main"
        chip="Score"
        note="Score is a weighted aggregate of the rubric items. Runs that miss a blocking criterion score 0."
      >
        <Column
          categorical
          values
          title="FrontierBench 1.1 scores"
          items={[
            { label: "kestrel", value: 24.5 },
            { label: "heron", value: 30.1 },
            { label: "vesper", value: 35.3 },
            { label: "atlas-1", value: 42.3 },
          ]}
          format={(v) => v.toFixed(1)}
        />
      </Report>
    ),
  },
  {
    title: "Electric cars sold per year",
    setup:
      "A transport ministry charts EV registrations by year to evaluate the subsidy it just ended. Columns fit because years are discrete and the last one needs to be pointable-at.",
    read: "Each column nearly doubles the one before — until 2025, the first year without the subsidy, highlighted and lower. One bar turns a policy debate concrete: growth didn't stop, but the doubling did.",
    chart: (
      <Paper
        kicker="EV"
        title="The year the subsidy ended"
        source="Source: national vehicle registry"
      >
        <Column
          title="EVs sold per year"
          items={[
            { label: "'19", value: 12_000 },
            { label: "'20", value: 19_000 },
            { label: "'21", value: 38_000 },
            { label: "'22", value: 71_000 },
            { label: "'23", value: 128_000 },
            { label: "'24", value: 204_000 },
            { label: "'25", value: 187_000 },
          ]}
          highlight="last"
          format={(v) => formatCompact(v)}
        />
      </Paper>
    ),
  },
];
