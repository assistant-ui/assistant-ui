import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ArcDiagramProps = BaseProps & {
  graph: Graph;
  highlight?: string;
};

/** Nodes stay in the given order; sort them upstream on purpose. */
export const ArcDiagram = forwardRef<SVGSVGElement, ArcDiagramProps>(
  ({ graph, highlight, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const baseline = vh - 28;
    const xs = new Map(
      graph.nodes.map((node, i) => [
        node.id,
        22 + (i * 166) / Math.max(1, graph.nodes.length - 1),
      ]),
    );
    const degree = new Map<string, number>();
    for (const link of graph.links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }
    const highlighted = (link: Graph["links"][number]) =>
      highlight !== undefined &&
      (link.source === highlight || link.target === highlight);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="14"
          y1={baseline}
          x2="194"
          y2={baseline}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {graph.links.map((link, i) => {
          const x0 = Math.min(
            xs.get(link.source) ?? 0,
            xs.get(link.target) ?? 0,
          );
          const x1 = Math.max(
            xs.get(link.source) ?? 0,
            xs.get(link.target) ?? 0,
          );
          const r = (x1 - x0) / 2;
          const accent = highlighted(link);
          return (
            <path
              key={i}
              d={`M${round(x0)} ${baseline} A${round(r)} ${round(r * 0.82)} 0 0 1 ${round(x1)} ${baseline}`}
              fill="none"
              stroke={accent ? ACCENT : ink(0.3)}
              data-part="mark"
              data-i={i}
              {...(accent ? stroke.line : stroke.hair)}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const x = xs.get(node.id)!;
          const accent = highlight !== undefined && node.id === highlight;
          return (
            <g key={node.id} data-part="mark" data-series={node.id}>
              <circle
                cx={round(x)}
                cy={baseline}
                r={accent ? 4 : 3}
                fill={accent ? ACCENT : ink(0.5)}
              />
              <text
                x={round(x)}
                y={baseline + 12}
                textAnchor="middle"
                {...TXT.axis}
              >
                {node.label ?? node.id}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

ArcDiagram.displayName = "ArcDiagram";
