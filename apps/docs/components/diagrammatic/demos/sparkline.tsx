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
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-mono text-xs">
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
    note: "A word, a line, a number: the whole point is fitting between them.",
    chart: <Rows rows={VITALS} />,
  },
  {
    title: "A watchlist of three tickers",
    note: "The shape carries the week; the number carries the close.",
    chart: <Rows rows={TICKERS} />,
  },
  {
    title: "Store health, eight weeks",
    note: "Three metrics that would each deserve a chart get a line's worth of space instead.",
    chart: <Rows rows={STORE} />,
  },
];
