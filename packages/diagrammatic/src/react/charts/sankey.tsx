import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round } from "../../core/geometry";
import { sankeyColumns } from "../../core/layout";
import { cat, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type SankeyProps = BaseProps & { graph: Graph };

export const Sankey = forwardRef<SVGSVGElement, SankeyProps>(
  ({ graph, labels, title, aspect, density, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: Boolean(labels),
    });
    const { nodes, ribbons } = sankeyColumns(graph, top, bottom, 8);
    const lastColumn = Math.max(0, ...nodes.map((node) => node.column));
    const columns = lastColumn + 1;
    const X = (column: number) =>
      left + (column * (right - left)) / Math.max(1, columns - 1);
    const bar = 5;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {ribbons.map((ribbon, i) => {
          const sx = X(ribbon.sourceColumn);
          const tx = X(ribbon.targetColumn);
          const mx = (sx + tx) / 2;
          return (
            <path
              key={i}
              d={`M${round(sx)} ${round(ribbon.sy0)} C${round(mx)} ${round(ribbon.sy0)} ${round(mx)} ${round(ribbon.ty0)} ${round(tx)} ${round(ribbon.ty0)} L${round(tx)} ${round(ribbon.ty1)} C${round(mx)} ${round(ribbon.ty1)} ${round(mx)} ${round(ribbon.sy1)} ${round(sx)} ${round(ribbon.sy1)} Z`}
              fill={cat(ribbon.sourceIndex)}
              opacity={0.32 - (i % 2) * 0.1}
              data-part="mark"
              data-i={i}
              data-series={ribbon.source}
              data-series2={ribbon.target}
            />
          );
        })}
        {nodes.map((node) => {
          const x = X(node.column);
          const start = node.column === 0;
          const end = node.column === lastColumn;
          return (
            <g key={node.id} data-part="mark" data-series={node.id}>
              <rect
                x={round(start ? x - bar : x)}
                y={round(node.y0)}
                width={bar}
                height={round(node.y1 - node.y0)}
                fill={ink(0.7)}
              />
              <text
                x={round(start ? x + 4 : end ? x - 4 : x + 6)}
                y={round((node.y0 + node.y1) / 2)}
                dominantBaseline="central"
                textAnchor={end && !start ? "end" : "start"}
                {...T.label}
              >
                {node.label}
              </text>
            </g>
          );
        })}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map((_, i) => X(i))}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Sankey.displayName = "Sankey";
