import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { polar, ring, round } from "../../core/geometry";
import { partition } from "../../core/layout";
import { cat } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type SunburstProps = BaseProps & { root: TreeNode; depth?: number };

const TAU = Math.PI * 2;

export const Sunburst = forwardRef<SVGSVGElement, SunburstProps>(
  ({ root, depth = 2, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cy = vh / 2;
    const outer = Math.min(cy - 8, 48);
    const all = partition(root, depth);
    const ringWidth = (outer - 12) / depth;
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
    const gap = 0.04;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {all.map((slice, i) => {
          if (slice.depth === 0) return null;
          return (
            <path
              key={i}
              d={ring(
                100,
                cy,
                12 + (slice.depth - 1) * ringWidth + (slice.depth > 1 ? 2 : 0),
                12 + slice.depth * ringWidth,
                slice.start * TAU + gap,
                Math.max(slice.start * TAU + gap, slice.end * TAU - gap),
              )}
              fill={cat(branchOf(i))}
              opacity={
                slice.depth === 1
                  ? 0.9
                  : priorSiblings(i) % 2 === 0
                    ? 0.75
                    : 0.45
              }
              data-part="mark"
              data-series={slice.node.label}
            />
          );
        })}
        {all.map((slice) => {
          if (slice.depth !== 1 || (slice.end - slice.start) * TAU < 0.5) {
            return null;
          }
          const mid = ((slice.start + slice.end) / 2) * TAU - Math.PI / 2;
          const p = polar(100, cy, 12 + ringWidth / 2, mid);
          return (
            <text
              key={slice.node.label}
              x={round(p.x)}
              y={round(p.y) + 1.6}
              textAnchor="middle"
              {...TXT.onSeries}
            >
              {slice.node.label}
            </text>
          );
        })}
      </ChartSvg>
    );
  },
);

Sunburst.displayName = "Sunburst";
