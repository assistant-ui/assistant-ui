import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, rowMarkH, rowMid, stroke } from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type DivergingBarProps = BaseProps & {
  items: Item[];
  sorted?: boolean;
};

/** The share of the width row labels may take before they are cut. */
const LABEL_SHARE = 0.4;

export const DivergingBar = forwardRef<SVGSVGElement, DivergingBarProps>(
  (
    {
      items,
      sorted = true,
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
    const rows = sorted ? [...items].sort((a, b) => b.value - a.value) : items;
    const measured = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...rows.map((row) => textWidth(row.label, measured.label.px)),
    );
    const valueW = Math.max(
      0,
      ...rows.map((row) =>
        textWidth(
          row.value >= 0 ? `+${format(row.value)}` : format(row.value),
          measured.axis.px,
        ),
      ),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      left: Math.min(
        Math.round(W * LABEL_SHARE),
        Math.ceil(PAD + Math.max(labelW, valueW) + 6),
      ),
      right: W - PAD - Math.ceil(valueW) - 6,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
    const center = (left + right) / 2;
    const gap = 2;
    const half = Math.max(0, (right - left) / 2 - gap);
    const X = linear(0, max, 0, half);
    const rowH = (bottom - top) / Math.max(1, rows.length);
    const barH = rowMarkH(rowH, 0.55);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <line
          x1={round(center)}
          y1={top}
          x2={round(center)}
          y2={bottom}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        <text x={round(center)} y={axisY} textAnchor="middle" {...T.axis.attrs}>
          0
        </text>
        {rows.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          const w = X(Math.abs(row.value));
          const positive = row.value >= 0;
          const x = positive ? center + gap / 2 : center - gap / 2 - w;
          const valueX = positive ? x + w + 6 : x - 6;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={round(left - 6)}
                y={round(mid)}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - PAD - 6)}
              </text>
              <rect
                x={round(x)}
                y={round(mid - barH / 2)}
                width={round(w)}
                height={round(barH)}
                fill={positive ? POS : NEG}
                opacity={0.85}
              />
              <text
                x={round(valueX)}
                y={round(mid)}
                textAnchor={positive ? "start" : "end"}
                dominantBaseline="central"
                {...T.axis.attrs}
              >
                {positive ? `+${format(row.value)}` : format(row.value)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

DivergingBar.displayName = "DivergingBar";
