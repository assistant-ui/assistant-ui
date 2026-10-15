import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { round } from "../../core/geometry";
import { truncate } from "../../core/text";
import type { Item } from "../../core/types";
import { cat } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type MarimekkoProps = BaseProps & {
  columns: { label: string; width: number; shares: Item[] }[];
};

const COLUMN_GAP = 2;
const SHARE_GAP = 2;
const LABEL_PAD = 6;

export const Marimekko = forwardRef<SVGSVGElement, MarimekkoProps>(
  (
    { columns, title, width, height, aspect, fontSize, className, ...rest },
    ref,
  ) => {
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) || 1;
    const available = Math.max(
      0,
      right - left - Math.max(0, columns.length - 1) * COLUMN_GAP,
    );
    let x = left;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {columns.map((column, c) => {
          const w = (column.width / totalWidth) * available;
          const x0 = x;
          x += w + COLUMN_GAP;
          const total = column.shares.reduce((sum, s) => sum + s.value, 0) || 1;
          let y = top;
          return (
            <g key={column.label} data-part="mark" data-i={c}>
              {column.shares.map((share, k) => {
                const span = (share.value / total) * (bottom - top);
                const h = Math.max(span - SHARE_GAP, 0.5);
                const y0 = y;
                y += span;
                const label = truncate(
                  share.label,
                  T.onSeries.px,
                  Math.max(0, w - LABEL_PAD * 2),
                );
                const labelFits =
                  c === 0 && label !== "" && h >= T.onSeries.px + 4;
                return (
                  <g key={share.label} data-series={share.label}>
                    <rect
                      x={round(x0)}
                      y={round(y0)}
                      width={round(w)}
                      height={round(h)}
                      fill={cat(k)}
                      opacity="0.88"
                    />
                    {labelFits && (
                      <text
                        x={round(x0 + LABEL_PAD)}
                        y={round(y0 + h / 2)}
                        dominantBaseline="central"
                        {...T.onSeries.attrs}
                      >
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={round(x0 + w / 2)}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
              >
                {truncate(column.label, T.axis.px, Math.max(0, w - 4))}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Marimekko.displayName = "Marimekko";
