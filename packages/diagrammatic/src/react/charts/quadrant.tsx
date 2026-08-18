import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

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
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const bottom = vh - 14;
    const [xLo, xHi] = extent(points.map((p) => p.x));
    const [yLo, yHi] = extent(points.map((p) => p.y));
    const xMid = cutX ?? (xLo + xHi) / 2;
    const yMid = cutY ?? (yLo + yHi) / 2;
    const X = (v: number) => 20 + ((v - xLo) / (xHi - xLo || 1)) * 160;
    const Y = (v: number) =>
      bottom - 8 - ((v - yLo) / (yHi - yLo || 1)) * (bottom - 26);
    const midX = X(xMid);
    const midY = Y(yMid);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <rect
          x="14"
          y="8"
          width="172"
          height={bottom - 12}
          fill="none"
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1={round(midX)}
          y1="8"
          x2={round(midX)}
          y2={bottom - 4}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1="14"
          y1={round(midY)}
          x2="186"
          y2={round(midY)}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        {quadrants && (
          <g data-part="label">
            <text x="18" y="15" {...T.axis}>
              {quadrants[0]}
            </text>
            <text x="182" y="15" textAnchor="end" {...T.axis}>
              {quadrants[1]}
            </text>
            <text x="18" y={bottom - 8} {...T.axis}>
              {quadrants[2]}
            </text>
            <text x="182" y={bottom - 8} textAnchor="end" {...T.axis}>
              {quadrants[3]}
            </text>
          </g>
        )}
        {points.map((p, i) => {
          const focus = p.x < xMid && p.y > yMid;
          return (
            <circle
              key={i}
              cx={round(X(p.x))}
              cy={round(Y(p.y))}
              r="3.2"
              fill={focus ? ACCENT : ink(0.4)}
              data-part="mark"
              data-i={i}
            />
          );
        })}
        <text x="186" y={vh - 4} textAnchor="end" {...T.axis}>
          {xLabel} → · {yLabel} ↑
        </text>
      </ChartSvg>
    );
  },
);

Quadrant.displayName = "Quadrant";
