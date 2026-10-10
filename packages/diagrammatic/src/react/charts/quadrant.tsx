import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, project, round, stroke } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type QuadrantProps = BaseProps & {
  points: { x: number; y: number; label?: string }[];
  xLabel: string;
  yLabel: string;
  cutX?: number;
  cutY?: number;
  quadrants?: [string, string, string, string];
};

export const Quadrant = forwardRef<SVGSVGElement, QuadrantProps>(
  (
    {
      points,
      xLabel,
      yLabel,
      cutX,
      cutY,
      quadrants,
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
    const xValues = [
      ...points.map((point) => point.x),
      ...(cutX === undefined ? [] : [cutX]),
    ];
    const yValues = [
      ...points.map((point) => point.y),
      ...(cutY === undefined ? [] : [cutY]),
    ];
    const [xLo, xHi] = extent(xValues);
    const [yLo, yHi] = extent(yValues);
    const xMid = cutX ?? (xLo + xHi) / 2;
    const yMid = cutY ?? (yLo + yHi) / 2;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const X = project("linear", xLo, xHi, left, right);
    const Y = project("linear", yLo, yHi, bottom, top);
    const midX = X(xMid);
    const midY = Y(yMid);
    const labelW = Math.max(0, (right - left) / 2 - 8);
    const caption = truncate(
      `${xLabel} → · ${yLabel} ↑`,
      T.axis.px,
      Math.max(0, right - left),
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <rect
          x={left}
          y={top}
          width={round(right - left)}
          height={round(bottom - top)}
          fill="none"
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1={round(midX)}
          y1={top}
          x2={round(midX)}
          y2={bottom}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1={left}
          y1={round(midY)}
          x2={right}
          y2={round(midY)}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        {quadrants && (
          <g data-part="label">
            <text
              x={round(left + 4)}
              y={round(top + T.axis.px)}
              {...T.axis.attrs}
            >
              {truncate(quadrants[0], T.axis.px, labelW)}
            </text>
            <text
              x={round(right - 4)}
              y={round(top + T.axis.px)}
              textAnchor="end"
              {...T.axis.attrs}
            >
              {truncate(quadrants[1], T.axis.px, labelW)}
            </text>
            <text x={round(left + 4)} y={round(bottom - 6)} {...T.axis.attrs}>
              {truncate(quadrants[2], T.axis.px, labelW)}
            </text>
            <text
              x={round(right - 4)}
              y={round(bottom - 6)}
              textAnchor="end"
              {...T.axis.attrs}
            >
              {truncate(quadrants[3], T.axis.px, labelW)}
            </text>
          </g>
        )}
        {points.map((point, i) => {
          const focus = point.x < xMid && point.y > yMid;
          return (
            <circle
              key={i}
              cx={round(X(point.x))}
              cy={round(Y(point.y))}
              r={3}
              fill={focus ? ACCENT : ink(0.4)}
              data-part="mark"
              data-i={i}
            />
          );
        })}
        <text x={right} y={axisY} textAnchor="end" {...T.axis.attrs}>
          {caption}
        </text>
      </ChartSvg>
    );
  },
);

Quadrant.displayName = "Quadrant";
