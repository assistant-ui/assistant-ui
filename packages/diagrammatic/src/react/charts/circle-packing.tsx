import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { nodeValue, packSiblings } from "../../core/layout";
import { cat, ink } from "../../core/theme";
import { truncate } from "../../core/text";
import { ChartSvg, frame } from "../svg";

export type CirclePackingProps = BaseProps & { root: TreeNode };

const OUTER_PAD = 4;
const LABEL_PAD = 4;

export const CirclePacking = forwardRef<SVGSVGElement, CirclePackingProps>(
  (
    { root, title, width, height, aspect, fontSize, className, ...rest },
    ref,
  ) => {
    const F = frame({ width, height, aspect, fontSize }, 5 / 3);
    const { left, right, top, bottom, T } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const outer = Math.max(
      0,
      Math.min(right - left, bottom - top) / 2 - OUTER_PAD,
    );
    const clusters = root.children ?? [];
    const leaves = clusters.flatMap((cluster, k) =>
      (cluster.children && cluster.children.length > 0
        ? cluster.children
        : [cluster]
      ).map((leaf) => ({ leaf, cluster: k })),
    );
    const values = leaves.map((entry) => nodeValue(entry.leaf));
    const maxValue = Math.max(...values, 1);
    const packed = packSiblings(
      values.map(
        (v) => outer * (0.08 + Math.sqrt(Math.max(0, v) / maxValue) * 0.28),
      ),
    );
    const spread = Math.max(
      ...packed.map((c) => Math.hypot(c.x, c.y) + c.r),
      1,
    );
    const scale = Math.max(0, outer - OUTER_PAD) / spread;
    const labeled = new Set<number>();
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <circle
          cx={round(cx)}
          cy={cy}
          r={outer}
          fill="none"
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        {packed.map((circle, i) => {
          const entry = leaves[i]!;
          const x = round(cx + circle.x * scale);
          const y = round(cy + circle.y * scale);
          const r = round(Math.max(0, circle.r * scale));
          const label = truncate(
            clusters[entry.cluster]?.label ?? "",
            T.axis.px,
            Math.max(0, r * 2 - LABEL_PAD * 2),
          );
          const showLabel =
            !labeled.has(entry.cluster) && label !== "" && r >= T.axis.px * 1.5;
          if (showLabel) labeled.add(entry.cluster);
          return (
            <g key={i}>
              <circle
                data-part="mark"
                data-i={i}
                data-series={entry.leaf.label ?? clusters[entry.cluster]?.label}
                cx={x}
                cy={y}
                r={r}
                fill={cat(entry.cluster)}
                fillOpacity="0.25"
                stroke={cat(entry.cluster)}
                strokeOpacity="0.8"
                {...stroke.medium}
              />
              {showLabel && (
                <text
                  x={x}
                  y={round(y + T.axis.px * 0.32)}
                  textAnchor="middle"
                  {...T.axis.attrs}
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

CirclePacking.displayName = "CirclePacking";
