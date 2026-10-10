import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Graph } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { placeNetworkLabels, radialNetwork } from "../../core/layout";
import { ACCENT, SURFACE, ink } from "../../core/theme";
import { textWidth, truncate } from "../../core/text";
import { ChartSvg, PAD, frame } from "../svg";

export type NetworkProps = BaseProps & { graph: Graph };

export const Network = forwardRef<SVGSVGElement, NetworkProps>(
  (
    { graph, title, width, height, aspect, fontSize, className, ...rest },
    ref,
  ) => {
    const F = frame({ width, height, aspect, fontSize }, 5 / 3);
    const { left, right, top, bottom, T } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const ringGap = Math.max(
      0,
      Math.min((right - left) / 2, (bottom - top) / 2) - 14 - T.label.px * 1.4,
    );
    const positions = radialNetwork(graph, cx, cy, ringGap);
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
          r: 4 + (d / maxDegree) * 10,
        },
      ];
    });
    const maxLabelWidth = Math.max(0, right - left - PAD * 2);
    const labeledMarks = marks.map((mark) => ({
      ...mark,
      label: truncate(mark.label, T.label.px, maxLabelWidth),
    }));
    const labels = placeNetworkLabels(
      labeledMarks.filter((mark) => mark.label),
      { x0: PAD, y0: PAD, x1: F.width - PAD, y1: F.height - PAD },
      T.label.px,
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
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
          const labelX = label
            ? Math.max(PAD, Math.min(F.width - PAD, label.x))
            : 0;
          const labelY = label
            ? label.dominantBaseline === "hanging"
              ? Math.max(
                  PAD,
                  Math.min(F.height - PAD - T.label.px * 1.2, label.y),
                )
              : label.dominantBaseline === "central"
                ? Math.max(
                    PAD + T.label.px * 0.6,
                    Math.min(F.height - PAD - T.label.px * 0.6, label.y),
                  )
                : Math.max(
                    PAD + T.label.px * 0.8,
                    Math.min(F.height - PAD, label.y),
                  )
            : 0;
          const labelRoom = label
            ? label.textAnchor === "start"
              ? F.width - PAD - labelX
              : label.textAnchor === "end"
                ? labelX - PAD
                : Math.min(labelX - PAD, F.width - PAD - labelX) * 2
            : 0;
          const labelText = label
            ? textWidth(mark.label, T.label.px) <= labelRoom
              ? mark.label
              : truncate(mark.label, T.label.px, labelRoom)
            : "";
          return (
            <g key={mark.id} data-part="mark" data-series={mark.id}>
              <circle
                cx={round(mark.x)}
                cy={round(mark.y)}
                r={Math.max(10, round(mark.r + 4))}
                fill="transparent"
              />
              <circle
                cx={round(mark.x)}
                cy={round(mark.y)}
                r={round(mark.r)}
                fill={mark.id === hub ? ACCENT : ink(0.5)}
              />
              {label && labelText && (
                <text
                  x={round(labelX)}
                  y={round(labelY)}
                  textAnchor={label.textAnchor}
                  dominantBaseline={label.dominantBaseline}
                  stroke={SURFACE}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  {...T.label.attrs}
                >
                  {labelText}
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
