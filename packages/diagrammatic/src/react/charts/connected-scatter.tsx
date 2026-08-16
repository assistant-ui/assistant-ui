import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { round, stroke } from "../../core/geometry";
import { ACCENT, GRID, SURFACE, cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";
import { scatterFrame } from "./scatter";

type ConnectedPoint = { x: number; y: number; label?: string };

export type ConnectedScatterProps = BaseProps & {
  points?: ConnectedPoint[];
  series?: { name: string; points: ConnectedPoint[] }[];
  xLabel?: string;
  yLabel?: string;
};

/**
 * Marker shape is the per-series identity channel, cycled alongside the
 * palette so series stay tellable in print and under CVD: circle, diamond,
 * square, triangle.
 */
function Marker({
  shape,
  x,
  y,
  fill,
  ...rest
}: {
  shape: number;
  x: number;
  y: number;
  fill: string;
} & Record<string, unknown>) {
  const r = 3.1;
  const common = { fill, stroke: SURFACE, strokeWidth: 1, ...rest };
  switch (shape % 4) {
    case 1:
      return (
        <path
          d={`M${round(x)} ${round(y - r * 1.2)} L${round(x + r * 1.2)} ${round(y)} L${round(x)} ${round(y + r * 1.2)} L${round(x - r * 1.2)} ${round(y)} Z`}
          {...common}
        />
      );
    case 2:
      return (
        <rect
          x={round(x - r * 0.9)}
          y={round(y - r * 0.9)}
          width={round(r * 1.8)}
          height={round(r * 1.8)}
          {...common}
        />
      );
    case 3:
      return (
        <path
          d={`M${round(x)} ${round(y - r * 1.15)} L${round(x + r)} ${round(y + r * 0.75)} L${round(x - r)} ${round(y + r * 0.75)} Z`}
          {...common}
        />
      );
    default:
      return <circle cx={round(x)} cy={round(y)} r={r} {...common} />;
  }
}

export const ConnectedScatter = forwardRef<
  SVGSVGElement,
  ConnectedScatterProps
>(
  (
    { points, series, xLabel, yLabel, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const all = series ?? [{ name: "", points: points ?? [] }];
    const multi = series !== undefined;
    const everyPoint = all.flatMap((s) => s.points);
    const { X, Y, bottom } = scatterFrame(everyPoint, vh);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="14"
          y1={bottom}
          x2="186"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1="14"
          y1={bottom}
          x2="14"
          y2="8"
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {all.map((run, k) => {
          const path = run.points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
          const first = path[0];
          const last = path[path.length - 1];
          const color = multi ? cat(k) : ink(0.6);
          return (
            <g key={run.name || k}>
              {path.length > 1 && (
                <path
                  d={path
                    .map(
                      (p, i) =>
                        `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={multi ? cat(k) : ink(0.45)}
                  opacity={multi ? 0.8 : 1}
                  data-part="mark"
                  data-series={run.name}
                  {...stroke.medium}
                />
              )}
              {path.map((p, i) =>
                multi ? (
                  <Marker
                    key={i}
                    shape={k}
                    x={p.x}
                    y={p.y}
                    fill={color}
                    data-part="mark"
                    data-series={run.name}
                    data-i={i}
                  />
                ) : (
                  <circle
                    key={i}
                    cx={round(p.x)}
                    cy={round(p.y)}
                    r="3"
                    fill={color}
                    data-part="mark"
                    data-series={run.name}
                    data-i={i}
                  />
                ),
              )}
              {!multi && first && (
                <circle
                  cx={round(first.x)}
                  cy={round(first.y)}
                  r="3.6"
                  fill={SURFACE}
                  stroke={ink(0.6)}
                  {...stroke.medium}
                />
              )}
              {!multi && last && (
                <circle
                  cx={round(last.x)}
                  cy={round(last.y)}
                  r="3.8"
                  fill={ACCENT}
                />
              )}
              {run.points.map((p, i) =>
                p.label ? (
                  <text
                    key={`label-${i}`}
                    x={round(X(p.x))}
                    y={round(Y(p.y)) + (!multi && i === 0 ? 10 : -6)}
                    textAnchor="middle"
                    {...TXT.axis}
                  >
                    {p.label}
                  </text>
                ) : null,
              )}
              {multi && run.name && last && (
                <text
                  x={round(last.x) + 5}
                  y={round(last.y) + 1.6}
                  {...TXT.label}
                >
                  {run.name}
                </text>
              )}
            </g>
          );
        })}
        {yLabel && (
          <text x="19" y="12" {...TXT.axis}>
            {yLabel} ↑
          </text>
        )}
        {xLabel && (
          <text x="186" y={vh - 5} textAnchor="end" {...TXT.axis}>
            {xLabel} →
          </text>
        )}
      </ChartSvg>
    );
  },
);

ConnectedScatter.displayName = "ConnectedScatter";
