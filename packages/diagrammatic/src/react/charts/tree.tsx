import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { treeLayout } from "../../core/layout";
import { ACCENT, ink } from "../../core/theme";
import { truncate } from "../../core/text";
import { ChartSvg, PAD, frame } from "../svg";

export type TreeProps = BaseProps & { root: TreeNode; depth?: number };

export const Tree = forwardRef<SVGSVGElement, TreeProps>(
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
    });
    const { left, right, top, bottom, T } = F;
    const points = treeLayout(root, depth);
    const maxDepth = Math.max(...points.map((p) => p.depth), 1);
    const leaves = points.filter(
      (point) => point.depth === depth || !point.node.children?.length,
    );
    const columnW = (right - left) / Math.max(1, leaves.length);
    const X = (t: number) =>
      leaves.length < 2
        ? (left + right) / 2
        : left + columnW * (0.5 + t * (leaves.length - 1));
    const Y = (d: number) => top + (d / maxDepth) * (bottom - top);
    const leafRank = new Map(
      points
        .filter((p) => p.depth >= 2)
        .sort((a, b) => a.x - b.x)
        .map((p, rank) => [p, rank] as const),
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
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
          const r = point.depth === 0 ? 7 : point.depth === 1 ? 5 : 4;
          const labelDirection = x <= (left + right) / 2 ? 1 : -1;
          const sideX = x + labelDirection * (r + 5);
          const sideRoom = labelDirection > 0 ? right - sideX : sideX - left;
          const sideLabel = truncate(
            point.node.label,
            T.axis.px,
            Math.min(Math.max(0, columnW - 10), Math.max(0, sideRoom)),
          );
          const leafLabel = truncate(
            point.node.label,
            T.axis.px,
            Math.max(0, columnW - 10),
          );
          const leafY = Math.min(
            F.height - PAD - T.axis.px * 1.2,
            y + r + 5 + ((leafRank.get(point) ?? 0) % 2) * 7,
          );
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
              {point.depth < 2 && sideLabel ? (
                <text
                  x={round(sideX)}
                  y={round(y)}
                  textAnchor={labelDirection > 0 ? "start" : "end"}
                  dominantBaseline="central"
                  {...T.axis.attrs}
                >
                  {sideLabel}
                </text>
              ) : leafLabel ? (
                <text
                  x={round(x)}
                  y={round(leafY)}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  {...T.axis.attrs}
                >
                  {leafLabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Tree.displayName = "Tree";
