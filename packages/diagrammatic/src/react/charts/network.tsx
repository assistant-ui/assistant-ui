import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { placeNetworkLabels, radialNetwork } from "../../core/layout";
import { ACCENT, SURFACE, ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type NetworkProps = BaseProps & { graph: Graph };

export const Network = forwardRef<SVGSVGElement, NetworkProps>(
  ({ graph, title, aspect, density, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const cy = vh / 2;
    const positions = radialNetwork(graph, 100, cy, Math.min(cy - 14, 46));
    const degree = new Map<string, number>();
    for (const link of graph.links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }
    const maxDegree = Math.max(...degree.values(), 1);
    const hub = [...degree.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const marks = graph.nodes.flatMap((node) => {
      const p = positions.get(node.id);
      if (!p) return [];
      const d = degree.get(node.id) ?? 0;
      return [
        {
          id: node.id,
          label: node.label ?? "",
          x: p.x,
          y: p.y,
          r: 2.8 + (d / maxDegree) * 5.2,
        },
      ];
    });
    const labels = placeNetworkLabels(
      marks.filter((mark) => mark.label),
      { x0: 3, y0: 3, x1: 197, y1: vh - 3 },
      T.label.fontSize,
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {graph.links.map((link, i) => {
          const a = positions.get(link.source);
          const b = positions.get(link.target);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={round(a.x)}
              y1={round(a.y)}
              x2={round(b.x)}
              y2={round(b.y)}
              stroke={ink(0.2)}
              data-part="mark"
              data-i={i}
              data-series={link.source}
              data-series2={link.target}
              {...stroke.hair}
            />
          );
        })}
        {marks.map((mark) => {
          const label = labels.get(mark.id);
          return (
            <g key={mark.id} data-part="mark" data-series={mark.id}>
              <circle
                cx={round(mark.x)}
                cy={round(mark.y)}
                r={round(mark.r)}
                fill={mark.id === hub ? ACCENT : ink(0.5)}
              />
              {label && (
                <text
                  x={round(label.x)}
                  y={round(label.y)}
                  textAnchor={label.textAnchor}
                  dominantBaseline={label.dominantBaseline}
                  stroke={SURFACE}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  {...T.label}
                >
                  {mark.label}
                </text>
              )}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Network.displayName = "Network";
