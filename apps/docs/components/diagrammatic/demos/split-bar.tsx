import { SplitBar } from "diagrammatic";
import type { DemoExample } from "./types";

const ROWS = [
  {
    label: "edge · west-1",
    a: { label: "hit", value: 91 },
    b: { label: "miss", value: 9 },
  },
  {
    label: "edge · east-1",
    a: { label: "hit", value: 84 },
    b: { label: "miss", value: 16 },
  },
  {
    label: "origin · writes",
    a: { label: "ok", value: 97 },
    b: { label: "err", value: 3 },
  },
];

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
    <div className="mx-auto flex w-full max-w-72 flex-col gap-3 font-[family-name:var(--font-mono)] text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1">
          <span className="opacity-55">{row.label}</span>
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

export const glyph = <Rows rows={ROWS} />;

export const examples: DemoExample[] = [
  {
    title: "Cache hits against origin errors",
    setup:
      "Each row has two shares that sum to 100. Three rows show their split points side by side.",
    read: "West-1 has 91% hits and 9% misses. East-1 misses 16%, seven points more than west-1. Origin writes show 3% errors.",
    source: "Edge and origin counters, last 60 minutes.",
    chart: <Rows rows={ROWS} />,
  },
];
