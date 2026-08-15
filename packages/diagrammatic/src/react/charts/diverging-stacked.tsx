import type { BaseProps } from "../../core/types";
import { NEG, POS, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type DivergingStackedProps = BaseProps & {
  rows: { label: string; values: [number, number, number, number, number] }[];
  endLabels?: [string, string];
};

/** Five-band Likert rows anchored on the neutral midpoint. */
export function DivergingStacked({
  rows,
  endLabels = ["disagree", "agree"],
  title,
  aspect,
  className,
}: DivergingStackedProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const rowH = (vh - 22) / Math.max(1, rows.length);
  const maxTotal = Math.max(
    ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)),
    1,
  );
  const unit = 160 / maxTotal;
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {rows.map((row, i) => {
        const y = 8 + i * rowH;
        const [strongNeg, neg, neutral, pos, strongPos] = row.values;
        let x = 110 - (strongNeg + neg + neutral / 2) * unit;
        const segments = [
          { w: strongNeg, fill: NEG, opacity: 0.9 },
          { w: neg, fill: NEG, opacity: 0.45 },
          { w: neutral, fill: undefined, opacity: 1 },
          { w: pos, fill: POS, opacity: 0.45 },
          { w: strongPos, fill: POS, opacity: 0.9 },
        ];
        return (
          <g key={row.label} data-part="mark" data-i={i}>
            <text x="8" y={y + rowH / 2 + 1} {...TXT.axis}>
              {row.label}
            </text>
            {segments.map((segment, k) => {
              const w = Math.max(segment.w * unit - 1.6, 0.5);
              const x0 = x;
              x += segment.w * unit;
              return (
                <rect
                  key={k}
                  x={x0}
                  y={y}
                  width={w}
                  height={rowH - 4.5}
                  rx="2.5"
                  fill={segment.fill ?? ink(0.15)}
                  opacity={segment.fill ? segment.opacity : 1}
                />
              );
            })}
          </g>
        );
      })}
      <text
        x="30"
        y={vh - 4}
        fontSize="4.5"
        fill={NEG}
        fontFamily={TXT.axis.fontFamily}
      >
        ← {endLabels[0]}
      </text>
      <text x="110" y={vh - 4} textAnchor="middle" {...TXT.axis}>
        neutral
      </text>
      <text
        x="188"
        y={vh - 4}
        textAnchor="end"
        fontSize="4.5"
        fill={POS}
        fontFamily={TXT.axis.fontFamily}
      >
        {endLabels[1]} →
      </text>
    </ChartSvg>
  );
}
