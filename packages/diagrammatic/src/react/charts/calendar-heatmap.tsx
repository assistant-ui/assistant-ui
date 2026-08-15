import type { BaseProps } from "../../core/types";
import { ACCENT, ink, seqOpacity } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type CalendarHeatmapProps = BaseProps & {
  values: number[];
  weeks?: number;
};

const DAY_LABELS = [
  { label: "Mon", row: 0 },
  { label: "Wed", row: 2 },
  { label: "Fri", row: 4 },
];

export function CalendarHeatmap({
  values,
  weeks,
  labels,
  title,
  aspect,
  className,
}: CalendarHeatmapProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const cols = weeks ?? Math.ceil(values.length / 7);
  const cell = Math.min(10, 160 / Math.max(1, cols));
  const max = Math.max(...values, 1);
  const gridTop = (vh - 7 * cell) / 2 + (labels ? -4 : 0);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {DAY_LABELS.map((d) => (
        <text
          key={d.label}
          x="8"
          y={gridTop + d.row * cell + cell * 0.7}
          {...TXT.axis}
        >
          {d.label}
        </text>
      ))}
      {values.slice(0, cols * 7).map((v, i) => {
        const c = Math.floor(i / 7);
        const r = i % 7;
        const x = 30 + c * cell;
        const y = gridTop + r * cell;
        const t = v / max;
        return t < 0.02 ? (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell - 2.4}
            height={cell - 2.4}
            rx="2"
            fill={ink(0.08)}
            data-part="mark"
            data-i={i}
          />
        ) : (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell - 2.4}
            height={cell - 2.4}
            rx="2"
            fill={ACCENT}
            opacity={seqOpacity(t)}
            data-part="mark"
            data-i={i}
          />
        );
      })}
      {labels?.map((label, i) => (
        <text
          key={label}
          x={30 + ((i + 0.1) * cols * cell) / labels.length}
          y={gridTop + 7 * cell + 6}
          {...TXT.axis}
        >
          {label}
        </text>
      ))}
    </ChartSvg>
  );
}
