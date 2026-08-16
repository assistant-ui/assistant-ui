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
import { AxisLabels, ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type HistogramProps = BaseProps & {
  bins: number[];
  compare?: readonly number[];
  marker?: { at: number; label?: string };
  smooth?: boolean;
  cumulative?: boolean;
};

export const Histogram = forwardRef<SVGSVGElement, HistogramProps>(
  (
    {
      bins,
      compare,
      marker,
      smooth,
      cumulative,
      labels,
      title,
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: Boolean(labels),
    });
    const running = (values: readonly number[]) => {
      const total = values.reduce((sum, v) => sum + v, 0) || 1;
      let acc = 0;
      return values.map((v) => {
        acc += v;
        return acc / total;
      });
    };
    const shown = cumulative ? running(bins) : bins;
    const shownCompare = compare
      ? cumulative
        ? running(compare)
        : compare
      : undefined;
    const max = cumulative ? 1 : Math.max(...shown, ...(shownCompare ?? []), 1);
    const span = right - left;
    const width = span / Math.max(1, shown.length);
    const compareWidth = span / Math.max(1, shownCompare?.length ?? 0);
    const comparePath = shownCompare
      ? [
          `M${round(left)} ${round(bottom)}`,
          ...shownCompare.flatMap((value, i) => [
            `V${round(bottom - (value / max) * (bottom - top))}`,
            `H${round(left + (i + 1) * compareWidth)}`,
          ]),
          `V${round(bottom)}`,
        ].join(" ")
      : null;
    const curve = smooth
      ? scalePoints(shown, left, right, bottom, top, 0, max)
      : null;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {shown.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={round(left + i * width)}
            y={top}
            width={round(width)}
            height={bottom - top}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
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
          shown.map((v, i) => (
            <rect
              key={i}
              x={round(left + 2 + i * width)}
              y={round(bottom - (v / max) * (bottom - top))}
              width={round(width - 1.4)}
              height={round((v / max) * (bottom - top))}
              fill={ink(0.35)}
              data-part="mark"
              data-i={i}
            />
          ))
        )}
        {comparePath && (
          <path
            d={comparePath}
            stroke={ink(0.55)}
            {...stroke.line}
            strokeDasharray="3 2"
            fill="none"
            data-part="mark"
          />
        )}
        {marker && (
          <g>
            <line
              x1={left + (marker.at / Math.max(1, bins.length)) * span}
              y1={top}
              x2={left + (marker.at / Math.max(1, bins.length)) * span}
              y2={bottom}
              stroke={ACCENT}
              strokeDasharray="3 3"
              data-part="grid"
              {...stroke.hair}
            />
            {marker.label && (
              <text
                x={left + 3 + (marker.at / Math.max(1, bins.length)) * span}
                y={top}
                fontSize={T.axis.fontSize}
                fill={ACCENT}
                fontFamily={T.axis.fontFamily}
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
              (_, i) => left + (i * span) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Histogram.displayName = "Histogram";
