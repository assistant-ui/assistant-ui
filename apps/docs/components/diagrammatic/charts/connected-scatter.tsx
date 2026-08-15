import { BLUE, TXT, VIEWBOX, linePath, stroke } from "./lib";

const PATH = [
  { x: 34, y: 82 },
  { x: 58, y: 66 },
  { x: 52, y: 44 },
  { x: 84, y: 36 },
  { x: 108, y: 52 },
  { x: 136, y: 40 },
  { x: 150, y: 22 },
  { x: 172, y: 30 },
];

export function ConnectedScatterChart() {
  const first = PATH[0]!;
  const last = PATH[PATH.length - 1]!;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="14"
        y1="102"
        x2="186"
        y2="102"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      <line
        x1="14"
        y1="102"
        x2="14"
        y2="10"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      <path
        d={linePath(PATH)}
        fill="none"
        className="stroke-foreground/45"
        {...stroke.medium}
      />
      {PATH.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          className="fill-foreground/60"
        />
      ))}
      <circle
        cx={first.x}
        cy={first.y}
        r="3.6"
        className="fill-background stroke-foreground/60 dark:fill-popover"
        {...stroke.medium}
      />
      <circle cx={last.x} cy={last.y} r="3.8" fill={BLUE} />
      <text x={first.x + 6} y={first.y + 8} {...TXT.axis}>
        2018
      </text>
      <text
        x={last.x}
        y={last.y - 7}
        textAnchor="middle"
        fontSize="4.5"
        fill={BLUE}
        className="font-mono"
      >
        2025
      </text>
      <text x="19" y="16" {...TXT.axis}>
        inflation ↑
      </text>
      <text x="186" y="112" textAnchor="end" {...TXT.axis}>
        unemployment →
      </text>
    </svg>
  );
}
