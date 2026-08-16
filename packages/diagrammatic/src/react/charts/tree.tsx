import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { treeLayout } from "../../core/layout";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type TreeProps = BaseProps & { root: TreeNode; depth?: number };

export const Tree = forwardRef<SVGSVGElement, TreeProps>(
  ({ root, depth = 2, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const points = treeLayout(root, depth);
    const maxDepth = Math.max(...points.map((p) => p.depth), 1);
    const X = (t: number) => 24 + t * 152;
    const Y = (d: number) => 16 + (d / maxDepth) * (vh - 36);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {points.map((point, i) => {
          if (point.parent < 0) return null;
          const parent = points[point.parent]!;
          const x0 = X(parent.x);
          const y0 = Y(parent.depth);
          const x1 = X(point.x);
          const y1 = Y(point.depth);
          const bend = (y0 + y1) / 2;
          return (
            <path
              key={i}
              d={`M${round(x0)} ${round(y0)} C${round(x0)} ${round(bend)} ${round(x1)} ${round(bend)} ${round(x1)} ${round(y1)}`}
              fill="none"
              stroke={ink(0.25)}
              data-part="grid"
              {...stroke.hair}
            />
          );
        })}
        {points.map((point, i) => {
          const x = X(point.x);
          const y = Y(point.depth);
          const r = point.depth === 0 ? 6 : point.depth === 1 ? 4.5 : 3.2;
          return (
            <g key={i} data-part="mark" data-series={point.node.label}>
              <circle
                cx={round(x)}
                cy={round(y)}
                r={r}
                fill={
                  point.depth === 0
                    ? ACCENT
                    : ink(point.depth === 1 ? 0.55 : 0.35)
                }
              />
              {point.depth < 2 ? (
                <text x={round(x + r + 3)} y={round(y + 1.8)} {...TXT.axis}>
                  {point.node.label}
                </text>
              ) : (
                <text
                  x={round(x)}
                  y={round(y + r + 6)}
                  textAnchor="middle"
                  {...TXT.axis}
                >
                  {point.node.label}
                </text>
              )}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Tree.displayName = "Tree";
