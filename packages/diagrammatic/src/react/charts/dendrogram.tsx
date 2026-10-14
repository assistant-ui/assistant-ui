import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { truncate } from "../../core/text";
import { round, stroke } from "../../core/geometry";
import { dendrogram } from "../../core/layout";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type DendrogramProps = BaseProps & {
  leaves: string[];
  merges: { a: number; b: number; height: number }[];
  highlight?: number;
};

/**
 * Scipy-style linkage: a and b below leaves.length reference leaves, larger
 * values reference earlier merges at leaves.length + index. `highlight` marks
 * one merge and everything below it.
 */
export const Dendrogram = forwardRef<SVGSVGElement, DendrogramProps>(
  (
    {
      leaves,
      merges,
      highlight,
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
    const { left, right, top, bottom, axisY, T } = F;
    const { brackets } = dendrogram(leaves.length, merges);
    const X = (slot: number) =>
      leaves.length <= 1
        ? (left + right) / 2
        : left + (slot * (right - left)) / (leaves.length - 1);
    const maxHeight = Math.max(...merges.map((m) => m.height), 1);
    const Y = (h: number) => bottom - (h / maxHeight) * (bottom - top);
    const leafGap = (right - left) / Math.max(1, leaves.length - 1);
    const leafLabelW =
      leaves.length <= 1 ? right - left : Math.max(0, leafGap - 6);
    const inHighlight = new Set<number>();
    if (
      highlight !== undefined &&
      highlight >= 0 &&
      highlight < merges.length
    ) {
      const walk = (cluster: number) => {
        if (inHighlight.has(cluster)) return;
        inHighlight.add(cluster);
        if (cluster >= leaves.length) {
          const merge = merges[cluster - leaves.length];
          if (!merge) return;
          walk(merge.a);
          walk(merge.b);
        }
      };
      walk(leaves.length + highlight);
    }
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {brackets.map((bracket, i) => {
          const accent = inHighlight.has(leaves.length + i);
          return (
            <path
              key={i}
              d={`M${round(X(bracket.x1))} ${round(Y(bracket.d1))} V${round(Y(bracket.height))} H${round(X(bracket.x2))} V${round(Y(bracket.d2))}`}
              fill="none"
              stroke={accent ? ACCENT : ink(0.3)}
              strokeOpacity={accent ? 0.8 : 1}
              data-part="mark"
              data-i={i}
              {...stroke.hair}
            />
          );
        })}
        {leaves.map((leaf, i) => (
          <g key={leaf} data-part="mark" data-series={leaf}>
            <circle
              cx={round(X(i))}
              cy={round(bottom)}
              r={3}
              fill={inHighlight.has(i) ? ACCENT : ink(0.45)}
            />
            <text
              x={round(X(i))}
              y={round(axisY)}
              textAnchor={
                i === 0 ? "start" : i === leaves.length - 1 ? "end" : "middle"
              }
              {...T.axis.attrs}
            >
              {truncate(leaf, T.axis.px, leafLabelW)}
            </text>
          </g>
        ))}
      </ChartSvg>
    );
  },
);

Dendrogram.displayName = "Dendrogram";
