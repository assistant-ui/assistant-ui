import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Matrix } from "../../core/types";
import { ACCENT, seqOpacity } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type HeatmapProps = BaseProps & {
  matrix: Matrix;
  mark?: "cell" | "dot";
};

/** `mark="dot"` sizes a circle per cell instead of shading it: the punchcard. */
export const Heatmap = forwardRef<SVGSVGElement, HeatmapProps>(
  ({ matrix, mark = "cell", title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cols = matrix.cols.length;
    const rows = matrix.rows.length;
    const max = Math.max(...matrix.values.flat(), 1);
    if (mark === "dot") {
      const stepX = 156 / Math.max(1, cols - 1);
      const stepY = (vh - 34) / Math.max(1, rows - 1);
      const maxR = Math.min(stepX, stepY) * 0.42;
      return (
        <ChartSvg
          ref={ref}
          {...rest}
          vh={vh}
          title={title}
          className={className}
        >
          {matrix.rows.map((row, r) => (
            <text key={row} x="8" y={12 + r * stepY + 1.8} {...TXT.axis}>
              {row}
            </text>
          ))}
          {matrix.cols.map((col, c) =>
            col ? (
              <text
                key={`${col}-${c}`}
                x={32 + c * stepX}
                y={vh - 4}
                textAnchor="middle"
                {...TXT.axis}
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
                  cx={32 + c * stepX}
                  cy={12 + r * stepY}
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
    const cellW = 160 / Math.max(1, cols);
    const cellH = (vh - 24) / Math.max(1, rows);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {matrix.rows.map((row, r) => (
          <text
            key={row}
            x="8"
            y={8 + r * cellH + cellH / 2 + 1.6}
            {...TXT.axis}
          >
            {row}
          </text>
        ))}
        {matrix.cols.map((col, c) =>
          col ? (
            <text
              key={`${col}-${c}`}
              x={30 + c * cellW + (cellW - 2) / 2}
              y={vh - 5}
              textAnchor="middle"
              {...TXT.axis}
            >
              {col}
            </text>
          ) : null,
        )}
        {matrix.values.flatMap((rowValues, r) =>
          rowValues.map((v, c) => (
            <rect
              key={`${r}-${c}`}
              x={30 + c * cellW}
              y={8 + r * cellH}
              width={Math.max(cellW - 2, 0.5)}
              height={Math.max(cellH - 2, 0.5)}
              fill={ACCENT}
              opacity={seqOpacity(v / max)}
              data-part="mark"
              data-i={c}
              data-i2={r}
            />
          )),
        )}
      </ChartSvg>
    );
  },
);

Heatmap.displayName = "Heatmap";
