import { Sparkbar } from "diagrammatic";

const DAYS = [
  { label: "mon", data: [3, 5, 4, 7, 6, 9, 8, 10, 7, 6, 8, 9], value: "82" },
  { label: "tue", data: [5, 4, 6, 5, 8, 7, 9, 8, 10, 9, 7, 8], value: "86" },
  { label: "wed", data: [2, 3, 5, 4, 6, 5, 7, 9, 8, 10, 9, 11], value: "79" },
];

export function SparkbarDemo() {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-mono text-xs">
      {DAYS.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-foreground/55 w-8">{row.label}</span>
          <Sparkbar data={row.data} title={`deploys on ${row.label}`} />
          <span className="text-foreground/80 w-9 text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
