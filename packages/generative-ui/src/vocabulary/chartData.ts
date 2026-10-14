export const CHART_HEIGHT = 40;
export const CHART_WIDTH = 100;

export const clampValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export type ChartScale = { min: number; max: number };

export const yFor = (value: number, scale: ChartScale): number => {
  const span = scale.max - scale.min;
  return span > 0
    ? CHART_HEIGHT - ((value - scale.min) / span) * CHART_HEIGHT
    : CHART_HEIGHT;
};

type ChartPoint = { label?: string | undefined; value: number };
type ChartSeriesInput = {
  label?: string | undefined;
  color?: string | undefined;
  data?: ChartPoint[] | undefined;
};
export type NormalizedChartSeries = {
  label: string | undefined;
  color: string | undefined;
  values: number[];
  labels: (string | undefined)[];
};

/** Pads every series to the longest series' length, treating a shorter series' missing points as `{ value: 0 }` so mismatched series never misalign or throw. */
export function normalizeSeries(
  seriesProp: unknown,
  dataProp: unknown,
): { count: number; series: NormalizedChartSeries[] } {
  const rawSeries: ChartSeriesInput[] =
    Array.isArray(seriesProp) && seriesProp.length > 0
      ? (seriesProp as ChartSeriesInput[])
      : [{ data: Array.isArray(dataProp) ? (dataProp as ChartPoint[]) : [] }];

  const count = rawSeries.reduce((max, s) => {
    const len = Array.isArray(s?.data) ? s.data.length : 0;
    return Math.max(max, len);
  }, 0);

  const series = rawSeries.map((s) => {
    const points = Array.isArray(s?.data) ? s.data : [];
    const values: number[] = [];
    const labels: (string | undefined)[] = [];
    for (let i = 0; i < count; i++) {
      const point = points[i];
      values.push(clampValue(point?.value));
      labels.push(typeof point?.label === "string" ? point.label : undefined);
    }
    return {
      label: typeof s?.label === "string" ? s.label : undefined,
      color: typeof s?.color === "string" ? s.color : undefined,
      values,
      labels,
    };
  });

  return { count, series };
}

export function valueScale(values: number[]): ChartScale {
  let min = 0;
  let max = 0;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

export function computeScale(
  series: NormalizedChartSeries[],
  count: number,
  stacked: boolean,
): ChartScale {
  if (stacked) {
    let min = 0;
    let max = 0;
    for (let i = 0; i < count; i++) {
      let negative = 0;
      let positive = 0;
      for (const s of series) {
        const value = s.values[i] ?? 0;
        if (value < 0) negative += value;
        else positive += value;
      }
      min = Math.min(min, negative);
      max = Math.max(max, positive);
    }
    return { min, max };
  }
  return valueScale(series.flatMap((s) => s.values));
}

const NICE_MULTIPLES = [1, 2, 5];

/** The smallest of `{1, 2, 5} × 10^n` that is `>= max`, so axis ticks land on round numbers. */
function niceMax(max: number): number {
  if (max <= 0) return 0;
  const exponent = Math.floor(Math.log10(max));
  for (const multiple of NICE_MULTIPLES) {
    const candidate = multiple * 10 ** exponent;
    if (candidate >= max) return candidate;
  }
  return 10 ** (exponent + 1);
}

const TICK_COUNT = 5;

export function axisScale(scale: ChartScale): ChartScale {
  if (scale.min === 0) return { min: 0, max: niceMax(scale.max) };
  if (scale.max === 0) return { min: -niceMax(-scale.min), max: 0 };
  const step = niceMax(Math.max(-scale.min, scale.max) / 2);
  return { min: -2 * step, max: 2 * step };
}

/** `TICK_COUNT` evenly spaced ticks from the top of the scale down to its bottom, for a top-to-bottom y-axis column. */
export function tickValues(scale: ChartScale): number[] {
  const ticks: number[] = [];
  if (scale.min === 0) {
    for (let i = 0; i < TICK_COUNT; i++) {
      ticks.push((scale.max * (TICK_COUNT - 1 - i)) / (TICK_COUNT - 1));
    }
    return ticks;
  }
  for (let i = 0; i < TICK_COUNT; i++) {
    ticks.push(
      scale.min +
        ((scale.max - scale.min) * (TICK_COUNT - 1 - i)) / (TICK_COUNT - 1),
    );
  }
  return ticks;
}

export function formatTick(value: number): string {
  return (Math.round(value * 100) / 100).toLocaleString("en-US");
}

export type ChartVariant = "bar" | "line" | "sparkline" | "area";

export const SERIES_PALETTE_SIZE = 5;

export const tooltipText = (
  seriesLabel: string | undefined,
  pointLabel: string | undefined,
  index: number,
  value: number,
) =>
  `${seriesLabel ? `${seriesLabel}, ` : ""}${pointLabel || index + 1}: ${formatTick(value)}`;

export const seriesColor = (
  series: NormalizedChartSeries,
  seriesCount: number,
  color: unknown,
) =>
  series.color ??
  (seriesCount === 1 && typeof color === "string" ? color : undefined);

export const xFor = (index: number, count: number): number =>
  count === 1 ? CHART_WIDTH / 2 : (index / (count - 1)) * CHART_WIDTH;

export function barGeometry(value: number, start: number, scale: ChartScale) {
  const end = start + value;
  if (scale.min === 0 && start >= 0 && end >= 0) {
    const height = scale.max > 0 ? (value / scale.max) * CHART_HEIGHT : 0;
    const belowHeight = scale.max > 0 ? (start / scale.max) * CHART_HEIGHT : 0;
    return { y: CHART_HEIGHT - belowHeight - height, height };
  }
  const startY = yFor(start, scale);
  const endY = yFor(end, scale);
  return { y: Math.min(startY, endY), height: Math.abs(endY - startY) };
}
