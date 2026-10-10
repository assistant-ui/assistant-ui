import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import { formatCompact } from "../../core/types";
import { round, rowMarkH, rowMid, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type UpsetProps = BaseProps & {
  sets: string[];
  intersections: { sets: string[]; value: number }[];
};

const SET_BAR_MAX = 48;
const INTERSECTION_BAR_MAX = 64;

export const Upset = forwardRef<SVGSVGElement, UpsetProps>(
  (
    {
      sets,
      intersections,
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
    const W = resolveWidth(width);
    const measured = typeScale(fontSize);
    const labelW = Math.max(
      0,
      ...sets.map((name) => textWidth(name, measured.axis.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      left: Math.min(
        Math.round(W * 0.4),
        Math.ceil(PAD + labelW + SET_BAR_MAX + 16),
      ),
    });
    const { left, right, top, bottom, T } = F;
    const ranked = [...intersections].sort((a, b) => b.value - a.value);
    const setSize = (name: string) =>
      ranked
        .filter((row) => row.sets.includes(name))
        .reduce((sum, row) => sum + row.value, 0);
    const sizes = sets.map(setSize);
    const maxSet = Math.max(...sizes, 1);
    const maxHit = Math.max(...ranked.map((row) => row.value), 1);
    const matrixTop = top + T.value.px + INTERSECTION_BAR_MAX + 14;
    const colPitch = (right - left) / Math.max(1, ranked.length);
    const rowH = (bottom - matrixTop) / Math.max(1, sets.length);
    const barW = Math.min(24, Math.max(2, colPitch * 0.55));
    const labelX = left - SET_BAR_MAX - 12;
    const labelRoom = Math.max(0, labelX - PAD);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {ranked.map((row, c) => {
          const x = left + colPitch * (c + 0.5);
          const h = Math.max(1, (row.value / maxHit) * INTERSECTION_BAR_MAX);
          const y = matrixTop - 8 - h;
          return (
            <g key={row.sets.join("·") || c} data-part="mark" data-i={c}>
              <rect
                x={round(x - barW / 2)}
                y={round(y)}
                width={round(barW)}
                height={round(Math.max(h, 1))}
                fill={ACCENT}
                opacity={0.85}
              />
              <text
                x={round(x)}
                y={round(y - 4)}
                textAnchor="middle"
                {...T.value.attrs}
              >
                {truncate(format(row.value), T.value.px, colPitch - 4)}
              </text>
            </g>
          );
        })}
        {sets.map((name, r) => {
          const y = rowMid(r, rowH, matrixTop);
          const w = Math.max(0, (sizes[r]! / maxSet) * SET_BAR_MAX);
          const barH = Math.min(10, rowMarkH(rowH, 0.32));
          return (
            <g key={name} data-part="mark" data-series={name}>
              <rect
                x={round(left - 8 - w)}
                y={round(y - barH / 2)}
                width={round(Math.max(w, 1.5))}
                height={round(barH)}
                fill={ink(0.35)}
              />
              <text
                x={round(labelX)}
                y={round(y)}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis.attrs}
              >
                {truncate(name, T.axis.px, labelRoom)}
              </text>
            </g>
          );
        })}
        {ranked.map((row, c) => {
          const x = left + colPitch * (c + 0.5);
          const members = sets
            .map((name, r) => (row.sets.includes(name) ? r : -1))
            .filter((r) => r >= 0);
          const y0 = rowMid(members[0] ?? 0, rowH, matrixTop);
          const y1 = rowMid(members[members.length - 1] ?? 0, rowH, matrixTop);
          return (
            <g key={`m-${c}`}>
              {members.length > 1 && (
                <line
                  x1={round(x)}
                  y1={round(y0)}
                  x2={round(x)}
                  y2={round(y1)}
                  stroke={ink(0.35)}
                  {...stroke.medium}
                />
              )}
              {sets.map((name, r) => {
                const on = row.sets.includes(name);
                return (
                  <circle
                    key={name}
                    cx={round(x)}
                    cy={round(rowMid(r, rowH, matrixTop))}
                    r={on ? 4 : 2.25}
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
