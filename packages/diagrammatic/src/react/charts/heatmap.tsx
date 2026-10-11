import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import { formatCompact, type Matrix } from "../../core/types";
import { rowMid, round } from "../../core/geometry";
import { ACCENT, alpha, seqOpacity } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type HeatmapProps = BaseProps & {
  matrix: Matrix;
  mark?: "cell" | "dot" | "calendar";
  values?: boolean;
};

/** `mark="dot"` sizes a circle per cell: the punchcard. `calendar` is weeks across. */
export const Heatmap = forwardRef<SVGSVGElement, HeatmapProps>(
  (
    {
      matrix,
      mark = "cell",
      values,
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
    const measured = typeScale(fontSize);
    const W = resolveWidth(width);
    const widest = Math.max(
      0,
      ...matrix.rows.map((row) => textWidth(row, measured.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + widest + 6)),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const cols = matrix.cols.length;
    const rows = matrix.rows.length;
    const max = Math.max(...matrix.values.flat(), 1);
    const rowLabel = (row: string) =>
      truncate(row, T.label.px, Math.max(0, left - PAD - 6));
    const cellW = (right - left) / Math.max(1, cols);
    const cellH = (bottom - top) / Math.max(1, rows);
    const colLabel = (col: string) =>
      truncate(col, T.axis.px, Math.max(0, cellW - 4));

    if (mark === "dot") {
      const maxR = Math.min(18, Math.min(cellW, cellH) * 0.42);
      return (
        <ChartSvg
          ref={ref}
          {...rest}
          frame={F}
          title={title}
          className={className}
        >
          {matrix.rows.map((row, r) => (
            <text
              key={row}
              x={round(left - 6)}
              y={round(rowMid(r, cellH, top))}
              textAnchor="end"
              dominantBaseline="central"
              {...T.label.attrs}
            >
              {rowLabel(row)}
            </text>
          ))}
          {matrix.cols.map((col, c) =>
            col ? (
              <text
                key={`${col}-${c}`}
                x={round(left + c * cellW + cellW / 2)}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
              >
                {colLabel(col)}
              </text>
            ) : null,
          )}
          {matrix.values.flatMap((rowValues, r) =>
            rowValues.map((v, c) => {
              const t = v / max;
              return (
                <circle
                  key={`${r}-${c}`}
                  cx={round(left + c * cellW + cellW / 2)}
                  cy={round(rowMid(r, cellH, top))}
                  r={round(Math.max(2, 2 + t * (maxR - 2)))}
                  fill={ACCENT}
                  opacity={alpha(0.25 + 0.6 * t)}
                  data-part="mark"
                  data-i={c}
                  data-i2={r}
                />
              );
            }),
          )}
        </ChartSvg>
      );
    }

    if (mark === "calendar") {
      const gap = Math.min(4, cellW * 0.18, cellH * 0.18);
      const radius = Math.min(4, cellW * 0.22, cellH * 0.22);
      return (
        <ChartSvg
          ref={ref}
          {...rest}
          frame={F}
          title={title}
          className={className}
        >
          {matrix.rows.map((row, r) =>
            row ? (
              <text
                key={row}
                x={round(left - 6)}
                y={round(rowMid(r, cellH, top))}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {rowLabel(row)}
              </text>
            ) : null,
          )}
          {matrix.cols.map((col, c) =>
            col ? (
              <text
                key={`${col}-${c}`}
                x={round(left + c * cellW + cellW / 2)}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
              >
                {colLabel(col)}
              </text>
            ) : null,
          )}
          {matrix.values.flatMap((rowValues, r) =>
            rowValues.map((v, c) => {
              const share = v / max;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={round(left + c * cellW + gap / 2)}
                  y={round(top + r * cellH + gap / 2)}
                  width={round(Math.max(cellW - gap, 0.5))}
                  height={round(Math.max(cellH - gap, 0.5))}
                  rx={round(radius)}
                  fill={ACCENT}
                  opacity={v === 0 ? 0.06 : seqOpacity(share)}
                  data-part="mark"
                  data-i={c}
                  data-i2={r}
                />
              );
            }),
          )}
        </ChartSvg>
      );
    }

    const gap = 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {matrix.rows.map((row, r) => (
          <text
            key={row}
            x={round(left - 6)}
            y={round(rowMid(r, cellH, top))}
            textAnchor="end"
            dominantBaseline="central"
            {...T.label.attrs}
          >
            {rowLabel(row)}
          </text>
        ))}
        {matrix.cols.map((col, c) =>
          col ? (
            <text
              key={`${col}-${c}`}
              x={round(left + c * cellW + cellW / 2)}
              y={axisY}
              textAnchor="middle"
              {...T.axis.attrs}
            >
              {colLabel(col)}
            </text>
          ) : null,
        )}
        {matrix.values.flatMap((rowValues, r) =>
          rowValues.map((v, c) => {
            const x = left + c * cellW + gap / 2;
            const y = top + r * cellH + gap / 2;
            const cellWidth = Math.max(cellW - gap, 0.5);
            const cellHeight = Math.max(cellH - gap, 0.5);
            const share = v / max;
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={round(x)}
                  y={round(y)}
                  width={round(cellWidth)}
                  height={round(cellHeight)}
                  fill={ACCENT}
                  opacity={seqOpacity(share)}
                  data-part="mark"
                  data-i={c}
                  data-i2={r}
                />
                {values && share >= 0.35 ? (
                  <text
                    x={round(x + cellWidth / 2)}
                    y={round(y + cellHeight / 2)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    {...T.onSeries.attrs}
                  >
                    {format(v)}
                  </text>
                ) : null}
              </g>
            );
          }),
        )}
      </ChartSvg>
    );
  },
);

Heatmap.displayName = "Heatmap";
