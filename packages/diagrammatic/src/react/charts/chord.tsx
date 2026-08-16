import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { polar, ring, round } from "../../core/geometry";
import { chordLayout } from "../../core/layout";
import { SURFACE, cat } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ChordProps = BaseProps & {
  groups: string[];
  flows: { from: string; to: string; value: number }[];
};

const TAU = Math.PI * 2;

export const Chord = forwardRef<SVGSVGElement, ChordProps>(
  ({ groups, flows, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cy = vh / 2;
    const radius = Math.min(cy - 14, 40);
    const { arcs, ribbons } = chordLayout(groups, flows);
    const point = (f: number) => polar(100, cy, radius, f * TAU - Math.PI / 2);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
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
                `Q100 ${round(cy)} ${round(t0.x)} ${round(t0.y)}`,
                `A${radius} ${radius} 0 0 1 ${round(t1.x)} ${round(t1.y)}`,
                `Q100 ${round(cy)} ${round(s0.x)} ${round(s0.y)}`,
                "Z",
              ].join(" ")}
              fill={cat(ribbon.groupIndex)}
              opacity={0.28 - (i % 2) * 0.1}
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
              100,
              cy,
              radius + 2,
              radius + 9,
              arc.start * TAU,
              arc.end * TAU,
            )}
            fill={cat(i)}
            fillOpacity="0.9"
            stroke={SURFACE}
            strokeWidth="2"
            data-part="mark"
            data-series={groups[i]}
          />
        ))}
        {arcs.map((arc, i) => {
          const mid = ((arc.start + arc.end) / 2) * TAU - Math.PI / 2;
          const p = polar(100, cy, radius + 16, mid);
          const side = Math.cos(mid);
          return (
            <text
              key={groups[i]}
              x={round(p.x)}
              y={round(p.y) + 1.8}
              textAnchor={
                side > 0.35 ? "start" : side < -0.35 ? "end" : "middle"
              }
              {...TXT.axis}
            >
              {groups[i]}
            </text>
          );
        })}
      </ChartSvg>
    );
  },
);

Chord.displayName = "Chord";
