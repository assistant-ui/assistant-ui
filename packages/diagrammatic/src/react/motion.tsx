import type { CSSProperties } from "react";
import { round } from "../core/geometry";

/**
 * Motion layers a chart stamps once and never animates itself. They draw
 * nothing until `diagrammatic/styles.css` and a `data-dg-motion` attribute on
 * the figure or any ancestor bring them to life, so a server render without
 * the opt-in is byte-identical in what it shows.
 */

const COMET = 0.3;

/**
 * A comet that travels a directed connection from its first point to its
 * last. Every trail in a figure shares one sweep: `from` and `to` are where
 * the connection starts and ends along it, as fractions, and the comet runs
 * only while the sweep front crosses that span, so staged flows hand off from
 * one stage to the next.
 */
export function FlowTrail({
  d,
  color,
  width,
  from = 0,
  to = 1,
}: {
  d: string;
  color: string;
  width: number;
  from?: number;
  to?: number;
}) {
  const span = Math.max(0.01, to - from);
  return (
    <path
      d={d}
      pathLength={1}
      style={
        {
          "--dg-flow-from": round(COMET + from / span),
          "--dg-flow-to": round(COMET - (1 - from) / span),
        } as CSSProperties
      }
      fill="none"
      stroke={color}
      strokeOpacity={0}
      strokeWidth={width}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
      aria-hidden
      data-dg-flow=""
    />
  );
}

/** A halo that pulses outward from the latest point of a live series. */
export function Pulse({
  cx,
  cy,
  r,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      opacity={0}
      pointerEvents="none"
      aria-hidden
      data-dg-pulse=""
    />
  );
}
