import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { round } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type UpsetProps = BaseProps & {
  sets: string[];
  intersections: { sets: string[]; value: number }[];
};

export const Upset = forwardRef<SVGSVGElement, UpsetProps>(
  (
    {
      sets,
      intersections,
      format = formatCompact,
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
    const { left, right, top, bottom } = plotFrame(vh, density, {
      left: density === "figure" ? 56 : 48,
    });
    const ranked = [...intersections].sort((a, b) => b.value - a.value);
    const setSize = (name: string) =>
      ranked
        .filter((row) => row.sets.includes(name))
        .reduce((sum, row) => sum + row.value, 0);
    const sizes = sets.map(setSize);
    const maxSet = Math.max(...sizes, 1);
    const maxHit = Math.max(...ranked.map((row) => row.value), 1);
    const matrixTop = top + 22;
    const colW = (right - left) / Math.max(1, ranked.length);
    const rowH = (bottom - matrixTop) / Math.max(1, sets.length);
    const barMax = 20;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {ranked.map((row, c) => {
          const x = left + colW * (c + 0.5);
          const h = (row.value / maxHit) * 18;
          return (
            <g key={row.sets.join("·") || c} data-part="mark" data-i={c}>
              <rect
                x={round(x - Math.min(4, colW * 0.28))}
                y={round(matrixTop - 4 - h)}
                width={round(Math.min(8, colW * 0.55))}
                height={round(Math.max(h, 1))}
                fill={ACCENT}
                opacity="0.85"
              />
              <text
                x={round(x)}
                y={round(matrixTop - 6 - h)}
                textAnchor="middle"
                {...T.axis}
              >
                {format(row.value)}
              </text>
            </g>
          );
        })}
        {sets.map((name, r) => {
          const y = matrixTop + rowH * (r + 0.5);
          const w = (sizes[r]! / maxSet) * barMax;
          return (
            <g key={name} data-part="mark" data-series={name}>
              <rect
                x={round(left - 8 - w)}
                y={round(y - 2.2)}
                width={round(Math.max(w, 1.5))}
                height="4.4"
                fill={ink(0.35)}
              />
              <text
                x={left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis}
              >
                {name}
              </text>
            </g>
          );
        })}
        {ranked.map((row, c) => {
          const x = left + colW * (c + 0.5);
          const members = sets
            .map((name, r) => (row.sets.includes(name) ? r : -1))
            .filter((r) => r >= 0);
          const y0 = matrixTop + rowH * ((members[0] ?? 0) + 0.5);
          const y1 =
            matrixTop + rowH * ((members[members.length - 1] ?? 0) + 0.5);
          return (
            <g key={`m-${c}`}>
              {members.length > 1 && (
                <line
                  x1={x}
                  y1={y0}
                  x2={x}
                  y2={y1}
                  stroke={ink(0.35)}
                  strokeWidth="1.2"
                />
              )}
              {sets.map((name, r) => {
                const on = row.sets.includes(name);
                return (
                  <circle
                    key={name}
                    cx={x}
                    cy={matrixTop + rowH * (r + 0.5)}
                    r={on ? 2.4 : 1.5}
                    fill={on ? ACCENT : ink(0.14)}
                    data-part="mark"
                    data-i={c}
                    data-series={name}
                  />
                );
              })}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Upset.displayName = "Upset";
