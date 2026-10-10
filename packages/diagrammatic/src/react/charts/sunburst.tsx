import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { polar, ring, round } from "../../core/geometry";
import { partition } from "../../core/layout";
import { SURFACE, cat } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type SunburstProps = BaseProps & { root: TreeNode; depth?: number };

const TAU = Math.PI * 2;

export const Sunburst = forwardRef<SVGSVGElement, SunburstProps>(
  (
    {
      root,
      depth = 2,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3);
    const { left, right, top, bottom, T } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const outer = Math.max(1, Math.min(right - left, bottom - top) / 2 - 6);
    const inner = Math.max(1, outer * 0.22);
    const all = partition(root, depth);
    const ringWidth = (outer - inner) / Math.max(1, depth);
    const ringStroke = Math.max(1, Math.round(outer * 0.016 * 100) / 100);
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
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {all.map((slice, i) => {
          if (slice.depth === 0) return null;
          return (
            <path
              key={i}
              d={ring(
                cx,
                cy,
                inner + (slice.depth - 1) * ringWidth,
                inner + slice.depth * ringWidth,
                slice.start * TAU,
                slice.end * TAU,
              )}
              fill={cat(branchOf(i))}
              stroke={SURFACE}
              strokeWidth={ringStroke}
              fillOpacity={
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
          const p = polar(cx, cy, inner + ringWidth / 2, mid);
          return (
            <text
              key={slice.node.label}
              x={round(p.x)}
              y={round(p.y + T.onSeries.px * 0.15)}
              textAnchor="middle"
              {...T.onSeries.attrs}
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
