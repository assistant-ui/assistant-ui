import { BLUE, TXT, VIEWBOX, stroke } from "./lib";

const Y = (v: number) => 98 - (v / 100) * 80;

const MEDIA = [
  { name: "video", from: 30, to: 68, accent: true },
  { name: "social", from: 60, to: 50, accent: false },
  { name: "music", from: 45, to: 40, accent: false },
  { name: "tv", from: 70, to: 30, accent: false },
];

export function SlopeChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="46"
        y1="14"
        x2="46"
        y2="102"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      <line
        x1="150"
        y1="14"
        x2="150"
        y2="102"
        className="stroke-foreground/12"
        {...stroke.hair}
      />
      <text x="46" y="112" textAnchor="middle" {...TXT.axis}>
        2020
      </text>
      <text x="150" y="112" textAnchor="middle" {...TXT.axis}>
        2025
      </text>
      {MEDIA.map((entry) => (
        <g
          key={entry.name}
          {...(entry.accent ? { stroke: BLUE } : {})}
          className={entry.accent ? "" : "stroke-foreground/35"}
        >
          <line
            x1="46"
            y1={Y(entry.from)}
            x2="150"
            y2={Y(entry.to)}
            {...(entry.accent ? stroke.line : stroke.medium)}
          />
          <circle
            cx="46"
            cy={Y(entry.from)}
            r="2.4"
            stroke="none"
            {...(entry.accent ? { fill: BLUE } : {})}
            className={entry.accent ? "" : "fill-foreground/45"}
          />
          <circle
            cx="150"
            cy={Y(entry.to)}
            r="2.4"
            stroke="none"
            {...(entry.accent ? { fill: BLUE } : {})}
            className={entry.accent ? "" : "fill-foreground/45"}
          />
          <text
            x="156"
            y={Y(entry.to) + 1.6}
            stroke="none"
            {...(entry.accent ? { fontSize: 4.5, fill: BLUE } : TXT.axis)}
            className={entry.accent ? "font-mono" : TXT.axis.className}
          >
            {entry.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
