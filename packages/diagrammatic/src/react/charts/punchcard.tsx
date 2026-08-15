import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Matrix } from "../../core/types";
import { ACCENT } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type PunchcardProps = BaseProps & { matrix: Matrix };

export const Punchcard = forwardRef<SVGSVGElement, PunchcardProps>(
  ({ matrix, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const rows = matrix.rows.length;
    const cols = matrix.cols.length;
    const stepX = 156 / Math.max(1, cols - 1);
    const stepY = (vh - 34) / Math.max(1, rows - 1);
    const max = Math.max(...matrix.values.flat(), 1);
    const maxR = Math.min(stepX, stepY) * 0.42;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
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
                data-i={r * cols + c}
              />
            );
          }),
        )}
      </ChartSvg>
    );
  },
);

Punchcard.displayName = "Punchcard";
