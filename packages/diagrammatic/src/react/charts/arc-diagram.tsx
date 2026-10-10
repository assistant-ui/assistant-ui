import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { truncate } from "../../core/text";
import { ChartSvg, frame } from "../svg";

export type ArcDiagramProps = BaseProps & {
  graph: Graph;
  highlight?: string;
};

/** Nodes stay in the given order; sort them upstream on purpose. */
export const ArcDiagram = forwardRef<SVGSVGElement, ArcDiagramProps>(
  (
    {
      graph,
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
    const baseline = bottom;
    const slot = (right - left) / Math.max(1, graph.nodes.length);
    const xs = new Map(
      graph.nodes.map((node, i) => [node.id, left + (i + 0.5) * slot]),
    );
    const highlighted = (link: Graph["links"][number]) =>
      highlight !== undefined &&
      (link.source === highlight || link.target === highlight);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <line
          x1={left}
          y1={baseline}
          x2={right}
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
          const distance = x1 - x0;
          const arcHeight = Math.min(distance * 0.32, baseline - top);
          const accent = highlighted(link);
          const d =
            distance > 0
              ? `M${round(x0)} ${round(baseline)} A${round(distance / 2)} ${round(arcHeight)} 0 0 1 ${round(x1)} ${round(baseline)}`
              : `M${round(x0)} ${round(baseline)} C${round(x0 - 12)} ${round(baseline - 18)} ${round(x0 + 12)} ${round(baseline - 18)} ${round(x0)} ${round(baseline)}`;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={accent ? ACCENT : ink(0.3)}
              data-part="mark"
              data-i={i}
              data-series={link.source}
              data-series2={link.target}
              {...(accent ? stroke.line : stroke.hair)}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const x = xs.get(node.id)!;
          const accent = highlight !== undefined && node.id === highlight;
          const label = truncate(node.label ?? node.id, T.axis.px, slot - 6);
          return (
            <g key={node.id} data-part="mark" data-series={node.id}>
              <circle cx={round(x)} cy={baseline} r={10} fill="transparent" />
              <circle
                cx={round(x)}
                cy={baseline}
                r={accent ? 5 : 4}
                fill={accent ? ACCENT : ink(0.5)}
              />
              <text
                x={round(x)}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
              >
                {label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

ArcDiagram.displayName = "ArcDiagram";
