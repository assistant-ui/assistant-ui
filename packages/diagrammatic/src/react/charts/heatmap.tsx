import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact, type Matrix } from "../../core/types";
import { rowMid } from "../../core/geometry";
import { ACCENT, seqOpacity } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

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
      labels: true,
      left: density === "figure" ? 36 : 32,
    });
    const cols = matrix.cols.length;
    const rows = matrix.rows.length;
    const max = Math.max(...matrix.values.flat(), 1);
    if (mark === "dot") {
      const stepX = (right - left) / Math.max(1, cols - 1);
      const stepY = (bottom - top) / Math.max(1, rows - 1);
      const maxR = Math.min(stepX, stepY) * 0.42;
      return (
        <ChartSvg
          ref={ref}
          {...rest}
          vh={vh}
          title={title}
          density={density}
          className={className}
        >
          {matrix.rows.map((row, r) => (
            <text
              key={row}
              x={left - 4}
              y={rowMid(r, stepY, top)}
              textAnchor="end"
              dominantBaseline="central"
              {...T.axis}
            >
              {row}
            </text>
          ))}
          {matrix.cols.map((col, c) =>
            col ? (
              <text
                key={`${col}-${c}`}
                x={left + c * stepX}
                y={axisY}
                textAnchor="middle"
                {...T.axis}
              >
                {col}
              </text>
            ) : null,
          )}
          {matrix.values.flatMap((rowValues, r) =>
            rowValues.map((v, c) => {
              const t = v / max;
              return (
                <circle
                  key={`${r}-${c}`}
                  cx={left + c * stepX}
                  cy={rowMid(r, stepY, top)}
                  r={0.6 + t * maxR}
                  fill={ACCENT}
                  opacity={0.25 + 0.6 * t}
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
      const cellW = (right - left) / Math.max(1, cols);
      const cellH = (bottom - top) / Math.max(1, rows);
      const gap = Math.min(1.4, cellW * 0.18);
      return (
        <ChartSvg
          ref={ref}
          {...rest}
          vh={vh}
          title={title}
          density={density}
          className={className}
        >
          {matrix.rows.map((row, r) =>
            row ? (
              <text
                key={row}
                x={left - 4}
                y={rowMid(r, cellH, top)}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis}
              >
                {row}
              </text>
            ) : null,
          )}
          {matrix.cols.map((col, c) =>
            col ? (
              <text
                key={`${col}-${c}`}
                x={left + c * cellW + cellW / 2}
                y={axisY}
                textAnchor="middle"
                {...T.axis}
              >
                {col}
              </text>
            ) : null,
          )}
          {matrix.values.flatMap((rowValues, r) =>
            rowValues.map((v, c) => {
              const share = v / max;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={left + c * cellW + gap / 2}
                  y={top + r * cellH + gap / 2}
                  width={Math.max(cellW - gap, 0.5)}
                  height={Math.max(cellH - gap, 0.5)}
                  rx={Math.min(1.4, cellW * 0.22)}
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
    const cellW = (right - left) / Math.max(1, cols);
    const cellH = (bottom - top) / Math.max(1, rows);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {matrix.rows.map((row, r) => (
          <text
            key={row}
            x={left - 4}
            y={rowMid(r, cellH, top)}
            textAnchor="end"
            dominantBaseline="central"
            {...T.axis}
          >
            {row}
          </text>
        ))}
        {matrix.cols.map((col, c) =>
          col ? (
            <text
              key={`${col}-${c}`}
              x={left + c * cellW + (cellW - 2) / 2}
              y={axisY}
              textAnchor="middle"
              {...T.axis}
            >
              {col}
            </text>
          ) : null,
        )}
        {matrix.values.flatMap((rowValues, r) =>
          rowValues.map((v, c) => {
            const x = left + c * cellW;
            const y = top + r * cellH;
            const width = Math.max(cellW - 2, 0.5);
            const height = Math.max(cellH - 2, 0.5);
            const share = v / max;
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={ACCENT}
                  opacity={seqOpacity(share)}
                  data-part="mark"
                  data-i={c}
                  data-i2={r}
                />
                {values && share >= 0.35 ? (
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 1}
                    textAnchor="middle"
                    fontSize={T.onSeries.fontSize}
                    fill="#fff"
                    opacity={0.9}
                    fontFamily={T.onSeries.fontFamily}
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
