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
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-[family-name:var(--font-mono)] text-xs">
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
    setup:
      "A network dashboard summarizes three ratios per link — download/upload, read/write, cache hit/miss — each as one bar split at the boundary. Two shares that sum to the whole; the split point is the entire message.",
    read: "72/28 down-up is a consumer link doing consumer things; 86/14 hit-miss is a cache earning its memory. The read/write split near even is the one worth watching — writes that heavy usually mean someone is logging too much.",
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
    setup:
      "A club's season summary compresses three two-sided battles into three split bars: home versus away wins, possession, shots on target.",
    read: "Home and away tell on the team — 14 wins at home, 6 on the road — while possession and shots both lean our way. A side that dominates the ball everywhere but only wins at home has a traveling problem, and three bars just diagnosed it.",
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
    setup:
      "An election-night page tracks three ballot measures as yes/no splits, updated as precincts report. The bar is the tally, live.",
    read: "Measures A and C are decided — the splits are visibly lopsided — but B's near-even split is inside the recount margin, and everyone watching this page knows which bar they are refreshing for.",
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
