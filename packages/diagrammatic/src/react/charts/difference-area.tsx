import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series, Tick } from "../../core/types";
import {
  bandPath,
  linePath,
  linear,
  scalePoints,
  stroke,
} from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type DifferenceAreaProps = BaseProps & {
  actual: Series;
  reference: Series;
  yTicks?: readonly Tick[];
};

export const DifferenceArea = forwardRef<SVGSVGElement, DifferenceAreaProps>(
  (
    {
      actual,
      reference,
      yTicks,
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
      legend: true,
      labels: Boolean(labels),
      ticks: Boolean(yTicks?.length),
    });
    const max = Math.max(
      ...actual.data,
      ...reference.data,
      ...(yTicks?.map((tick) => tick.at) ?? []),
      1,
    );
    const Y = linear(0, max, bottom, top);
    const a = scalePoints(actual.data, left, right, bottom, top, 0, max);
    const b = scalePoints(reference.data, left, right, bottom, top, 0, max);
    const above = a.map((p, i) => ({ x: p.x, y: Math.min(p.y, b[i]!.y) }));
    const below = a.map((p, i) => ({ x: p.x, y: Math.max(p.y, b[i]!.y) }));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <TickGrid ticks={yTicks} at={Y} from={left} to={right} type={T.axis} />
        <ColumnHits
          count={actual.data.length}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        <path
          d={bandPath(above, b)}
          fill={POS}
          opacity="0.22"
          data-part="mark"
        />
        <path
          d={bandPath(b, below)}
          fill={NEG}
          opacity="0.22"
          data-part="mark"
        />
        <path
          d={linePath(b)}
          fill="none"
          stroke={ink(0.4)}
          strokeDasharray="4 4"
          data-part="mark"
          data-series={reference.name}
          {...stroke.hair}
        />
        <path
          d={linePath(a)}
          fill="none"
          stroke={ink(0.75)}
          data-part="mark"
          data-series={actual.name}
          {...stroke.line}
        />
        <g data-part="legend">
          <line
            x1={left}
            y1="9.4"
            x2={left + 10}
            y2="9.4"
            stroke={ink(0.75)}
            {...stroke.line}
          />
          <text x={left + 13} y="11" {...T.axis}>
            {actual.name}
          </text>
          <line
            x1={left + 44}
            y1="9.4"
            x2={left + 54}
            y2="9.4"
            stroke={ink(0.4)}
            strokeDasharray="3 3"
            {...stroke.hair}
          />
          <text x={left + 57} y="11" {...T.axis}>
            {reference.name}
          </text>
          <rect
            x={left + 98}
            y="7"
            width="6"
            height="4.5"
            fill={POS}
            opacity="0.35"
          />
          <text x={left + 107} y="11" {...T.axis}>
            ahead
          </text>
          <rect
            x={left + 134}
            y="7"
            width="6"
            height="4.5"
            fill={NEG}
            opacity="0.35"
          />
          <text x={left + 143} y="11" {...T.axis}>
            behind
          </text>
        </g>
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

DifferenceArea.displayName = "DifferenceArea";
