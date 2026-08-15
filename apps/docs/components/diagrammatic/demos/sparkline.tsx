import { Sparkline } from "diagrammatic";

const VITALS = [
  { label: "cpu", data: [40, 55, 48, 62, 58, 74, 70, 86], value: "86%" },
  { label: "mem", data: [62, 60, 66, 64, 70, 68, 72, 71], value: "71%" },
  { label: "req", data: [30, 44, 38, 30, 46, 40, 58, 52], value: "52/s" },
];

export function SparklineDemo() {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-mono text-xs">
      {VITALS.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-foreground/55 w-8">{row.label}</span>
          <Sparkline data={row.data} title={row.label} />
          <span className="text-foreground/80 w-9 text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
