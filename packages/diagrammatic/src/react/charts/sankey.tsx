import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round } from "../../core/geometry";
import { sankeyTwoColumn } from "../../core/layout";
import { cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type SankeyProps = BaseProps & { graph: Graph };

const X0 = 19;
const X1 = 181;

export const Sankey = forwardRef<SVGSVGElement, SankeyProps>(
  ({ graph, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const { nodes, ribbons } = sankeyTwoColumn(graph, 12, vh - 12, 8);
    const mx = round((X0 + X1) / 2);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {ribbons.map((ribbon, i) => (
          <path
            key={i}
            d={`M${X0} ${round(ribbon.sy0)} C${mx} ${round(ribbon.sy0)} ${mx} ${round(ribbon.ty0)} ${X1} ${round(ribbon.ty0)} L${X1} ${round(ribbon.ty1)} C${mx} ${round(ribbon.ty1)} ${mx} ${round(ribbon.sy1)} ${X0} ${round(ribbon.sy1)} Z`}
            fill={cat(ribbon.sourceIndex)}
            opacity={0.32 - (i % 2) * 0.1}
            data-part="mark"
            data-i={i}
            data-series={ribbon.source}
            data-series2={ribbon.target}
          />
        ))}
        {nodes.map((node) => (
          <g key={node.id} data-part="mark" data-series={node.id}>
            <rect
              x={node.side === "left" ? X0 - 5 : X1}
              y={round(node.y0)}
              width="5"
              height={round(node.y1 - node.y0)}
              fill={ink(0.7)}
            />
            <text
              x={node.side === "left" ? X0 + 5 : X1 - 5}
              y={round((node.y0 + node.y1) / 2 + 1.8)}
              textAnchor={node.side === "left" ? "start" : "end"}
              {...TXT.label}
            >
              {node.label}
            </text>
          </g>
        ))}
      </ChartSvg>
    );
  },
);

Sankey.displayName = "Sankey";
