import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { nodeValue, packSiblings } from "../../core/layout";
import { cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type CirclePackingProps = BaseProps & { root: TreeNode };

export const CirclePacking = forwardRef<SVGSVGElement, CirclePackingProps>(
  ({ root, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cy = vh / 2;
    const outer = Math.min(cy - 8, 54);
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
      values.map((v) => 4 + Math.sqrt(v / maxValue) * 14),
    );
    const spread = Math.max(
      ...packed.map((c) => Math.hypot(c.x, c.y) + c.r),
      1,
    );
    const scale = (outer - 4) / spread;
    const labeled = new Set<number>();
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <circle
          cx="100"
          cy={cy}
          r={outer}
          fill="none"
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        {packed.map((circle, i) => {
          const entry = leaves[i]!;
          const x = round(100 + circle.x * scale);
          const y = round(cy + circle.y * scale);
          const r = round(circle.r * scale);
          const showLabel = !labeled.has(entry.cluster) && r > 10;
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
                <text x={x} y={y + 1.6} textAnchor="middle" {...TXT.axis}>
                  {clusters[entry.cluster]?.label}
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
