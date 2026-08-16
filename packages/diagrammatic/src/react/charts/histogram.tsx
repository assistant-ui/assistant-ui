import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import {
  areaPath,
  linePath,
  round,
  scalePoints,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type HistogramProps = BaseProps & {
  bins: number[];
  marker?: { at: number; label?: string };
  smooth?: boolean;
};

export const Histogram = forwardRef<SVGSVGElement, HistogramProps>(
  (
    { bins, marker, smooth, labels, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = labels ? vh - 16 : vh - 8;
    const max = Math.max(...bins, 1);
    const width = 176 / Math.max(1, bins.length);
    const curve = smooth
      ? scalePoints(bins, 10, 190, bottom, 16, 0, max)
      : null;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="10"
          y1={bottom}
          x2="190"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {curve ? (
          <>
            <path
              d={areaPath(curve, bottom)}
              fill={ink(0.1)}
              data-part="mark"
            />
            <path
              d={linePath(curve)}
              fill="none"
              stroke={ink(0.7)}
              data-part="mark"
              {...stroke.line}
            />
          </>
        ) : (
          bins.map((v, i) => (
            <rect
              key={i}
              x={round(12 + i * width)}
              y={round(bottom - (v / max) * (bottom - 16))}
              width={round(width - 1.4)}
              height={round((v / max) * (bottom - 16))}
              fill={ink(0.35)}
              data-part="mark"
              data-i={i}
            />
          ))
        )}
        {marker && (
          <g>
            <line
              x1={12 + (marker.at / Math.max(1, bins.length)) * 176}
              y1="12"
              x2={12 + (marker.at / Math.max(1, bins.length)) * 176}
              y2={bottom}
              stroke={ACCENT}
              strokeDasharray="3 3"
              data-part="grid"
              {...stroke.hair}
            />
            {marker.label && (
              <text
                x={15 + (marker.at / Math.max(1, bins.length)) * 176}
                y="12"
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
              (_, i) => 12 + (i * 176) / Math.max(1, labels.length - 1),
            )}
            y={vh - 4}
          />
        )}
      </ChartSvg>
    );
  },
);

Histogram.displayName = "Histogram";
