import { useState, type ReactNode } from "react";
import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { formatValue, isNumericTableFormat } from "./formatValue";
import { toTextContent } from "./toTextContent";

const columnSchema = z.object({
  label: z.string().describe("Column header label."),
  align: z.enum(["start", "end"]).optional().describe("Cell alignment."),
  format: z
    .object({
      kind: z
        .enum(["number", "currency", "percent", "date"])
        .describe(
          "Format kind. `percent` takes a fraction, so 0.25 renders as 25%.",
        ),
      currency: z.string().optional().describe("Currency code."),
      decimals: z.number().optional().describe("Decimal places."),
    })
    .optional()
    .describe("Cell value format."),
});

const cellSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .describe("A cell value.");

type TableColumn = {
  label: string;
  align?: "start" | "end";
  format?: unknown;
};
type TableCell = string | number | boolean;

type TableSort = { column: number; direction: "ascending" | "descending" };

const tableCollator = new Intl.Collator("en-US", { numeric: true });

const isTableColumn = (column: unknown): column is TableColumn =>
  column !== null &&
  typeof column === "object" &&
  "label" in column &&
  typeof column.label === "string";

const isTableCell = (cell: unknown): cell is TableCell =>
  typeof cell === "string" ||
  typeof cell === "number" ||
  typeof cell === "boolean";

const tableAlignment = (column: unknown): "start" | "end" | undefined => {
  if (!isTableColumn(column)) return undefined;
  if (column.align === "start" || column.align === "end") return column.align;
  return isNumericTableFormat(column.format) ? "end" : undefined;
};

const compareTableCells = (left: unknown, right: unknown): number => {
  if (
    typeof left === "number" &&
    Number.isFinite(left) &&
    typeof right === "number" &&
    Number.isFinite(right)
  ) {
    return left - right;
  }
  if (typeof left === "number" && Number.isFinite(left)) return -1;
  if (typeof right === "number" && Number.isFinite(right)) return 1;
  return tableCollator.compare(
    isTableCell(left) ? String(left) : "",
    isTableCell(right) ? String(right) : "",
  );
};

type TableViewProps = {
  columns: unknown;
  rows: unknown;
  children: ReactNode;
  sort?: TableSort | undefined;
  onSort?: ((column: number) => void) | undefined;
};

