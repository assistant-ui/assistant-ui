import { SplitBar } from "diagrammatic";
import type { DemoExample } from "./types";

const ROWS = [
  {
    label: "edge · iad-1",
    a: { label: "hit", value: 91 },
    b: { label: "miss", value: 9 },
  },
  {
    label: "edge · cdg-1",
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
      "A traffic row is two shares that sum to the whole. Three links, three bars, no poster. The split point is the entire message.",
    read: "iad-1 is earning its memory at 91/9. cdg-1 is the leak: 16% miss is why origin CPU woke up. Writes at 3% error are inside budget, so the page is about the Paris cache, not the database.",
    source: "Edge and origin counters, last 60 minutes.",
    chart: <Rows rows={ROWS} />,
  },
];
