import { BLUE, TXT, VIEWBOX, round, scale, stroke } from "./lib";

const RELEASES = ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"];
const PRICE = [30, 30, 48, 42, 60, 54, 72, 84];

export function StepLineChart() {
  const pts = scale(PRICE, 14, 184, 100, 16, 0, 100);
  let d = `M${round(pts[0]!.x)} ${round(pts[0]!.y)}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` H${round(pts[i]!.x)} V${round(pts[i]!.y)}`;
  }
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <line
        x1="14"
        y1="100"
        x2="188"
        y2="100"
        className="stroke-foreground/10"
        {...stroke.hair}
      />
      <path
        d={d}
        fill="none"
        className="stroke-foreground/75"
        strokeLinejoin="round"
        {...stroke.line}
      />
      <circle cx={last.x} cy={last.y} r="2.8" fill={BLUE} />
      <text x={last.x} y={last.y - 6} textAnchor="middle" {...TXT.value}>
        $59
      </text>
      {RELEASES.map((r, i) => (
        <text key={r} x={pts[i]!.x} y="112" textAnchor="middle" {...TXT.axis}>
          {r}
        </text>
      ))}
    </svg>
  );
}
