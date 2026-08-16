import { Sparkline } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Report, Terminal } from "./scenes";

const VITALS = [
  { label: "cpu", data: [40, 55, 48, 62, 58, 74, 70, 86], value: "86%" },
  { label: "mem", data: [62, 60, 66, 64, 70, 68, 72, 71], value: "71%" },
  { label: "req", data: [30, 44, 38, 30, 46, 40, 58, 52], value: "52/s" },
];

const TICKERS = [
  {
    label: "OKAI",
    data: [212, 218, 214, 226, 231, 228, 240, 246],
    value: "246",
  },
  { label: "VLTA", data: [88, 84, 86, 79, 74, 76, 71, 68], value: "68" },
  { label: "NMBS", data: [34, 35, 33, 36, 34, 37, 35, 36], value: "36" },
];

const STORE = [
  {
    label: "visits",
    data: [420, 480, 460, 540, 520, 610, 660, 700],
    value: "700",
  },
  { label: "basket", data: [38, 37, 39, 41, 40, 43, 42, 44], value: "$44" },
  { label: "returns", data: [22, 18, 24, 20, 16, 14, 12, 9], value: "9" },
];

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
          <Sparkline data={row.data} title={row.label} />
          <span className="w-10 text-right opacity-90">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export const glyph = <Rows rows={VITALS} />;

export const examples: DemoExample[] = [
  {
    title: "Host vitals in a monitoring sidebar",
    setup:
      "A hosts list shows three vitals per machine in the width of a table cell: a word, a line, a number. The sparkline exists to fit exactly between them.",
    read: "cpu is trending up and just hit 86% — the shape says 'steady climb', not 'spike', which changes the response from restart to capacity plan. The line carries the verdict; the number carries the evidence.",
    chart: (
      <Terminal title="host vitals">
        <Rows rows={VITALS} />
      </Terminal>
    ),
  },
  {
    title: "A watchlist of three tickers",
    setup:
      "A brokerage app's watchlist gives each ticker one row: symbol, the week's shape, last price. Nobody trades off a sparkline, but everybody triages with one.",
    read: "OKAI grinds upward, VLTA bleeds, NMBS goes nowhere — three theses in thirty pixels each. The eye reads shape first and price second, which is the correct order for a watchlist.",
    chart: (
      <AppCard title="Watchlist" meta="this week">
        <Rows rows={TICKERS} />
      </AppCard>
    ),
  },
  {
    title: "Store health, eight weeks",
    setup:
      "A store manager's weekly email opens with three metrics that would each deserve a chart, given a line's worth of space instead.",
    read: "Visits and basket size climb together while returns fall — every shape agrees, which almost never happens and deserves the one-line celebration. When the shapes disagree, this row becomes the agenda.",
    chart: (
      <Report title="Store health" chip="8 weeks">
        <Rows rows={STORE} />
      </Report>
    ),
  },
  {
    title: "The stat tile: a composition, not a component",
    setup:
      "Every dashboard opens with a card like this — a label, a big number, a delta, a trend. It is deliberately not a chart component: the number and delta are copy, not data, so the tile is markup you own with a Sparkline dropped in.",
    read: "The package draws the one part that is actually a chart; the rest is your design system's job. Swap the typography, move the delta, stack three tiles in a row — the composition is yours, which is the point.",
    chart: (
      <div className="border-foreground/15 mx-auto w-full max-w-52 border px-4 py-3.5 font-[family-name:var(--font-mono)]">
        <p className="text-foreground/50 text-[11px]">active runs</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-foreground/90 text-2xl tabular-nums">
            1,284
          </span>
          <span className="text-[11px] text-[#3b82f6]">▲ 12.4%</span>
        </div>
        <div className="mt-3">
          <Sparkline
            data={[30, 42, 38, 52, 48, 62, 70, 84]}
            title="active runs trend"
          />
        </div>
      </div>
    ),
  },
];
