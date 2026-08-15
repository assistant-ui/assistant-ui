import { TXT, VIEWBOX, areaPath, linePath, scale, stroke } from "./lib";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const SIGNUPS = [22, 40, 34, 52, 64, 58, 74, 70, 88];

export function AreaChart() {
  const pts = scale(SIGNUPS, 14, 184, 100, 16, 0, 100);
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
      <path d={areaPath(pts, 100)} className="fill-foreground/10" />
      <path
        d={linePath(pts)}
        fill="none"
        className="stroke-foreground/70"
        {...stroke.line}
      />
      <text x={last.x} y={last.y - 5} textAnchor="middle" {...TXT.value}>
        8.8k
      </text>
      {MONTHS.map((m, i) => (
        <text key={m} x={pts[i]!.x} y="112" textAnchor="middle" {...TXT.axis}>
          {m}
        </text>
      ))}
    </svg>
  );
}
