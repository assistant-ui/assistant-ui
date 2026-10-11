import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { truncate } from "../../core/text";
import { formatCompact } from "../../core/types";
import {
  type TickSpec,
  resolveTicks,
  wantsTicks,
  boundsOf,
} from "../../core/scale";
import type { Guide } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { ACCENT, cat, ink } from "../../core/theme";
import { ChartSvg, Guides, TickGrid, frame } from "../svg";

export type BoxPlotProps = BaseProps & {
  groups: {
    label: string;
    low: number;
    q1: number;
    median: number;
    q3: number;
    high: number;
    points?: readonly number[];
  }[];
  categorical?: boolean;
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

function jitter(value: number, index: number): number {
  const h = Math.sin(value * 12.9898 + index * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1;
}

export const BoxPlot = forwardRef<SVGSVGElement, BoxPlotProps>(
  (
    {
      groups,
      categorical,
      yTicks,
      guides,
      format = formatCompact,
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
    const [lo, hi] = boundsOf(
      groups.flatMap((g) => [g.low, g.high, ...(g.points ?? [])]),
      yTicks,
      guides,
    );
    const yTickList = resolveTicks(yTicks, lo, hi, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      ticks: wantsTicks(yTicks) ? (yTickList ?? true) : false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = linear(lo, hi, bottom, top);
    const step = (right - left) / Math.max(1, groups.length);
    const X = (i: number) => left + step * (i + 0.5);
    const boxWidth = Math.min(48, step * 0.56);
    const half = boxWidth / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <TickGrid
          ticks={yTickList}
          at={Y}
          from={left}
          to={right}
          type={T.axis}
        />
        <Guides
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {groups.map((box, i) => {
          const x = left + step * (i + 0.5);
          const color = categorical ? cat(i) : undefined;
          const frame = color ?? ink(0.55);
          return (
            <g key={box.label} data-part="mark" data-i={i}>
              <g stroke={frame} opacity={color ? 0.75 : 1} {...stroke.medium}>
                <line x1={x} y1={Y(box.high)} x2={x} y2={Y(box.q3)} />
                <line x1={x} y1={Y(box.q1)} x2={x} y2={Y(box.low)} />
                <line
                  x1={x - half * 0.6}
                  y1={Y(box.high)}
                  x2={x + half * 0.6}
                  y2={Y(box.high)}
                />
                <line
                  x1={x - half * 0.6}
                  y1={Y(box.low)}
                  x2={x + half * 0.6}
                  y2={Y(box.low)}
                />
              </g>
              <rect
                x={x - half}
                y={Y(box.q3)}
                width={half * 2}
                height={Y(box.q1) - Y(box.q3)}
                fill={color ?? ink(0.08)}
                opacity={color ? 0.3 : 1}
              />
              {box.points?.map((v, k) => (
                <circle
                  key={k}
                  cx={round(x + jitter(v, k) * half * 0.85)}
                  cy={round(Y(v))}
                  r={3}
                  fill={color ?? ink(0.5)}
                  opacity="0.55"
                />
              ))}
              <line
                x1={x - half}
                y1={Y(box.median)}
                x2={x + half}
                y2={Y(box.median)}
                stroke={color ? ink(0.85) : ACCENT}
                {...stroke.line}
              />
              <text x={x} y={axisY} textAnchor="middle" {...T.axis.attrs}>
                {truncate(box.label, T.axis.px, Math.max(0, step - 6))}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

BoxPlot.displayName = "BoxPlot";
