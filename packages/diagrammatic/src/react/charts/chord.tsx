import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { polar, ring, round } from "../../core/geometry";
import { chordLayout } from "../../core/layout";
import { truncate } from "../../core/text";
import { SURFACE, alpha, cat } from "../../core/theme";
import { ChartSvg, PAD, frame } from "../svg";

export type ChordProps = BaseProps & {
  groups: string[];
  flows: { from: string; to: string; value: number }[];
};

const TAU = Math.PI * 2;

export const Chord = forwardRef<SVGSVGElement, ChordProps>(
  (
    {
      groups,
      flows,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3);
    const { left, right, top, bottom, T } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const plotSpan = Math.min(right - left, bottom - top);
    const ringW = Math.max(6, Math.min(10, plotSpan * 0.025));
    const labelGap = 8;
    const radius = Math.max(0, plotSpan / 2 - (T.axis.px + labelGap + ringW));
    const ringStroke = Math.max(1, Math.min(2, radius * 0.012));
    const labelRadius = radius + ringW + labelGap;
    const { arcs, ribbons } = chordLayout(groups, flows);
    const point = (f: number) => polar(cx, cy, radius, f * TAU - Math.PI / 2);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {ribbons.map((ribbon, i) => {
          const s0 = point(ribbon.s0);
          const s1 = point(ribbon.s1);
          const t0 = point(ribbon.t0);
          const t1 = point(ribbon.t1);
          return (
            <path
              key={i}
              d={[
                `M${round(s0.x)} ${round(s0.y)}`,
                `A${radius} ${radius} 0 0 1 ${round(s1.x)} ${round(s1.y)}`,
                `Q${round(cx)} ${round(cy)} ${round(t0.x)} ${round(t0.y)}`,
                `A${radius} ${radius} 0 0 1 ${round(t1.x)} ${round(t1.y)}`,
                `Q${round(cx)} ${round(cy)} ${round(s0.x)} ${round(s0.y)}`,
                "Z",
              ].join(" ")}
              fill={cat(ribbon.groupIndex)}
              opacity={alpha(0.28 - (i % 2) * 0.1)}
              data-part="mark"
              data-i={i}
              data-series={flows[i]!.from}
              data-series2={flows[i]!.to}
            />
          );
        })}
        {arcs.map((arc, i) => (
          <path
            key={groups[i]}
            d={ring(
              cx,
              cy,
              radius + 3,
              radius + 3 + ringW,
              arc.start * TAU,
              arc.end * TAU,
            )}
            fill={cat(i)}
            fillOpacity="0.9"
            stroke={SURFACE}
            strokeWidth={ringStroke}
            data-part="mark"
            data-series={groups[i]}
          />
        ))}
        {arcs.map((arc, i) => {
          const mid = ((arc.start + arc.end) / 2) * TAU - Math.PI / 2;
          const p = polar(cx, cy, labelRadius, mid);
          const side = Math.cos(mid);
          const textAnchor =
            side > 0.35 ? "start" : side < -0.35 ? "end" : "middle";
          const labelW =
            textAnchor === "start"
              ? F.width - PAD - p.x
              : textAnchor === "end"
                ? p.x - PAD
                : Math.min(p.x - PAD, F.width - PAD - p.x) * 2;
          return (
            <text
              key={groups[i]}
              x={round(p.x)}
              y={round(
                Math.max(PAD + T.axis.px, Math.min(F.height - PAD, p.y)),
              )}
              textAnchor={textAnchor}
              {...T.axis.attrs}
            >
              {truncate(groups[i] ?? "", T.axis.px, Math.max(0, labelW))}
            </text>
          );
        })}
      </ChartSvg>
    );
  },
);

Chord.displayName = "Chord";
