import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

const columnSchema = z.object({
  label: z.string().describe("Column header label."),
});

const cellSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .describe("A cell value.");

const CHART_HEIGHT = 40;
const CHART_WIDTH = 100;

const clampValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;

const yFor = (value: number, max: number): number =>
  max > 0 ? CHART_HEIGHT - (value / max) * CHART_HEIGHT : CHART_HEIGHT;

const pointSchema = z.object({
  label: z.string().optional().describe("Point label."),
  value: z.number().describe("Point value."),
});

const seriesSchema = z.object({
  label: z.string().optional().describe("Series label, shown in the legend."),
  data: z.array(pointSchema).describe("Data points for this series."),
});

type ChartPoint = { label?: string; value: number };
type ChartSeriesInput = { label?: string; data: ChartPoint[] };
type NormalizedChartSeries = {
  label: string | undefined;
  values: number[];
  labels: (string | undefined)[];
};

/** Pads every series to the longest series' length, treating a shorter series' missing points as `{ value: 0 }` so mismatched series never misalign or throw. */
function normalizeSeries(
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
      values,
      labels,
    };
  });

  return { count, series };
}

function computeMax(
  series: NormalizedChartSeries[],
  count: number,
  stacked: boolean,
): number {
  if (stacked) {
    let max = 0;
    for (let i = 0; i < count; i++) {
      let sum = 0;
      for (const s of series) sum += s.values[i] ?? 0;
      max = Math.max(max, sum);
    }
    return max;
  }
  let max = 0;
  for (const s of series) for (const v of s.values) max = Math.max(max, v);
  return max;
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

/** `TICK_COUNT` evenly spaced ticks from `max` down to `0`, for a top-to-bottom y-axis column. */
function tickValues(max: number): number[] {
  const ticks: number[] = [];
  for (let i = 0; i < TICK_COUNT; i++) {
    ticks.push((max * (TICK_COUNT - 1 - i)) / (TICK_COUNT - 1));
  }
  return ticks;
}

function formatTick(value: number): string {
  return (Math.round(value * 100) / 100).toLocaleString("en-US");
}

type ChartVariant = "bar" | "line" | "sparkline" | "area";

const SERIES_PALETTE_SIZE = 5;

function renderSeriesMarks(
  variant: ChartVariant,
  series: NormalizedChartSeries[],
  count: number,
  scaleMax: number,
  stacked: boolean,
) {
  if (variant === "bar") {
    const slot = count > 0 ? CHART_WIDTH / count : 0;
    const gap = slot * 0.2;
    const groupWidth = slot - gap;
    const seriesCount = series.length;
    const perSeriesWidth =
      stacked || seriesCount <= 1 ? groupWidth : groupWidth / seriesCount;
    const cumulative = new Array(count).fill(0) as number[];

    return series.map((s, seriesIndex) => {
      const marks = s.values.map((value, i) => {
        const height = scaleMax > 0 ? (value / scaleMax) * CHART_HEIGHT : 0;
        const belowHeight =
          stacked && scaleMax > 0
            ? ((cumulative[i] ?? 0) / scaleMax) * CHART_HEIGHT
            : 0;
        const x =
          stacked || seriesCount <= 1
            ? i * slot + gap / 2
            : i * slot + gap / 2 + seriesIndex * perSeriesWidth;
        return (
          <rect
            key={i}
            x={x}
            y={CHART_HEIGHT - belowHeight - height}
            width={perSeriesWidth}
            height={height}
            fill="currentColor"
          />
        );
      });
      if (stacked) {
        for (let i = 0; i < count; i++) {
          cumulative[i] = (cumulative[i] ?? 0) + (s.values[i] ?? 0);
        }
      }
      return (
        <g
          key={seriesIndex}
          data-aui="chart-series"
          data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
        >
          {marks}
        </g>
      );
    });
  }

  if (variant === "area") {
    const cumulative = new Array(count).fill(0) as number[];

    return series.map((s, seriesIndex) => {
      const bottoms = stacked
        ? cumulative.slice()
        : (new Array(count).fill(0) as number[]);
      if (stacked) {
        for (let i = 0; i < count; i++) {
          cumulative[i] = (cumulative[i] ?? 0) + (s.values[i] ?? 0);
        }
      }
      const tops = stacked ? cumulative.slice() : s.values.slice();

      if (count === 1) {
        const y = yFor(tops[0] ?? 0, scaleMax);
        return (
          <g
            key={seriesIndex}
            data-aui="chart-series"
            data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
          >
            <circle cx={CHART_WIDTH / 2} cy={y} r={2} fill="currentColor" />
          </g>
        );
      }
      if (count === 0) {
        return (
          <g
            key={seriesIndex}
            data-aui="chart-series"
            data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
          />
        );
      }

      const topPoints = tops.map(
        (v, i) => `${(i / (count - 1)) * CHART_WIDTH},${yFor(v, scaleMax)}`,
      );
      const bottomPoints = bottoms
        .map(
          (v, i) => `${(i / (count - 1)) * CHART_WIDTH},${yFor(v, scaleMax)}`,
        )
        .reverse();

      return (
        <g
          key={seriesIndex}
          data-aui="chart-series"
          data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
        >
          <polygon
            points={[...topPoints, ...bottomPoints].join(" ")}
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
          />
        </g>
      );
    });
  }

  // line / sparkline: each series is always drawn independently. Stacking a line has no single standard meaning, so `stacked` is ignored (the caller never passes it for these variants).
  return series.map((s, seriesIndex) => (
    <g
      key={seriesIndex}
      data-aui="chart-series"
      data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
    >
      {count === 1 ? (
        <circle
          cx={CHART_WIDTH / 2}
          cy={yFor(s.values[0] ?? 0, scaleMax)}
          r={2}
          fill="currentColor"
        />
      ) : count > 1 ? (
        <polyline
          points={s.values
            .map(
              (v, i) =>
                `${(i / (count - 1)) * CHART_WIDTH},${yFor(v, scaleMax)}`,
            )
            .join(" ")}
          fill="none"
          stroke="currentColor"
        />
      ) : null}
    </g>
  ));
}

export const dataVocabulary = {
  Table: {
    description:
      "Tabular data. Provide `columns` and `rows`; each row is an array of cells matching the columns.",
    properties: z.object({
      columns: z.array(columnSchema).optional().describe("Column definitions."),
      rows: z.array(z.array(cellSchema)).optional().describe("Rows of cells."),
    }),
    render: ({ columns, rows, children }) => (
      <table data-aui="table">
        {columns?.length ? (
          <thead>
            <tr>
              {columns.map((c: { label: string }, i: number) => (
                <th key={i} data-aui="table-col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        {rows?.length ? (
          <tbody>
            {rows.map((row: (string | number | boolean)[], r: number) => (
              <tr key={r}>
                {row.map((cell: string | number | boolean, c: number) => (
                  <td key={c}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : null}
        {children}
      </table>
    ),
  },
  Markdown: {
    description:
      "A markdown string. Rendered as-is by default; override this component for a full markdown renderer.",
    properties: z.object({
      value: z.string().describe("Markdown source."),
    }),
    streamProperties: true,
    render: ({ value, children }) => (
      <div data-aui="markdown">
        {value}
        {children}
      </div>
    ),
  },
  Chart: {
    description:
      "A chart. `variant` selects bar, line, sparkline, or area rendering. Provide `data` for a single series, or `series` for multiple named series (`series` takes precedence over `data` when both are present). Set `stacked` to accumulate series values instead of overlaying them, and `showAxis`/`showLegend` to add y-axis ticks, x-axis point labels, and a legend.",
    properties: z.object({
      variant: z
        .enum(["bar", "line", "sparkline", "area"])
        .describe("Chart variant."),
      data: z
        .array(pointSchema)
        .optional()
        .describe("Data points for a single series."),
      series: z
        .array(seriesSchema)
        .optional()
        .describe(
          "Multiple named series; takes precedence over `data` when present.",
        ),
      stacked: z
        .boolean()
        .optional()
        .describe(
          "Accumulate series values instead of overlaying them (bar and area variants; ignored for line and sparkline).",
        ),
      showAxis: z
        .boolean()
        .optional()
        .describe("Show y-axis ticks and x-axis point labels."),
      showLegend: z
        .boolean()
        .optional()
        .describe("Show a legend mapping each series to its color."),
      color: z
        .string()
        .optional()
        .describe(
          "Series color (single-series mode only). One of `emphasis`, `secondary`, `alpha-70`, `white`, `white-70`, or `white-50`, matching Text's `color` tokens; other values have no visual effect.",
        ),
    }),
    render: ({
      variant,
      data,
      series,
      stacked,
      showAxis,
      showLegend,
      color,
    }) => {
      const usesExtendedFeatures =
        variant === "area" ||
        !!stacked ||
        !!showAxis ||
        !!showLegend ||
        (Array.isArray(series) && series.length > 0);

      if (!usesExtendedFeatures) {
        const points = Array.isArray(data) ? data : [];
        const n = points.length;
        const values = points.map((d) => clampValue(d?.value));
        const max = values.reduce((m, v) => Math.max(m, v), 0);
        const slot = n > 0 ? CHART_WIDTH / n : 0;
        const gap = slot * 0.2;
        const barWidth = slot - gap;

        return (
          <svg
            data-aui="chart"
            data-aui-variant={variant}
            data-aui-color={color}
            role="img"
            aria-label={`${variant} chart with ${n} data points`}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
          >
            {variant === "bar" ? (
              values.map((v, i) => {
                const height = max > 0 ? (v / max) * CHART_HEIGHT : 0;
                return (
                  <rect
                    key={i}
                    x={i * slot + gap / 2}
                    y={CHART_HEIGHT - height}
                    width={barWidth}
                    height={height}
                    fill="currentColor"
                  />
                );
              })
            ) : n === 1 ? (
              <circle
                cx={CHART_WIDTH / 2}
                cy={yFor(values[0] ?? 0, max)}
                r={2}
                fill="currentColor"
              />
            ) : n > 1 ? (
              <polyline
                points={values
                  .map(
                    (v, i) => `${(i / (n - 1)) * CHART_WIDTH},${yFor(v, max)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="currentColor"
              />
            ) : null}
          </svg>
        );
      }

      const { count, series: normalized } = normalizeSeries(series, data);
      const stackedScale =
        !!stacked && (variant === "bar" || variant === "area");
      const rawMax = computeMax(normalized, count, stackedScale);
      const scaleMax = showAxis ? niceMax(rawMax) : rawMax;
      const marks = renderSeriesMarks(
        variant,
        normalized,
        count,
        scaleMax,
        stackedScale,
      );

      const svg = (
        <svg
          data-aui="chart"
          data-aui-variant={variant}
          data-aui-color={color}
          role="img"
          aria-label={`${variant} chart with ${count} data points`}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          {marks}
        </svg>
      );

      if (!showAxis && !showLegend) return svg;

      return (
        <div data-aui="chart-frame">
          {showAxis ? (
            <div data-aui="chart-ticks">
              {tickValues(scaleMax).map((tick, i) => (
                <div key={i}>{formatTick(tick)}</div>
              ))}
            </div>
          ) : null}
          {svg}
          {showAxis ? (
            <div data-aui="chart-xlabels">
              {(normalized[0]?.labels ?? []).map((label, i) => (
                <div key={i}>{label ?? ""}</div>
              ))}
            </div>
          ) : null}
          {showLegend ? (
            <div data-aui="chart-legend">
              {normalized.map((s, i) => (
                <span
                  key={i}
                  data-aui="chart-legend-item"
                  data-aui-series={i % SERIES_PALETTE_SIZE}
                >
                  <span data-aui="chart-legend-swatch" />
                  {s.label ?? `Series ${i + 1}`}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      );
    },
  },
} satisfies GenerativeUILibrary;
