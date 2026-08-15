import { Sparkbar } from "diagrammatic";
import type { DemoExample } from "./types";

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; value: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-mono text-xs">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-foreground/55 w-12">{row.label}</span>
          <Sparkbar data={row.data} title={row.label} />
          <span className="text-foreground/80 w-9 text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export const examples: DemoExample[] = [
  {
    title: "Deploys per two-hour block, three days",
    note: "Discrete counts get bars, not a line; zero blocks stay visibly empty.",
    chart: (
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
    ),
  },
  {
    title: "Steps per hour, three mornings",
    note: "The commute spike shows in the same column every day except the day it rained.",
    chart: (
      <Rows
        rows={[
          {
            label: "tue",
            data: [1, 2, 9, 3, 2, 4, 3, 5, 2, 3, 4, 6],
            value: "8.4k",
          },
          {
            label: "wed",
            data: [1, 1, 10, 2, 3, 3, 4, 4, 3, 2, 5, 5],
            value: "8.9k",
          },
          {
            label: "thu",
            data: [1, 1, 2, 2, 3, 4, 3, 5, 4, 3, 4, 5],
            value: "6.1k",
          },
        ]}
      />
    ),
  },
  {
    title: "Training volume by week, three lifts",
    note: "Twelve weeks of sets per lift; the deload weeks read as the short bars they are.",
    chart: (
      <Rows
        rows={[
          {
            label: "squat",
            data: [12, 14, 16, 8, 14, 16, 18, 9, 16, 18, 20, 10],
            value: "171",
          },
          {
            label: "bench",
            data: [10, 12, 12, 6, 12, 14, 14, 7, 14, 15, 16, 8],
            value: "140",
          },
          {
            label: "dead",
            data: [8, 9, 10, 5, 9, 10, 12, 6, 10, 12, 13, 6],
            value: "110",
          },
        ]}
      />
    ),
  },
];
