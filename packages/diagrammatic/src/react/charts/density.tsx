import type { BaseProps } from "../../core/types";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type DensityProps = BaseProps & {
  bins: number[];
  marker?: { at: number; label?: string };
};

export function Density({
  bins,
  marker,
  labels,
  title,
  aspect,
  className,
}: DensityProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = labels ? vh - 16 : vh - 8;
  const pts = scalePoints(bins, 10, 190, bottom, 16, 0, Math.max(...bins, 1));
  const markerX = marker
    ? 10 + (marker.at / Math.max(1, bins.length - 1)) * 180
    : 0;
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      <line
        x1="10"
        y1={bottom}
        x2="190"
        y2={bottom}
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      <path d={areaPath(pts, bottom)} fill={ink(0.1)} data-part="mark" />
      <path
        d={linePath(pts)}
        fill="none"
        stroke={ink(0.7)}
        data-part="mark"
        {...stroke.line}
      />
      {marker && (
        <g>
          <line
            x1={markerX}
            y1="14"
            x2={markerX}
            y2={bottom}
            stroke={ACCENT}
            strokeDasharray="3 3"
            data-part="grid"
            {...stroke.hair}
          />
          {marker.label && (
            <text
              x={markerX + 3}
              y="14"
              fontSize="4.5"
              fill={ACCENT}
              fontFamily={TXT.axis.fontFamily}
            >
              {marker.label}
            </text>
          )}
        </g>
      )}
      {labels && (
        <AxisLabels
          labels={labels}
          xs={labels.map(
            (_, i) => 10 + (i * 180) / Math.max(1, labels.length - 1),
          )}
          y={vh - 4}
        />
      )}
    </ChartSvg>
  );
}
