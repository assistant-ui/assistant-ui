import { Sparkline } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const VITALS = [
  { label: "cpu", data: [40, 55, 48, 62, 58, 74, 70, 86], value: "86%" },
  { label: "mem", data: [62, 60, 66, 64, 70, 68, 72, 71], value: "71%" },
  { label: "req", data: [30, 44, 38, 30, 46, 40, 58, 52], value: "52/s" },
];

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; value: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-[family-name:var(--font-mono)] text-xs">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="w-12 opacity-60">{row.label}</span>
          <Sparkline
            data={row.data}
            title={row.label}
            fill={row.label === "cpu"}
          />
          <span className="w-10 text-right opacity-90">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export const glyph = <Rows rows={VITALS} />;

export const examples: DemoExample[] = [
  {
    title: "Host vitals in a monitoring sidebar",
    setup:
      "A hosts list shows three vitals per machine in the width of a table cell: a word, a line, a number. The sparkline exists to fit exactly between them.",
    read: "cpu is trending up and just hit 86%. The shape is a climb, not a spike, which is a capacity plan, not a restart. The line is the verdict; the number is the evidence.",
    source: "Host api-2a, last eight 5-minute samples.",
    chart: (
      <FigTooltip
        series={{
          cpu: VITALS[0]!.data,
          mem: VITALS[1]!.data,
          req: VITALS[2]!.data,
        }}
      >
        <Rows rows={VITALS} />
      </FigTooltip>
    ),
  },
];
