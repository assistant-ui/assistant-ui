import type { BaseProps } from "../react/svg";
import { forwardRef } from "react";
import { round } from "../core/geometry";
import { cat, ink } from "../core/theme";
import { ChartSvg, frame } from "../react/svg";
import { WORLD_HEIGHT } from "./world-data";
import { CENTROIDS, DOTS, DOT_ISOS } from "./world-dots";

export type DotWorldMapProps = BaseProps & {
  groups?: Readonly<Record<string, readonly string[]>>;
  flows?: readonly { from: string; to: string }[];
};

const FLOW_SAMPLES = 26;

function flowPoint(
  a: readonly [number, number],
  b: readonly [number, number],
  t: number,
): [number, number] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const lift = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.22;
  const cx = mx;
  const cy = my - lift;
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * cx + t * t * b[0],
    u * u * a[1] + 2 * u * t * cy + t * t * b[1],
  ];
}

/**
 * The dotted variant of the world map: the same offline geometry sampled
 * into a halftone grid, countries grouped into named clusters that take the
 * categorical palette in group order, and flows drawn as symbol trails along
 * a lifted arc whose color mixes from the source group into the target.
 * Countries keep per-ISO mark seams; flows carry (series, series2).
 */
/** Glyph sizes in CSS pixels; the dot layer is drawn inside a scaled group, so each is divided by the scale where it is used. */
const DOT = 1.3;
const RING = 1.15;
const FLOW_END = 4.5;
const FLOW_DIAMOND = 1.8;
const FLOW_CROSS = 1.6;
const FLOW_SQUARE = 2.6;
const FLOW_DOT = 1.5;

export const DotWorldMap = forwardRef<SVGSVGElement, DotWorldMapProps>(
  (
    {
      groups,
      flows,
      labels: _labels,
      legend: _legend,
      format: _format,
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
    const groupNames = Object.keys(groups ?? {});
    const groupOf = new Map<string, number>();
    groupNames.forEach((name, k) => {
      for (const iso of groups![name]!) groupOf.set(iso, k);
    });
    const byCountry = new Map<number, [number, number][]>();
    for (let i = 0; i < DOTS.length; i += 3) {
      const list = byCountry.get(DOTS[i + 2]!) ?? [];
      list.push([DOTS[i]!, DOTS[i + 1]!]);
      byCountry.set(DOTS[i + 2]!, list);
    }
    const F = frame(
      { width, height, aspect, fontSize },
      200 / WORLD_HEIGHT,
      {},
    );
    const { left, right, top, bottom } = F;
    const u = Math.min((right - left) / 200, (bottom - top) / WORLD_HEIGHT);
    const tx = left + (right - left - 200 * u) / 2;
    const ty = top + (bottom - top - WORLD_HEIGHT * u) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <g transform={`translate(${tx} ${ty}) scale(${u})`}>
          {[...byCountry.entries()].map(([isoIdx, dots]) => {
            const iso = DOT_ISOS[isoIdx]!;
            const group = groupOf.get(iso);
            const fill = group === undefined ? undefined : cat(group);
            return (
              <g key={iso} data-part="mark" data-series={iso}>
                {dots.map(([x, y], i) => {
                  const kind =
                    (Math.round(x * 10) * 7 + Math.round(y * 10) * 13) % 10;
                  const color = fill ?? ink(0.22);
                  const opacity = fill ? 0.9 : 1;
                  if (kind < 7) {
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={DOT / u}
                        fill={color}
                        opacity={opacity}
                      />
                    );
                  }
                  if (kind < 9) {
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={RING / u}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.5}
                        vectorEffect="non-scaling-stroke"
                        opacity={opacity}
                      />
                    );
                  }
                  return (
                    <rect
                      key={i}
                      x={x - RING / u}
                      y={y - RING / u}
                      width={(RING * 2) / u}
                      height={(RING * 2) / u}
                      fill={color}
                      opacity={opacity}
                    />
                  );
                })}
              </g>
            );
          })}
          {flows?.map((flow) => {
            const a = CENTROIDS[flow.from];
            const b = CENTROIDS[flow.to];
            if (!a || !b) return null;
            const fromColor = cat(groupOf.get(flow.from) ?? 0);
            const toColor = cat(groupOf.get(flow.to) ?? 0);
            return (
              <g
                key={`${flow.from}-${flow.to}`}
                data-part="mark"
                data-series={flow.from}
                data-series2={flow.to}
              >
                {Array.from({ length: FLOW_SAMPLES }, (_, i) => {
                  const t = i / (FLOW_SAMPLES - 1);
                  const [x, y] = flowPoint(a, b, t);
                  const color = `color-mix(in oklab, ${toColor} ${Math.round(t * 100)}%, ${fromColor})`;
                  const style = i % 4;
                  if (i === 0 || i === FLOW_SAMPLES - 1) {
                    const r = FLOW_END / u;
                    return (
                      <path
                        key={i}
                        d={`M${round(x)} ${round(y - r)}L${round(x + r)} ${round(y)}L${round(x)} ${round(y + r)}L${round(x - r)} ${round(y)}Z`}
                        fill={color}
                      />
                    );
                  }
                  if (style === 1) {
                    const r = FLOW_DIAMOND / u;
                    return (
                      <path
                        key={i}
                        d={`M${round(x)} ${round(y - r)}L${round(x + r)} ${round(y)}L${round(x)} ${round(y + r)}L${round(x - r)} ${round(y)}Z`}
                        fill={color}
                      />
                    );
                  }
                  if (style === 2) {
                    const r = FLOW_CROSS / u;
                    return (
                      <path
                        key={i}
                        d={`M${round(x - r)} ${round(y)}H${round(x + r)}M${round(x)} ${round(y - r)}V${round(y + r)}`}
                        stroke={color}
                        strokeWidth={0.6}
                        vectorEffect="non-scaling-stroke"
                        fill="none"
                      />
                    );
                  }
                  if (style === 3) {
                    const side = FLOW_SQUARE / u;
                    return (
                      <rect
                        key={i}
                        x={x - side / 2}
                        y={y - side / 2}
                        width={side}
                        height={side}
                        fill={color}
                      />
                    );
                  }
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={FLOW_DOT / u}
                      fill={color}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </ChartSvg>
    );
  },
);

DotWorldMap.displayName = "DotWorldMap";
