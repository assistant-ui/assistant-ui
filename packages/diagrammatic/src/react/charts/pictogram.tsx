import type { BaseProps, Item } from "../../core/types";
import { round } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type PictogramProps = BaseProps & {
  items: Item[];
  unit: number;
  unitLabel?: string;
};

export function Pictogram({
  items,
  unit,
  unitLabel,
  title,
  aspect,
  className,
}: PictogramProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const cells = Math.max(...items.map((r) => Math.ceil(r.value / unit)), 1);
  const rowH = (vh - 24) / Math.max(1, items.length);
  const size = Math.min(12, rowH - 6, 150 / cells - 3);
  const pitch = size + 3.4;
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {items.map((row, r) => {
        const y = 10 + r * rowH + (rowH - size) / 2 - 3;
        const filled = row.value / unit;
        return (
          <g key={row.label} data-part="mark" data-i={r}>
            <text x="8" y={y + size / 2 + 1.8} {...TXT.axis}>
              {row.label}
            </text>
            {Array.from({ length: cells }, (_, c) => {
              const x = 40 + c * pitch;
              const fill = filled - c;
              if (fill >= 1) {
                return (
                  <rect
                    key={c}
                    x={x}
                    y={y}
                    width={size}
                    height={size}
                    rx={size * 0.29}
                    fill={r === 0 ? ACCENT : ink(0.55)}
                  />
                );
              }
              if (fill > 0.05) {
                const rr = size * 0.29;
                return (
                  <g key={c}>
                    <rect
                      x={x}
                      y={y}
                      width={size}
                      height={size}
                      rx={rr}
                      fill={ink(0.1)}
                    />
                    <path
                      d={`M${round(x)} ${round(y + rr)} A${rr} ${rr} 0 0 1 ${round(x + rr)} ${round(y)} H${round(x + size * fill)} V${round(y + size)} H${round(x + rr)} A${rr} ${rr} 0 0 1 ${round(x)} ${round(y + size - rr)} Z`}
                      fill={r === 0 ? ACCENT : ink(0.55)}
                    />
                  </g>
                );
              }
              return (
                <rect
                  key={c}
                  x={x}
                  y={y}
                  width={size}
                  height={size}
                  rx={size * 0.29}
                  fill={ink(0.1)}
                />
              );
            })}
          </g>
        );
      })}
      <text x="192" y={vh - 5} textAnchor="end" {...TXT.axis}>
        1 square = {unit}
        {unitLabel ? ` ${unitLabel}` : ""}
      </text>
    </ChartSvg>
  );
}
