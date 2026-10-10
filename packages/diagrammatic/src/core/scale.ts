import type { Guide, ScaleKind, Tick } from "./types";
import { formatCompact } from "./types";
import { extent } from "./geometry";

/**
 * A tick request: an explicit ladder, or a count the chart resolves against
 * its own domain. `undefined` draws no value axis, which stays the default.
 */
export type TickSpec = readonly Tick[] | number;

/** Whether a tick request asks for a value axis at all. */
export function wantsTicks(spec: TickSpec | undefined): boolean {
  if (spec === undefined) return false;
  return typeof spec === "number" ? spec > 0 : spec.length > 0;
}

/** The tick values of an explicit ladder, for seeding a domain. */
export function tickValues(spec: TickSpec | undefined): number[] {
  return typeof spec === "object" ? spec.map((tick) => tick.at) : [];
}

/**
 * The upper bound of a zero-based value axis: the data, plus anything an
 * explicit ladder or a guide asks to have inside the frame, never below
 * `floor`. Every zero-based host resolves its domain through this, so a tick
 * or a guide cannot land outside the plot on one chart and inside it on the
 * next.
 */
export function upperBound(
  values: readonly number[],
  ticks?: TickSpec,
  guides?: readonly Guide[],
  floor = 1,
): number {
  return Math.max(
    ...values,
    ...tickValues(ticks),
    ...(guides?.map((guide) => guide.at) ?? []),
    floor,
  );
}

/** The same reconciliation for an axis that is not zero-based. */
export function boundsOf(
  values: readonly number[],
  ticks?: TickSpec,
  guides?: readonly Guide[],
): [number, number] {
  return extent([
    ...values,
    ...tickValues(ticks),
    ...(guides?.map((guide) => guide.at) ?? []),
  ]);
}

/**
 * The 1-2-5 ladder rung closest to `raw` on a log scale, so a requested tick
 * count lands near what was asked for rather than always under it.
 */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const error = raw / magnitude;
  const rung =
    error >= Math.sqrt(50)
      ? 10
      : error >= Math.sqrt(10)
        ? 5
        : error >= Math.sqrt(2)
          ? 2
          : 1;
  return rung * magnitude;
}

/**
 * Round values inside [lo, hi] on the 1-2-5 ladder, aiming for `count`
 * intervals. The endpoints are not forced onto the axis: a tick that would
 * sit outside the domain is dropped rather than stretching the plot.
 */
export function niceTicks(
  lo: number,
  hi: number,
  count = 4,
  format: (value: number) => string = formatCompact,
): Tick[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  const span = hi - lo;
  if (span <= 0) return [{ at: hi, label: format(hi) }];
  const step = niceStep(span / Math.max(1, count));
  const first = Math.ceil(lo / step) * step;
  const ticks: Tick[] = [];
  for (let at = first; at <= hi + step * 1e-9; at += step) {
    const value = Math.abs(at) < step * 1e-9 ? 0 : at;
    ticks.push({ at: value, label: format(value) });
  }
  return ticks;
}

/** Powers of ten spanning [lo, hi], the honest ladder for log paper. */
export function decadeTicks(
  lo: number,
  hi: number,
  format: (value: number) => string = formatCompact,
): Tick[] {
  if (!(lo > 0) || !(hi > 0) || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [];
  }
  const from = Math.floor(Math.log10(lo));
  const to = Math.ceil(Math.log10(hi));
  const ticks: Tick[] = [];
  for (let power = from; power <= to; power++) {
    const at = 10 ** power;
    if (at < lo || at > hi) continue;
    ticks.push({ at, label: format(at) });
  }
  return ticks;
}

/**
 * The ladder a chart draws: an explicit one passes through, a count is
 * resolved against the domain the chart computed, and log paper counts in
 * decades because a linear ladder on log paper lands on nothing.
 */
export function resolveTicks(
  spec: TickSpec | undefined,
  lo: number,
  hi: number,
  kind: ScaleKind = "linear",
  format: (value: number) => string = formatCompact,
): readonly Tick[] | undefined {
  if (spec === undefined) return undefined;
  if (typeof spec === "object") return spec;
  if (spec <= 0) return undefined;
  return kind === "log"
    ? decadeTicks(lo, hi, format)
    : niceTicks(lo, hi, spec, format);
}
