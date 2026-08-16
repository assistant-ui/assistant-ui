import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { hexPath, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, SURFACE, cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";
import { scatterFrame } from "./scatter";

type ConnectedPoint = { x: number; y: number; label?: string };

export type ConnectedScatterProps = BaseProps & {
  points?: ConnectedPoint[];
  series?: { name: string; points: ConnectedPoint[] }[];
  xLabel?: string;
  yLabel?: string;
  xTicks?: readonly { at: number; label: string }[];
  yTicks?: readonly { at: number; label: string }[];
  reverseX?: boolean;
  refPoint?: {
    x: number;
    y: number;
    xLabel?: string;
    yLabel?: string;
    label?: string;
  };
};

/**
 * Marker shape is the per-series identity channel, cycled alongside the
 * palette so series stay tellable in print and under CVD: circle, diamond,
 * square, triangle, hexagon, inverted triangle.
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
  const r = 2.3;
  const common = { fill, stroke: SURFACE, strokeWidth: 0.8, ...rest };
  switch (shape % 6) {
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
    case 4:
      return <path d={hexPath(x, y, r * 1.08)} {...common} />;
    case 5:
      return (
        <path
          d={`M${round(x)} ${round(y + r * 1.15)} L${round(x + r)} ${round(y - r * 0.75)} L${round(x - r)} ${round(y - r * 0.75)} Z`}
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
    {
      points,
      series,
      xLabel,
      yLabel,
      xTicks,
      yTicks,
      reverseX,
      refPoint,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const all = series ?? [{ name: "", points: points ?? [] }];
    const multi = series !== undefined;
    const everyPoint = all.flatMap((s) => s.points);
    const { X: XF, Y, bottom } = scatterFrame(everyPoint, vh);
    const X = reverseX ? (v: number) => 200 - XF(v) : XF;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {yTicks?.map((tick) => (
          <g key={`y-${tick.at}`} data-part="grid">
            <line
              x1="14"
              y1={round(Y(tick.at))}
              x2="186"
              y2={round(Y(tick.at))}
              stroke={GRID}
              {...stroke.hair}
            />
            <text
              x="12"
              y={round(Y(tick.at)) + 1.5}
              textAnchor="end"
              {...TXT.axis}
            >
              {tick.label}
            </text>
          </g>
        ))}
        {xTicks?.map((tick) => (
          <g key={`x-${tick.at}`} data-part="grid">
            <line
              x1={round(X(tick.at))}
              y1="8"
              x2={round(X(tick.at))}
              y2={bottom}
              stroke={GRID}
              {...stroke.hair}
            />
            <text
              x={round(X(tick.at))}
              y={bottom + 6}
              textAnchor="middle"
              {...TXT.axis}
            >
              {tick.label}
            </text>
          </g>
        ))}
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
        {refPoint && (
          <g data-part="grid">
            <line
              x1="14"
              y1={round(Y(refPoint.y))}
              x2={round(X(refPoint.x))}
              y2={round(Y(refPoint.y))}
              stroke={ink(0.45)}
              strokeDasharray="2.5 3"
              {...stroke.hair}
            />
            <line
              x1={round(X(refPoint.x))}
              y1={round(Y(refPoint.y))}
              x2={round(X(refPoint.x))}
              y2={bottom}
              stroke={ink(0.45)}
              strokeDasharray="2.5 3"
              {...stroke.hair}
            />
            {refPoint.yLabel && (
              <text
                x="12"
                y={round(Y(refPoint.y)) + 1.5}
                textAnchor="end"
                {...TXT.axis}
                fill={ink(0.8)}
              >
                {refPoint.yLabel}
              </text>
            )}
            {refPoint.xLabel && (
              <text
                x={round(X(refPoint.x))}
                y={bottom + 6}
                textAnchor="middle"
                {...TXT.axis}
                fill={ink(0.8)}
              >
                {refPoint.xLabel}
              </text>
            )}
            {refPoint.label && (
              <text
                x={round(X(refPoint.x))}
                y={round(Y(refPoint.y)) - 8}
                textAnchor="middle"
                {...TXT.axis}
                fill={ink(0.8)}
              >
                {refPoint.label}
              </text>
            )}
          </g>
        )}
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
                  r="3"
                  fill={SURFACE}
                  stroke={ink(0.6)}
                  {...stroke.medium}
                />
              )}
              {!multi && last && (
                <circle
                  cx={round(last.x)}
                  cy={round(last.y)}
                  r="3.2"
                  fill={ACCENT}
                />
              )}
              {run.points.map((p, i) => (
                <circle
                  key={`hit-${i}`}
                  cx={round(X(p.x))}
                  cy={round(Y(p.y))}
                  r="4.5"
                  fill="transparent"
                  data-part="mark"
                  data-series={run.name || undefined}
                  data-i={i}
                />
              ))}
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
              {multi &&
                run.name &&
                last &&
                ((
                  reverseX
                    ? last.x - 4 - run.name.length * 1.7 < 14
                    : last.x + 4 + run.name.length * 1.7 > 186
                ) ? (
                  <text
                    x={round(last.x) + (reverseX ? 4 : -4)}
                    y={round(last.y) - 2.5}
                    textAnchor={reverseX ? "start" : "end"}
                    {...TXT.axis}
                  >
                    {run.name}
                  </text>
                ) : (
                  <text
                    x={round(last.x) + (reverseX ? -4 : 4)}
                    y={round(last.y) - 2.5}
                    textAnchor={reverseX ? "end" : "start"}
                    {...TXT.axis}
                  >
                    {run.name}
                  </text>
                ))}
            </g>
          );
        })}
        {yLabel && (
          <text
            x="4"
            y={vh / 2 - 6}
            transform={`rotate(-90 4 ${vh / 2 - 6})`}
            textAnchor="middle"
            {...TXT.axis}
          >
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x="100" y={vh - 3} textAnchor="middle" {...TXT.axis}>
            {reverseX ? `← ${xLabel}` : `${xLabel} →`}
          </text>
        )}
      </ChartSvg>
    );
  },
);

ConnectedScatter.displayName = "ConnectedScatter";
