import type { BaseProps } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { ACCENT, GRID } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";
import { scatterFrame } from "./scatter";

export type BubbleProps = BaseProps & {
  points: { x: number; y: number; size: number; label?: string }[];
  xLabel?: string;
  yLabel?: string;
};

export function Bubble({
  points,
  xLabel,
  yLabel,
  title,
  aspect,
  className,
}: BubbleProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const { X, Y, bottom } = scatterFrame(points, vh);
  const maxSize = Math.max(...points.map((p) => p.size), 1);
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
      {points.map((p, i) => (
        <circle
          key={i}
          cx={round(X(p.x))}
          cy={round(Y(p.y))}
          r={round(3 + Math.sqrt(p.size / maxSize) * 12)}
          fill={ACCENT}
          fillOpacity="0.18"
          stroke={ACCENT}
          strokeOpacity="0.75"
          data-part="mark"
          data-i={i}
          {...stroke.medium}
        />
      ))}
      {yLabel && (
        <text x="19" y="12" {...TXT.axis}>
          {yLabel} ↑
        </text>
      )}
      {xLabel && (
        <text x="186" y={vh - 5} textAnchor="end" {...TXT.axis}>
          {xLabel} → · size = value
        </text>
      )}
    </ChartSvg>
  );
}
