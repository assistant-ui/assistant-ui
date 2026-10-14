import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { round } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type PictogramProps = BaseProps & {
  items: Item[];
  unit: number;
  unitLabel?: string;
};

export const pictogramCellCount = (
  value: number,
  unit: number,
): number | null => {
  const count = Math.ceil(value / unit);
  return Number.isFinite(count) ? count : null;
};

export const Pictogram = forwardRef<SVGSVGElement, PictogramProps>(
  (
    {
      items,
      unit,
      unitLabel,
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
    const T = typeScale(fontSize);
    const W = resolveWidth(width);
    const itemCells = items.map((row) => pictogramCellCount(row.value, unit));
    const cells = Math.max(...itemCells.map((count) => count ?? 0), 1);
    const labelW = Math.max(
      0,
      ...items.map((row) => textWidth(row.label, T.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + labelW + 6)),
    });
    const { left, right, top, bottom, axisY, T: frameType } = F;
    const rowH = (bottom - top) / Math.max(1, items.length);
    let gap = 4;
    let size = Math.max(
      2,
      Math.min(20, rowH - 8, (right - left) / cells - gap),
    );
    const plotW = right - left;
    let columns = cells;
    const designSize = Math.min(20, Math.max(2, rowH - 8));
    if (cells * designSize + (cells - 1) * gap > plotW || size > rowH) {
      const ratio = gap / 20;
      let bestSize = 0;
      for (
        let candidate = 1;
        candidate <= Math.min(cells, plotW);
        candidate += 1
      ) {
        const candidateRows = Math.ceil(cells / candidate);
        const candidateSize = Math.min(
          designSize,
          plotW / (candidate + (candidate - 1) * ratio),
          rowH / (candidateRows + (candidateRows - 1) * ratio),
        );
        if (candidateSize > bestSize) {
          bestSize = candidateSize;
          columns = candidate;
        }
      }
      gap = bestSize * ratio;
      size = bestSize;
    }
    const pitch = size + gap;
    const rows = Math.ceil(cells / columns);
    const gridH = rows * size + (rows - 1) * gap;
    const key = `1 square = ${unit}${unitLabel ? ` ${unitLabel}` : ""}`;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {items.map((row, r) => {
          const y = top + r * rowH + (rowH - gridH) / 2;
          const filled = row.value / unit;
          return (
            <g key={row.label} data-part="mark" data-i={r}>
              <text
                x={left - 6}
                y={round(y + gridH / 2)}
                textAnchor="end"
                dominantBaseline="central"
                {...frameType.label.attrs}
              >
                {truncate(row.label, frameType.label.px, left - PAD - 6)}
              </text>
              {Array.from(
                { length: itemCells[r] === null ? 0 : cells },
                (_, c) => {
                  const x = left + (c % columns) * pitch;
                  const cellY = y + Math.floor(c / columns) * pitch;
                  const fill = filled - c;
                  if (fill >= 1) {
                    return (
                      <rect
                        key={c}
                        x={round(x)}
                        y={round(cellY)}
                        width={round(size)}
                        height={round(size)}
                        rx={round(size * 0.29)}
                        fill={r === 0 ? ACCENT : ink(0.55)}
                      />
                    );
                  }
                  if (fill > 0.05) {
                    const rr = round(size * 0.29);
                    return (
                      <g key={c}>
                        <rect
                          x={round(x)}
                          y={round(cellY)}
                          width={round(size)}
                          height={round(size)}
                          rx={rr}
                          fill={ink(0.1)}
                        />
                        <path
                          d={`M${round(x)} ${round(cellY + rr)} A${rr} ${rr} 0 0 1 ${round(x + rr)} ${round(cellY)} H${round(x + size * fill)} V${round(cellY + size)} H${round(x + rr)} A${rr} ${rr} 0 0 1 ${round(x)} ${round(cellY + size - rr)} Z`}
                          fill={r === 0 ? ACCENT : ink(0.55)}
                        />
                      </g>
                    );
                  }
                  return (
                    <rect
                      key={c}
                      x={round(x)}
                      y={round(cellY)}
                      width={round(size)}
                      height={round(size)}
                      rx={round(size * 0.29)}
                      fill={ink(0.1)}
                    />
                  );
                },
              )}
            </g>
          );
        })}
        <text x={right} y={axisY} textAnchor="end" {...frameType.axis.attrs}>
          {truncate(key, frameType.axis.px, right - left)}
        </text>
      </ChartSvg>
    );
  },
);

Pictogram.displayName = "Pictogram";
