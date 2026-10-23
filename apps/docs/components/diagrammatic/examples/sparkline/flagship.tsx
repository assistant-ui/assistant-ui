import { Sparkline } from "diagrammatic";

const METRICS = [
  {
    name: "Revenue",
    value: "$48.2k",
    delta: "+12.4%",
    data: [31, 33, 32, 36, 38, 37, 41, 43, 42, 46, 47, 48],
  },
  {
    name: "Signups",
    value: "1,284",
    delta: "+8.1%",
    data: [80, 92, 88, 97, 104, 99, 110, 118, 112, 121, 126, 131],
  },
  {
    name: "Open incidents",
    value: "3",
    delta: "-2",
    data: [6, 5, 7, 6, 4, 5, 5, 4, 3, 4, 3, 3],
  },
];

export default function KpiTiles() {
  return (
    <div data-dg-motion="" className="grid gap-3 sm:grid-cols-3">
      {METRICS.map((metric) => (
        <div key={metric.name} className="rounded-lg border p-4">
          <div className="text-muted-foreground text-xs">{metric.name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-medium tabular-nums">
              {metric.value}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {metric.delta}
            </span>
          </div>
          <Sparkline
            block
            fill
            height={40}
            data={metric.data}
            title={`${metric.name}, last 12 weeks`}
            className="mt-3"
          />
        </div>
      ))}
    </div>
  );
}
