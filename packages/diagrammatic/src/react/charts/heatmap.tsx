import type { BaseProps, Matrix } from "../../core/types";
import { ACCENT, seqOpacity } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type HeatmapProps = BaseProps & { matrix: Matrix };

export function Heatmap({ matrix, title, aspect, className }: HeatmapProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const cols = matrix.cols.length;
  const rows = matrix.rows.length;
  const cellW = 160 / Math.max(1, cols);
  const cellH = (vh - 24) / Math.max(1, rows);
  const max = Math.max(...matrix.values.flat(), 1);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {matrix.rows.map((row, r) => (
        <text key={row} x="8" y={8 + r * cellH + cellH / 2 + 1.6} {...TXT.axis}>
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
            rx="3"
            fill={ACCENT}
            opacity={seqOpacity(v / max)}
            data-part="mark"
            data-i={r * cols + c}
          />
        )),
      )}
    </ChartSvg>
  );
}
