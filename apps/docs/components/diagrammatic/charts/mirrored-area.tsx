import { BLUE, TXT, VIEWBOX, areaPath, linePath, scale, stroke } from "./lib";

const HOURS = ["00", "03", "06", "09", "12", "15", "18", "21"];
const DOWN = [18, 30, 26, 40, 36, 48, 42, 52];
const UP = [8, 12, 10, 16, 14, 18, 22, 16];

export function MirroredAreaChart() {
  const down = scale(DOWN, 14, 186, 56, 14, 0, 56);
  const up = scale(UP, 14, 186, 62, 102, 0, 56);
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <path d={areaPath(down, 56)} fill={BLUE} opacity="0.22" />
      <path d={linePath(down)} fill="none" stroke={BLUE} {...stroke.line} />
      <path d={areaPath(up, 62)} className="fill-foreground/12" />
      <path
        d={linePath(up)}
        fill="none"
        className="stroke-foreground/50"
        {...stroke.medium}
      />
      <line
        x1="10"
        y1="59"
        x2="190"
        y2="59"
        className="stroke-foreground/20"
        {...stroke.hair}
      />
      <text x="14" y="11" fill={BLUE} fontSize="4.5" className="font-mono">
        ↓ download 52 Mb/s
      </text>
      <text x="14" y="99" {...TXT.axis}>
        ↑ upload 16 Mb/s
      </text>
      {HOURS.map((h, i) => (
        <text key={h} x={down[i]!.x} y="114" textAnchor="middle" {...TXT.axis}>
          {h}
        </text>
      ))}
    </svg>
  );
}
