import { SplitBar } from "diagrammatic";
import type { DemoExample } from "./types";

function Rows({
  rows,
}: {
  rows: {
    label: string;
    a: { label: string; value: number };
    b: { label: string; value: number };
  }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-mono text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1">
          <span className="text-foreground/45">{row.label}</span>
          <SplitBar
            a={row.a}
            b={row.b}
            title={row.label}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      ))}
    </div>
  );
}

export const examples: DemoExample[] = [
  {
    title: "Traffic shape at a glance",
    note: "Two shares that sum to the whole; the split point is the entire message.",
    chart: (
      <Rows
        rows={[
          {
            label: "down / up",
            a: { label: "down", value: 72 },
            b: { label: "up", value: 28 },
          },
          {
            label: "read / write",
            a: { label: "read", value: 55 },
            b: { label: "write", value: 45 },
          },
          {
            label: "hit / miss",
            a: { label: "hit", value: 86 },
            b: { label: "miss", value: 14 },
          },
        ]}
      />
    ),
  },
  {
    title: "A season split three ways",
    note: "Home and away, possession, shots on target: three fights in one column.",
    chart: (
      <Rows
        rows={[
          {
            label: "home / away wins",
            a: { label: "home", value: 14 },
            b: { label: "away", value: 6 },
          },
          {
            label: "possession",
            a: { label: "us", value: 58 },
            b: { label: "them", value: 42 },
          },
          {
            label: "shots on target",
            a: { label: "us", value: 61 },
            b: { label: "them", value: 39 },
          },
        ]}
      />
    ),
  },
  {
    title: "Three ballot measures",
    note: "Yes against no; measure B is the only one still inside the recount margin.",
    chart: (
      <Rows
        rows={[
          {
            label: "measure a",
            a: { label: "yes", value: 64 },
            b: { label: "no", value: 36 },
          },
          {
            label: "measure b",
            a: { label: "yes", value: 51 },
            b: { label: "no", value: 49 },
          },
          {
            label: "measure c",
            a: { label: "yes", value: 41 },
            b: { label: "no", value: 59 },
          },
        ]}
      />
    ),
  },
];
