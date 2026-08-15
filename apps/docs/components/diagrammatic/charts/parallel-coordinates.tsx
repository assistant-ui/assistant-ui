import { CAT, Legend, TXT, VIEWBOX, stroke } from "./lib";

const AXES = [
  { x: 30, label: "price" },
  { x: 82, label: "battery" },
  { x: 134, label: "weight" },
  { x: 184, label: "screen" },
];
const LAPTOPS = [
  { name: "air", values: [22, 58, 34, 70] },
  { name: "pro", values: [54, 30, 66, 42] },
  { name: "max", values: [80, 72, 50, 86] },
];

const Y = (v: number) => 100 - v * 0.82;

export function ParallelCoordinatesChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {AXES.map((axis) => (
        <g key={axis.label}>
          <line
            x1={axis.x}
            y1="16"
            x2={axis.x}
            y2="102"
            className="stroke-foreground/12"
            {...stroke.hair}
          />
          <text x={axis.x} y="10" textAnchor="middle" {...TXT.axis}>
            {axis.label}
          </text>
        </g>
      ))}
      {LAPTOPS.map((laptop, k) => (
        <g key={laptop.name}>
          <path
            d={laptop.values
              .map((v, i) => `${i === 0 ? "M" : "L"}${AXES[i]!.x} ${Y(v)}`)
              .join(" ")}
            fill="none"
            stroke={CAT[k]}
            opacity="0.8"
            strokeLinejoin="round"
            {...stroke.line}
          />
          {laptop.values.map((v, i) => (
            <circle key={i} cx={AXES[i]!.x} cy={Y(v)} r="2.4" fill={CAT[k]} />
          ))}
        </g>
      ))}
      <Legend
        x={30}
        y={114}
        items={LAPTOPS.map((l, k) => ({ label: l.name, fill: CAT[k] }))}
      />
    </svg>
  );
}
