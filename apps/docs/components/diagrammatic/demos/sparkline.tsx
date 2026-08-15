import { Sparkline } from "diagrammatic";
import type { DemoExample } from "./types";

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
          <span className="text-foreground/55 w-12">{row.label}</span>
          <Sparkline data={row.data} title={row.label} />
          <span className="text-foreground/80 w-10 text-right">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export const examples: DemoExample[] = [
  {
    title: "Host vitals in a monitoring sidebar",
    setup:
      "A hosts list shows three vitals per machine in the width of a table cell: a word, a line, a number. The sparkline exists to fit exactly between them.",
    read: "cpu is trending up and just hit 86% — the shape says 'steady climb', not 'spike', which changes the response from restart to capacity plan. The line carries the verdict; the number carries the evidence.",
    chart: <Rows rows={VITALS} />,
  },
  {
    title: "A watchlist of three tickers",
    setup:
      "A brokerage app's watchlist gives each ticker one row: symbol, the week's shape, last price. Nobody trades off a sparkline, but everybody triages with one.",
    read: "OKAI grinds upward, VLTA bleeds, NMBS goes nowhere — three theses in thirty pixels each. The eye reads shape first and price second, which is the correct order for a watchlist.",
    chart: <Rows rows={TICKERS} />,
  },
  {
    title: "Store health, eight weeks",
    setup:
      "A store manager's weekly email opens with three metrics that would each deserve a chart, given a line's worth of space instead.",
    read: "Visits and basket size climb together while returns fall — every shape agrees, which almost never happens and deserves the one-line celebration. When the shapes disagree, this row becomes the agenda.",
    chart: <Rows rows={STORE} />,
  },
];
