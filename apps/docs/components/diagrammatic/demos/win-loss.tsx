import { WinLoss } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const S24 = [1, 1, -1, 1, -1, 1, 1, 1, -1, 1, 1, -1, 1, 1, 1, -1, 1, 1];
const S25 = [-1, -1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1];

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; title: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-80 flex-col gap-4 font-[family-name:var(--font-mono)] text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-10 opacity-60">{row.label}</span>
          <WinLoss data={row.data} title={row.title} />
        </div>
      ))}
    </div>
  );
}

export const glyph = (
  <Rows
    rows={[
      { label: "s24", data: S24.slice(0, 12), title: "season 24/25" },
      { label: "s25", data: S25.slice(0, 12), title: "season 25/26" },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Arsenal, first eighteen league matches",
    setup:
      "A club page compresses each result into a tick above or below the line. No scores. Streaks are what the eye keeps.",
    read: "24/25 opens with a title-charge run. 25/26 opens 1-4 and only finds the same rhythm after matchweek 8. Same club; the sack conversation lived in those first seven ticks.",
    source: "Premier League, matchweeks 1 to 18.",
    chart: (
      <FigTooltip
        series={{
          "24/25": S24.map((v) => (v > 0 ? "W" : "L")),
          "25/26": S25.map((v) => (v > 0 ? "W" : "L")),
        }}
      >
        <Rows
          rows={[
            { label: "24/25", data: S24, title: "season 24/25" },
            { label: "25/26", data: S25, title: "season 25/26" },
          ]}
        />
      </FigTooltip>
    ),
  },
];
