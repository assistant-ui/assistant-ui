import { WinLoss } from "diagrammatic";
import type { DemoExample } from "./types";

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; title: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-4 font-[family-name:var(--font-mono)] text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-foreground/55 w-10">{row.label}</span>
          <WinLoss data={row.data} title={row.title} />
        </div>
      ))}
    </div>
  );
}

export const examples: DemoExample[] = [
  {
    title: "Two seasons of results",
    note: "Above the line or below it; the streaks read before the record does.",
    chart: (
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
    ),
  },
  {
    title: "Quota hit or missed, twelve months",
    note: "Two reps, one year: the second half tells a different story for each.",
    chart: (
      <Rows
        rows={[
          {
            label: "priya",
            data: [1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, 1],
            title: "priya quota",
          },
          {
            label: "sam",
            data: [1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, -1],
            title: "sam quota",
          },
        ]}
      />
    ),
  },
  {
    title: "Two habits, two weeks",
    note: "Kept or broken, day by day; the workout survives weekends, the diet does not.",
    chart: (
      <Rows
        rows={[
          {
            label: "gym",
            data: [1, 1, -1, 1, 1, 1, 1, 1, 1, -1, 1, 1, 1, 1],
            title: "gym days",
          },
          {
            label: "no sugar",
            data: [1, 1, 1, 1, -1, -1, 1, 1, 1, 1, -1, -1, 1, -1],
            title: "no-sugar days",
          },
        ]}
      />
    ),
  },
];
