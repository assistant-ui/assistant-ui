import { Pie } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const BILL = [
  { label: "compute", value: 4_180_000 },
  { label: "storage", value: 1_120_000 },
  { label: "egress", value: 740_000 },
  { label: "observability", value: 410_000 },
  { label: "other", value: 290_000 },
];

export const glyph = (
  <Pie
    title="Cloud bill"
    items={BILL.slice(0, 4)}
    format={(v) => `$${(v / 1_000_000).toFixed(1)}m`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "FY25 cloud bill",
    setup:
      "Five slices, one dominant. The pie exists for a share you can point at, not a ranking of vendors.",
    read: "The hole says $6.74m. Compute is 62% of it. Storage plus egress is still smaller than that one slice. The meeting is about idle GPU, not the observability line.",
    source: "Cloud invoice rollup, FY25. Total $6.74m.",
    chart: (
      <FigTooltip
        labels={BILL.map((row) => row.label)}
        series={{
          spend: ["$4.18m", "$1.12m", "$0.74m", "$0.41m", "$0.29m"],
        }}
      >
        <Pie
          density="figure"
          aspect={1.25}
          title="FY25 cloud spend"
          items={BILL}
          inner={0.58}
          center="$6.74m"
          centerLabel="FY25"
          format={(v) => `$${(v / 1_000_000).toFixed(2)}m`}
        />
      </FigTooltip>
    ),
  },
];
