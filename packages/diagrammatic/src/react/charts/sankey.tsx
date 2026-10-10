import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round } from "../../core/geometry";
import { sankeyColumns } from "../../core/layout";
import { textWidth, truncate } from "../../core/text";
import { alpha, cat, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, PAD, frame } from "../svg";

export type SankeyProps = BaseProps & { graph: Graph };

export const Sankey = forwardRef<SVGSVGElement, SankeyProps>(
  (
    {
      graph,
      labels,
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
      labels: Boolean(labels),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const { nodes, ribbons } = sankeyColumns(graph, top, bottom, 8);
    const lastColumn = Math.max(0, ...nodes.map((node) => node.column));
    const columns = lastColumn + 1;
    const nodeW = 12;
    const span = Math.max(0, right - left - nodeW);
    const X = (column: number) =>
      left + (column * span) / Math.max(1, columns - 1);
    const columnStep = columns > 1 ? span / (columns - 1) : span;
    const headerLabels = labels?.map((label) =>
      truncate(label, T.axis.px, Math.max(0, F.width - PAD * 2)),
    );
    const headerXs =
      headerLabels?.map((label, i) => {
        const half = textWidth(label, T.axis.px) / 2;
        const x = X(Math.min(i, lastColumn)) + nodeW / 2;
        return Math.max(PAD + half, Math.min(F.width - PAD - half, x));
      }) ?? [];
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {ribbons.map((ribbon, i) => {
          const sx = X(ribbon.sourceColumn) + nodeW;
          const tx = X(ribbon.targetColumn);
          const mx = (sx + tx) / 2;
          return (
            <path
              key={i}
              d={`M${round(sx)} ${round(ribbon.sy0)} C${round(mx)} ${round(ribbon.sy0)} ${round(mx)} ${round(ribbon.ty0)} ${round(tx)} ${round(ribbon.ty0)} L${round(tx)} ${round(ribbon.ty1)} C${round(mx)} ${round(ribbon.ty1)} ${round(mx)} ${round(ribbon.sy1)} ${round(sx)} ${round(ribbon.sy1)} Z`}
              fill={cat(ribbon.sourceIndex)}
              opacity={alpha(0.32 - (i % 2) * 0.1)}
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
          const labelX = end && !start ? x - 6 : x + nodeW + 6;
          const labelW =
            end && !start
              ? x - left - 6
              : Math.min(right - labelX, columnStep - nodeW - 6);
          return (
            <g key={node.id} data-part="mark" data-series={node.id}>
              <rect
                x={round(x)}
                y={round(node.y0)}
                width={nodeW}
                height={round(node.y1 - node.y0)}
                fill={ink(0.7)}
              />
              <text
                x={round(labelX)}
                y={round((node.y0 + node.y1) / 2)}
                dominantBaseline="central"
                textAnchor={end && !start ? "end" : "start"}
                {...T.label.attrs}
              >
                {truncate(node.label, T.label.px, Math.max(0, labelW))}
              </text>
            </g>
          );
        })}
        {headerLabels && (
          <AxisLabels
            labels={headerLabels}
            xs={headerXs}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Sankey.displayName = "Sankey";
