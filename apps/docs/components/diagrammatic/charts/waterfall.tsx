import { NEG, POS, TXT, VIEWBOX, stroke } from "./lib";

const STEPS = [
  { label: "gross", from: 0, to: 40, kind: "total" },
  { label: "subs", from: 40, to: 58, kind: "up" },
  { label: "addons", from: 58, to: 72, kind: "up" },
  { label: "refunds", from: 72, to: 50, kind: "down" },
  { label: "services", from: 50, to: 70, kind: "up" },
  { label: "credits", from: 70, to: 60, kind: "down" },
  { label: "net", from: 0, to: 60, kind: "total" },
] as const;

const Y = (v: number) => 102 - v * 1.15;

export function WaterfallChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="8"
        y1="102"
        x2="192"
        y2="102"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      {STEPS.map((step, i) => {
        const x = 12 + i * 25.5;
        const top = Y(Math.max(step.from, step.to));
        const h = Math.abs(Y(step.from) - Y(step.to));
        const next = STEPS[i + 1];
        const delta = step.to - step.from;
        return (
          <g key={step.label}>
            <rect
              x={x}
              y={top}
              width="17"
              height={h}
              rx="2.5"
              {...(step.kind === "up"
                ? { fill: POS, opacity: 0.85 }
                : step.kind === "down"
                  ? { fill: NEG, opacity: 0.85 }
                  : {})}
              className={step.kind === "total" ? "fill-foreground/55" : ""}
            />
            {step.kind !== "total" && (
              <text x={x + 8.5} y={top - 3} textAnchor="middle" {...TXT.axis}>
                {delta > 0 ? `+${delta}` : delta}
              </text>
            )}
            {next && next.kind !== "total" && (
              <line
                x1={x + 17}
                y1={Y(step.to)}
                x2={x + 25.5}
                y2={Y(step.to)}
                className="stroke-foreground/30"
                {...stroke.hair}
              />
            )}
            <text x={x + 8.5} y="112" textAnchor="middle" {...TXT.axis}>
              {step.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