function TableView({ columns, rows, children, sort, onSort }: TableViewProps) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const hasColumns = safeColumns.some(isTableColumn);
  const safeRows = Array.isArray(rows) ? rows.filter(Array.isArray) : [];
  const sortedRows =
    sort === undefined
      ? safeRows
      : safeRows
          .map((row, index) => ({ row, index }))
          .sort((left, right) => {
            const comparison = compareTableCells(
              left.row[sort.column],
              right.row[sort.column],
            );
            return comparison === 0
              ? left.index - right.index
              : sort.direction === "ascending"
                ? comparison
                : -comparison;
          })
          .map(({ row }) => row);

  return (
    <table data-aui="table">
      {hasColumns ? (
        <thead>
          <tr>
            {safeColumns.map((column, i) => {
              const label = isTableColumn(column) ? column.label : "";
              const direction = sort?.column === i ? sort.direction : undefined;
              return (
                <th
                  key={i}
                  data-aui="table-col"
                  data-aui-align={tableAlignment(column)}
                  aria-sort={direction}
                >
                  {onSort ? (
                    <button
                      type="button"
                      data-aui="table-sort"
                      onClick={() => onSort(i)}
                    >
                      {label}
                      {direction ? (
                        <span
                          aria-hidden="true"
                          data-aui="table-sort-direction"
                        >
                          {direction === "ascending" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
      ) : null}
      {safeRows.length ? (
        <tbody>
          {sortedRows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} data-aui-align={tableAlignment(safeColumns[c])}>
                  {formatValue(
                    cell,
                    isTableColumn(safeColumns[c])
                      ? safeColumns[c].format
                      : undefined,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ) : null}
      {children}
    </table>
  );
}

function SortableTable(props: Omit<TableViewProps, "sort" | "onSort">) {
  const [sort, setSort] = useState<TableSort | undefined>();
  return (
    <TableView
      {...props}
      sort={sort}
      onSort={(column) =>
        setSort((current) =>
          current?.column !== column
            ? { column, direction: "ascending" }
            : current.direction === "ascending"
              ? { column, direction: "descending" }
              : undefined,
        )
      }
    />
  );
}

const CHART_HEIGHT = 40;
const CHART_WIDTH = 100;

const clampValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

type ChartScale = { min: number; max: number };

const yFor = (value: number, scale: ChartScale): number => {
  const span = scale.max - scale.min;
  return span > 0
    ? CHART_HEIGHT - ((value - scale.min) / span) * CHART_HEIGHT
    : CHART_HEIGHT;
};

const pointSchema = z.object({
  label: z.string().optional().describe("Point label."),
  value: z.number().describe("Point value."),
});

const seriesSchema = z.object({
  label: z.string().optional().describe("Series label, shown in the legend."),
  color: z
    .string()
    .optional()
    .describe(
      "Series color. One of `emphasis`, `secondary`, `alpha-70`, `white`, `white-70`, or `white-50`, matching Text's `color` tokens; other values have no visual effect.",
    ),
  data: z.array(pointSchema).describe("Data points for this series."),
});

type ChartPoint = { label?: string | undefined; value: number };
type ChartSeriesInput = {
  label?: string | undefined;
  color?: string | undefined;
  data?: ChartPoint[] | undefined;
};
type NormalizedChartSeries = {
  label: string | undefined;
  color: string | undefined;
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
      color: typeof s?.color === "string" ? s.color : undefined,
      values,
      labels,
    };
  });

  return { count, series };
}

function valueScale(values: number[]): ChartScale {
  let min = 0;
  let max = 0;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function computeScale(
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

function axisScale(scale: ChartScale): ChartScale {
  if (scale.min === 0) return { min: 0, max: niceMax(scale.max) };
  if (scale.max === 0) return { min: -niceMax(-scale.min), max: 0 };
  const step = niceMax(Math.max(-scale.min, scale.max) / 2);
  return { min: -2 * step, max: 2 * step };
}

/** `TICK_COUNT` evenly spaced ticks from the top of the scale down to its bottom, for a top-to-bottom y-axis column. */
function tickValues(scale: ChartScale): number[] {
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

function formatTick(value: number): string {
  return (Math.round(value * 100) / 100).toLocaleString("en-US");
}

type ChartVariant = "bar" | "line" | "sparkline" | "area";

const SERIES_PALETTE_SIZE = 5;

const tooltipText = (
  seriesLabel: string | undefined,
  pointLabel: string | undefined,
  index: number,
  value: number,
) =>
  `${seriesLabel ? `${seriesLabel}, ` : ""}${pointLabel || index + 1}: ${formatTick(value)}`;

const seriesColor = (
  series: NormalizedChartSeries,
  seriesCount: number,
  color: unknown,
) =>
  series.color ??
  (seriesCount === 1 && typeof color === "string" ? color : undefined);

const xFor = (index: number, count: number): number =>
  count === 1 ? CHART_WIDTH / 2 : (index / (count - 1)) * CHART_WIDTH;

function pointTargets(
  series: NormalizedChartSeries,
  positions: number[],
  count: number,
  scale: ChartScale,
) {
  return series.values.map((value, i) => (
    <circle
      key={i}
      data-aui="chart-point"
      cx={xFor(i, count)}
      cy={yFor(positions[i] ?? 0, scale)}
      r={4}
      fill="transparent"
    >
      <title>{tooltipText(series.label, series.labels[i], i, value)}</title>
    </circle>
  ));
}

function barGeometry(value: number, start: number, scale: ChartScale) {
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

function renderSeriesMarks(
  variant: ChartVariant,
  series: NormalizedChartSeries[],
  count: number,
  scale: ChartScale,
  stacked: boolean,
  color: unknown,
) {
  const seriesCount = series.length;

  if (variant === "bar") {
    const slot = count > 0 ? CHART_WIDTH / count : 0;
    const gap = slot * 0.2;
    const groupWidth = slot - gap;
    const perSeriesWidth =
      stacked || seriesCount <= 1 ? groupWidth : groupWidth / seriesCount;
    const negatives = new Array(count).fill(0) as number[];
    const positives = new Array(count).fill(0) as number[];

    return series.map((s, seriesIndex) => {
      const marks = s.values.map((value, i) => {
        const start = stacked
          ? value < 0
            ? (negatives[i] ?? 0)
            : (positives[i] ?? 0)
          : 0;
        const { y, height } = barGeometry(value, start, scale);
        const x =
          stacked || seriesCount <= 1
            ? i * slot + gap / 2
            : i * slot + gap / 2 + seriesIndex * perSeriesWidth;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={perSeriesWidth}
            height={height}
            fill="currentColor"
          >
            <title>{tooltipText(s.label, s.labels[i], i, value)}</title>
          </rect>
        );
      });
      if (stacked) {
        for (let i = 0; i < count; i++) {
          const value = s.values[i] ?? 0;
          if (value < 0) negatives[i] = (negatives[i] ?? 0) + value;
          else positives[i] = (positives[i] ?? 0) + value;
        }
      }
      return (
        <g
          key={seriesIndex}
          data-aui="chart-series"
          data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
          data-aui-color={seriesColor(s, seriesCount, color)}
        >
          {marks}
        </g>
      );
    });
  }

  if (variant === "area") {
    const negatives = new Array(count).fill(0) as number[];
    const positives = new Array(count).fill(0) as number[];

    return series.map((s, seriesIndex) => {
      const bottoms = s.values.map((value, i) =>
        stacked ? (value < 0 ? (negatives[i] ?? 0) : (positives[i] ?? 0)) : 0,
      );
      const tops = s.values.map((value, i) =>
        stacked ? (bottoms[i] ?? 0) + value : value,
      );
      if (stacked) {
        for (let i = 0; i < count; i++) {
          const value = s.values[i] ?? 0;
          if (value < 0) negatives[i] = (negatives[i] ?? 0) + value;
          else positives[i] = (positives[i] ?? 0) + value;
        }
      }

      if (count === 1) {
        const y = yFor(tops[0] ?? 0, scale);
        return (
          <g
            key={seriesIndex}
            data-aui="chart-series"
            data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
            data-aui-color={seriesColor(s, seriesCount, color)}
          >
            <circle cx={CHART_WIDTH / 2} cy={y} r={2} fill="currentColor" />
            {pointTargets(s, tops, count, scale)}
          </g>
        );
      }
      if (count === 0) {
        return (
          <g
            key={seriesIndex}
            data-aui="chart-series"
            data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
            data-aui-color={seriesColor(s, seriesCount, color)}
          />
        );
      }

      const topPoints = tops.map(
        (v, i) => `${xFor(i, count)},${yFor(v, scale)}`,
      );
      const bottomPoints = bottoms
        .map((v, i) => `${xFor(i, count)},${yFor(v, scale)}`)
        .reverse();

      return (
        <g
          key={seriesIndex}
          data-aui="chart-series"
          data-aui-series={seriesIndex % SERIES_PALETTE_SIZE}
          data-aui-color={seriesColor(s, seriesCount, color)}
        >
          <polygon
            points={[...topPoints, ...bottomPoints].join(" ")}
            fill="currentColor"
            fillOpacity="0.25"
          />
          <polyline
            points={topPoints.join(" ")}
            fill="none"
            stroke="currentColor"
            vectorEffect="non-scaling-stroke"
          />
          {pointTargets(s, tops, count, scale)}
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
      data-aui-color={seriesColor(s, series.length, color)}
    >
      {count === 1 ? (
        <circle
          cx={CHART_WIDTH / 2}
          cy={yFor(s.values[0] ?? 0, scale)}
          r={2}
          fill="currentColor"
        />
      ) : count > 1 ? (
        <polyline
          points={s.values
            .map((v, i) => `${xFor(i, count)},${yFor(v, scale)}`)
            .join(" ")}
          fill="none"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {variant === "line" ? pointTargets(s, s.values, count, scale) : null}
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
      sortable: z.boolean().optional().describe("Allow header sorting."),
    }),
    render: ({ columns, rows, sortable, children }) =>
      sortable === true ? (
        <SortableTable columns={columns} rows={rows}>
          {children}
        </SortableTable>
      ) : (
        <TableView columns={columns} rows={rows}>
          {children}
        </TableView>
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
        {toTextContent(value)}
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
        const scale = valueScale(values);
        const chartSeries: NormalizedChartSeries = {
          label: undefined,
          color: undefined,
          values,
          labels: points.map((point) =>
            typeof point?.label === "string" ? point.label : undefined,
          ),
        };
        const slot = n > 0 ? CHART_WIDTH / n : 0;
        const gap = slot * 0.2;
        const barWidth = slot - gap;
        const crossesZero = scale.min < 0 && scale.max > 0;

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
            {crossesZero ? (
              <line
                data-aui="chart-zero"
                x1={0}
                x2={CHART_WIDTH}
                y1={yFor(0, scale)}
                y2={yFor(0, scale)}
                stroke="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {variant === "bar" ? (
              values.map((v, i) => {
                const { y, height } = barGeometry(v, 0, scale);
                return (
                  <rect
                    key={i}
                    x={i * slot + gap / 2}
                    y={y}
                    width={barWidth}
                    height={height}
                    fill="currentColor"
                  >
                    <title>
                      {tooltipText(undefined, chartSeries.labels[i], i, v)}
                    </title>
                  </rect>
                );
              })
            ) : n === 1 ? (
              <>
                <circle
                  cx={CHART_WIDTH / 2}
                  cy={yFor(values[0] ?? 0, scale)}
                  r={2}
                  fill="currentColor"
                />
                {variant === "line"
                  ? pointTargets(chartSeries, values, n, scale)
                  : null}
              </>
            ) : n > 1 ? (
              <>
                <polyline
                  points={values
                    .map((v, i) => `${xFor(i, n)},${yFor(v, scale)}`)
                    .join(" ")}
                  fill="none"
                  stroke="currentColor"
                />
                {variant === "line"
                  ? pointTargets(chartSeries, values, n, scale)
                  : null}
              </>
            ) : null}
          </svg>
        );
      }

      const { count, series: normalized } = normalizeSeries(series, data);
      const stackedScale =
        !!stacked && (variant === "bar" || variant === "area");
      const rawScale = computeScale(normalized, count, stackedScale);
      const scale = showAxis ? axisScale(rawScale) : rawScale;
      const marks = renderSeriesMarks(
        variant,
        normalized,
        count,
        scale,
        stackedScale,
        color,
      );
      const crossesZero = rawScale.min < 0 && rawScale.max > 0;

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
          {crossesZero ? (
            <line
              data-aui="chart-zero"
              x1={0}
              x2={CHART_WIDTH}
              y1={yFor(0, scale)}
              y2={yFor(0, scale)}
              stroke="currentColor"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {marks}
        </svg>
      );

      if (!showAxis && !showLegend) return svg;

      return (
        <div data-aui="chart-frame">
          {showAxis ? (
            <div data-aui="chart-ticks">
              {tickValues(scale).map((tick, i) => (
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
                  data-aui-color={seriesColor(s, normalized.length, color)}
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
