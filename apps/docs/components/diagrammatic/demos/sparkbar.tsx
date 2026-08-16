import { Sparkbar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

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
          <Sparkbar data={row.data} title={row.label} />
          <span className="w-9 text-right opacity-90">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export const glyph = (
  <Rows
    rows={[
      {
        label: "mon",
        data: [3, 5, 4, 7, 6, 9, 8, 10, 7, 6, 8, 9],
        value: "82",
      },
      {
        label: "tue",
        data: [5, 4, 6, 5, 8, 7, 9, 8, 10, 9, 7, 8],
        value: "86",
      },
      {
        label: "wed",
        data: [2, 3, 5, 4, 6, 5, 7, 9, 8, 10, 9, 11],
        value: "79",
      },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Deploys per two-hour block, three days",
    setup:
      "A delivery dashboard gives each day one row of tiny bars — deploy counts per two-hour block — because discrete counts deserve bars, not a smoothed line.",
    read: "The daily rhythm repeats: quiet mornings, afternoon peaks. Wednesday's tallest bar landed at 18h, which is the deploy-freeze conversation waiting to happen; zero blocks stay visibly empty instead of being interpolated away.",
    chart: (
      <Terminal title="deploys — 3 days">
        <FigTooltip
          series={{
            mon: [3, 5, 4, 7, 6, 9, 8, 10, 7, 6, 8, 9],
            tue: [5, 4, 6, 5, 8, 7, 9, 8, 10, 9, 7, 8],
            wed: [2, 3, 5, 4, 6, 5, 7, 9, 8, 10, 9, 11],
          }}
        >
          <Rows
            rows={[
              {
                label: "mon",
                data: [3, 5, 4, 7, 6, 9, 8, 10, 7, 6, 8, 9],
                value: "82",
              },
              {
                label: "tue",
                data: [5, 4, 6, 5, 8, 7, 9, 8, 10, 9, 7, 8],
                value: "86",
              },
              {
                label: "wed",
                data: [2, 3, 5, 4, 6, 5, 7, 9, 8, 10, 9, 11],
                value: "79",
              },
            ]}
          />
        </FigTooltip>
      </Terminal>
    ),
  },
];
