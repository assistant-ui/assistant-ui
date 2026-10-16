import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { truncate } from "../../core/text";
import type { TreeNode } from "../../core/types";
import { partition } from "../../core/layout";
import { cat, ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type IcicleProps = BaseProps & { root: TreeNode; depth?: number };

const GAP = 2;
const LABEL_PAD = 6;

export const Icicle = forwardRef<SVGSVGElement, IcicleProps>(
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
    const all = partition(root, depth);
    const span = right - left;
    const rowH = (bottom - top - depth * GAP) / (depth + 1);
    const branches: number[] = [];
    const siblings: number[] = [];
    const siblingCounts = new Map<number, number>();
    let branchCount = 0;
    for (let i = 0; i < all.length; i += 1) {
      const slice = all[i]!;
      branches[i] =
        slice.depth === 1
          ? branchCount++
          : slice.depth > 1
            ? branches[slice.parentIndex]!
            : 0;
      const siblingCount = siblingCounts.get(slice.parentIndex) ?? 0;
      siblings[i] = siblingCount;
      siblingCounts.set(slice.parentIndex, siblingCount + 1);
    }
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {all.map((slice, i) => {
          const x = left + slice.start * span;
          const w = Math.max((slice.end - slice.start) * span - GAP, 1);
          const y = top + slice.depth * (rowH + GAP);
          const type = slice.depth === 0 ? T.label : T.onSeries;
          const label = truncate(
            slice.node.label,
            type.px,
            Math.max(0, w - LABEL_PAD * 2),
          );
          const fits = label !== "" && rowH >= type.px + 4;
          if (slice.depth === 0) {
            return (
              <g key={i} data-part="mark" data-series={slice.node.label}>
                <rect x={x} y={y} width={w} height={rowH} fill={ink(0.08)} />
                {fits && (
                  <text
                    x={x + LABEL_PAD}
                    y={y + rowH / 2}
                    dominantBaseline="central"
                    {...T.label.attrs}
                  >
                    {label}
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
                fill={cat(branches[i]!)}
                opacity={
                  slice.depth === 1
                    ? 0.85
                    : siblings[i]! % 2 === 0
                      ? 0.55
                      : 0.35
                }
              />
              {fits && (
                <text
                  x={x + LABEL_PAD}
                  y={y + rowH / 2}
                  dominantBaseline="central"
                  {...T.onSeries.attrs}
                >
                  {label}
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
