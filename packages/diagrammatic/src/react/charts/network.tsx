import type { BaseProps, Graph } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { radialNetwork } from "../../core/layout";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type NetworkProps = BaseProps & { graph: Graph };

export function Network({ graph, title, aspect, className }: NetworkProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const cy = vh / 2;
  const positions = radialNetwork(graph, 100, cy, Math.min(cy - 14, 46));
  const degree = new Map<string, number>();
  for (const link of graph.links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  }
  const maxDegree = Math.max(...degree.values(), 1);
  const hub = [...degree.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <ChartSvg vh={vh} title={title} className={className}>
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
            data-part="grid"
            {...stroke.hair}
          />
        );
      })}
      {graph.nodes.map((node) => {
        const p = positions.get(node.id);
        if (!p) return null;
        const d = degree.get(node.id) ?? 0;
        const r = 2.8 + (d / maxDegree) * 5.2;
        const isHub = node.id === hub;
        return (
          <g key={node.id} data-part="mark" data-series={node.id}>
            <circle
              cx={round(p.x)}
              cy={round(p.y)}
              r={round(r)}
              fill={isHub ? ACCENT : ink(0.5)}
            />
            {node.label && (
              <text x={round(p.x + r + 3)} y={round(p.y + 1.8)} {...TXT.axis}>
                {node.label}
              </text>
            )}
          </g>
        );
      })}
    </ChartSvg>
  );
}
