import type { BaseProps } from "../../core/types";
import { linePath, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, SURFACE, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";
import { scatterFrame } from "./scatter";

export type ConnectedScatterProps = BaseProps & {
  points: { x: number; y: number; label?: string }[];
  xLabel?: string;
  yLabel?: string;
};

export function ConnectedScatter({
  points,
  xLabel,
  yLabel,
  title,
  aspect,
  className,
}: ConnectedScatterProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const { X, Y, bottom } = scatterFrame(points, vh);
  const path = points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
  const first = path[0];
  const last = path[path.length - 1];
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      <line
        x1="14"
        y1={bottom}
        x2="186"
        y2={bottom}
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      <line
        x1="14"
        y1={bottom}
        x2="14"
        y2="8"
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      <path
        d={linePath(path)}
        fill="none"
        stroke={ink(0.45)}
        data-part="mark"
        {...stroke.medium}
      />
      {path.map((p, i) => (
        <circle
          key={i}
          cx={round(p.x)}
          cy={round(p.y)}
          r="3"
          fill={ink(0.6)}
          data-part="mark"
          data-i={i}
        />
      ))}
      {first && (
        <circle
          cx={round(first.x)}
          cy={round(first.y)}
          r="3.6"
          fill={SURFACE}
          stroke={ink(0.6)}
          {...stroke.medium}
        />
      )}
      {last && (
        <circle cx={round(last.x)} cy={round(last.y)} r="3.8" fill={ACCENT} />
      )}
      {first && points[0]?.label && (
        <text x={round(first.x) + 6} y={round(first.y) + 8} {...TXT.axis}>
          {points[0].label}
        </text>
      )}
      {last && points[points.length - 1]?.label && (
        <text
          x={round(last.x)}
          y={round(last.y) - 7}
          textAnchor="middle"
          fontSize="4.5"
          fill={ACCENT}
          fontFamily={TXT.axis.fontFamily}
        >
          {points[points.length - 1]!.label}
        </text>
      )}
      {yLabel && (
        <text x="19" y="12" {...TXT.axis}>
          {yLabel} ↑
        </text>
      )}
      {xLabel && (
        <text x="186" y={vh - 5} textAnchor="end" {...TXT.axis}>
          {xLabel} →
        </text>
      )}
    </ChartSvg>
  );
}
