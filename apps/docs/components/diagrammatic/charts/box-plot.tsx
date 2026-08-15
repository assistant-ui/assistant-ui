import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const REGIONS = [
  { label: "NA", low: 18, q1: 36, median: 48, q3: 62, high: 82 },
  { label: "EU", low: 30, q1: 48, median: 60, q3: 74, high: 94 },
  { label: "APAC", low: 12, q1: 26, median: 38, q3: 50, high: 66 },
];

const Y = (v: number) => 104 - v * 0.88;

export function BoxPlotChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {REGIONS.map((box, i) => {
        const x = 46 + i * 54;
        return (
          <g key={box.label}>
            <g className="stroke-foreground/55" {...stroke.medium}>
              <line x1={x} y1={Y(box.high)} x2={x} y2={Y(box.q3)} />
              <line x1={x} y1={Y(box.q1)} x2={x} y2={Y(box.low)} />
              <line x1={x - 8} y1={Y(box.high)} x2={x + 8} y2={Y(box.high)} />
              <line x1={x - 8} y1={Y(box.low)} x2={x + 8} y2={Y(box.low)} />
              <rect
                x={x - 14}
                y={Y(box.q3)}
                width="28"
                height={Y(box.q1) - Y(box.q3)}
                rx="3"
                className="fill-foreground/8"
              />
              <line
                x1={x - 14}
                y1={Y(box.median)}
                x2={x + 14}
                y2={Y(box.median)}
                stroke={BLUE}
                {...stroke.line}
              />
            </g>
            <text x={x} y="114" textAnchor="middle" {...TXT.axis}>
              {box.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
