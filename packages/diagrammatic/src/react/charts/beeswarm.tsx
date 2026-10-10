import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { extent, linear, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { swarmLanes } from "../../core/layout";
import { AxisLabels, ChartSvg, frame } from "../svg";

export type BeeswarmProps = BaseProps & {
  values: number[];
  flag?: { at: number; label: string };
};

const DOT_RADIUS = 3.5;
const LANE_GAP = 8;
const LANE_PITCH = 8;

export const Beeswarm = forwardRef<SVGSVGElement, BeeswarmProps>(
  (
    {
      values,
      flag,
      labels,
      format = formatCompact,
      title,
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const [lo, hi] = extent([...values, ...(flag ? [flag.at] : [])]);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const mid = (top + bottom) / 2;
    const X = linear(lo, hi, left, right);
    const xs = values.map(X);
    const lanes = swarmLanes(xs, LANE_GAP);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <line
          x1={left}
          y1={mid}
          x2={right}
          y2={mid}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {values.map((v, i) => {
          const flagged = flag !== undefined && v === flag.at;
          return (
            <circle
              key={i}
              cx={xs[i]}
              cy={mid + lanes[i]! * LANE_PITCH}
              r={DOT_RADIUS}
              fill={flagged ? ACCENT : ink(0.45)}
              data-part="mark"
              data-i={i}
            />
          );
        })}
        {flag && (
          <text
            x={X(flag.at)}
            y={mid - 16}
            textAnchor="middle"
            {...T.axis.attrs}
            fill={ACCENT}
          >
            {flag.label}
          </text>
        )}
        {labels ? (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        ) : (
          <g data-part="axis">
            <text x={left} y={axisY} textAnchor="middle" {...T.axis.attrs}>
              {format(lo)}
            </text>
            <text x={right} y={axisY} textAnchor="middle" {...T.axis.attrs}>
              {format(hi)}
            </text>
          </g>
        )}
      </ChartSvg>
    );
  },
);

Beeswarm.displayName = "Beeswarm";
