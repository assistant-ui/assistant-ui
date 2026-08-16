import { SplitBar } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

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

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Traffic shape at a glance",
    setup:
      "A network dashboard summarizes three ratios per link — download/upload, read/write, cache hit/miss — each as one bar split at the boundary. Two shares that sum to the whole; the split point is the entire message.",
    read: "72/28 down-up is a consumer link doing consumer things; 86/14 hit-miss is a cache earning its memory. The read/write split near even is the one worth watching — writes that heavy usually mean someone is logging too much.",
    chart: (
      <Terminal title="link ratios">
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
      </Terminal>
    ),
  },
];
