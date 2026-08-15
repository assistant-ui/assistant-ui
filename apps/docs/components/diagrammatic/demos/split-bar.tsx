import { SplitBar } from "diagrammatic";

const SHARES = [
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
];

export function SplitBarDemo() {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-3 font-mono text-xs">
      {SHARES.map((row) => (
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
