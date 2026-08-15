import { BLUE, POS, VIEWBOX, areaPath, linePath, scale, stroke } from "./lib";

const TREND = [30, 42, 38, 52, 48, 62, 70, 84];

export function KpiTileChart() {
  const pts = scale(TREND, 112, 182, 96, 62, 0, 100);
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <rect
        x="14"
        y="18"
        width="172"
        height="84"
        rx="8"
        fill="none"
        className="stroke-foreground/12"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x="30"
        y="42"
        fontSize="6.5"
        className="fill-foreground/45 font-mono"
      >
        active runs
      </text>
      <text
        x="29"
        y="74"
        fontSize="22"
        className="fill-foreground/90 font-mono"
      >
        1,284
      </text>
      <text x="30" y="92" fontSize="7" fill={POS} className="font-mono">
        ▲ 12.4%
      </text>
      <path d={areaPath(pts, 96)} fill={BLUE} opacity="0.12" />
      <path d={linePath(pts)} fill="none" stroke={BLUE} {...stroke.medium} />
      <circle cx={last.x} cy={last.y} r="2.2" fill={BLUE} />
    </svg>
  );
}
