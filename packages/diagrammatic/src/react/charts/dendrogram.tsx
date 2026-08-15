import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { round, stroke } from "../../core/geometry";
import { dendrogram } from "../../core/layout";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

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
  ({ leaves, merges, highlight, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const baseline = vh - 24;
    const { brackets } = dendrogram(leaves.length, merges);
    const X = (slot: number) =>
      16 + (slot * 168) / Math.max(1, leaves.length - 1);
    const maxHeight = Math.max(...merges.map((m) => m.height), 1);
    const Y = (h: number) => baseline - (h / maxHeight) * (baseline - 14);
    const inHighlight = new Set<number>();
    if (highlight !== undefined) {
      const walk = (cluster: number) => {
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
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
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
              cy={baseline}
              r="3"
              fill={inHighlight.has(i) ? ACCENT : ink(0.45)}
            />
            <text
              x={round(X(i))}
              y={baseline + 10}
              textAnchor="middle"
              {...TXT.axis}
            >
              {leaf}
            </text>
          </g>
        ))}
      </ChartSvg>
    );
  },
);

Dendrogram.displayName = "Dendrogram";
