import { Sparkbar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const ROWS = [
  {
    label: "api",
    data: [2, 1, 4, 3, 6, 5, 2, 1, 8, 3, 2, 4, 1, 0],
    value: "42",
  },
  {
    label: "web",
    data: [1, 0, 2, 2, 3, 1, 0, 1, 4, 2, 1, 2, 1, 1],
    value: "21",
  },
  {
    label: "jobs",
    data: [0, 0, 1, 0, 2, 1, 0, 0, 3, 1, 0, 1, 0, 0],
    value: "9",
  },
];

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; value: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-72 flex-col gap-3 font-[family-name:var(--font-mono)] text-xs">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="w-10 opacity-60">{row.label}</span>
          <Sparkbar data={row.data} title={row.label} />
          <span className="w-8 text-right opacity-90">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export const glyph = <Rows rows={ROWS} />;

export const examples: DemoExample[] = [
  {
    title: "Deploys per day, last two weeks",
    setup:
      "A delivery board gives each service one table row: fourteen bars for fourteen days, the count at the end. Discrete periods stay bars. A line would invent a slope that never happened.",
    read: "api shipped 42 times and spiked to 8 on the ninth day, the incident hotfix. jobs stayed almost empty except that same day. The zeros are the point; a sparkline would have drawn through them.",
    source: "Deploy events, last 14 calendar days.",
    chart: (
      <FigTooltip
        series={{
          api: ROWS[0]!.data,
          web: ROWS[1]!.data,
          jobs: ROWS[2]!.data,
        }}
      >
        <Rows rows={ROWS} />
      </FigTooltip>
    ),
  },
];
