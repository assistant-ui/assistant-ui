import { WinLoss } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; title: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-4 font-[family-name:var(--font-mono)] text-xs">
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
      {
        label: "s24",
        data: [1, 1, -1, 1, -1, 1, 1, 1, -1, 1, 1, -1],
        title: "season s24",
      },
      {
        label: "s25",
        data: [-1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1],
        title: "season s25",
      },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Two seasons of results",
    setup:
      "A club's season page compresses every match into a tick above or below the line — no scores, just outcomes in order, because streaks are what fans actually remember.",
    read: "Above or below; the streaks read before the record does. s24 opens with a title-charge run and s25 opens with a slump — same club, and the eye knows which season had the sacked manager before counting a single tick.",
    chart: (
      <Paper kicker="Club" title="Two seasons">
        <Rows
          rows={[
            {
              label: "s24",
              data: [1, 1, -1, 1, -1, 1, 1, 1, -1, 1, 1, -1],
              title: "season s24",
            },
            {
              label: "s25",
              data: [-1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1],
              title: "season s25",
            },
          ]}
        />
      </Paper>
    ),
  },
];
