import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { partition } from "../../core/layout";
import { cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type IcicleProps = BaseProps & { root: TreeNode; depth?: number };

export const Icicle = forwardRef<SVGSVGElement, IcicleProps>(
  ({ root, depth = 2, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const all = partition(root, depth);
    const rowH = (vh - 16 - depth * 2) / (depth + 1);
    const branchOf = (index: number): number => {
      let current = all[index]!;
      let currentIndex = index;
      while (current.depth > 1) {
        currentIndex = current.parentIndex;
        current = all[currentIndex]!;
      }
      return all.filter((s) => s.depth === 1 && all.indexOf(s) < currentIndex)
        .length;
    };
    const priorSiblings = (index: number): number => {
      const slice = all[index]!;
      let count = 0;
      for (let i = 0; i < index; i += 1) {
        if (all[i]!.parentIndex === slice.parentIndex) count += 1;
      }
      return count;
    };
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {all.map((slice, i) => {
          const x = 8 + slice.start * 184;
          const w = Math.max((slice.end - slice.start) * 184 - 2, 1);
          const y = 8 + slice.depth * (rowH + 2);
          const fits = w > 24;
          if (slice.depth === 0) {
            return (
              <g key={i} data-part="mark" data-series={slice.node.label}>
                <rect x={x} y={y} width={w} height={rowH} fill={ink(0.08)} />
                {fits && (
                  <text
                    x={x + 5}
                    y={y + rowH / 2}
                    dominantBaseline="central"
                    {...TXT.label}
                  >
                    {slice.node.label}
                  </text>
                )}
              </g>
            );
          }
          return (
            <g key={i} data-part="mark" data-series={slice.node.label}>
              <rect
                x={x}
                y={y}
                width={w}
                height={rowH}
                fill={cat(branchOf(i))}
                opacity={
                  slice.depth === 1
                    ? 0.85
                    : priorSiblings(i) % 2 === 0
                      ? 0.55
                      : 0.35
                }
              />
              {fits && (
                <text
                  x={x + 5}
                  y={y + rowH / 2}
                  dominantBaseline="central"
                  {...TXT.onSeries}
                >
                  {slice.node.label}
                </text>
              )}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Icicle.displayName = "Icicle";
