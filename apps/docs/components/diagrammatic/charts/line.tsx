import { BLUE, TXT, VIEWBOX, linePath, scale, stroke } from "./lib";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const USERS = [34, 46, 40, 58, 52, 66, 60, 76, 90];

export function LineChart() {
  const pts = scale(USERS, 14, 184, 100, 16, 0, 100);
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
        d={linePath(pts)}
        fill="none"
        className="stroke-foreground/75"
        {...stroke.line}
      />
      <circle cx={last.x} cy={last.y} r="2.8" fill={BLUE} />
      <text x={last.x} y={last.y - 6} textAnchor="middle" {...TXT.value}>
        90k
      </text>
      {MONTHS.map((m, i) => (
        <text key={m} x={pts[i]!.x} y="112" textAnchor="middle" {...TXT.axis}>
          {m}
        </text>
      ))}
    </svg>
  );
}
