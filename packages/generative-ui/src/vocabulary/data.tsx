import * as React from "react";
import type { GenerativeUILibrary } from "../types";
import { dataDefinitions } from "./definitions/data";
import { formatValue } from "./formatValue";
import {
  isTableColumn,
  tableAlignment,
  nextTableSort,
  sortTableRows,
  type TableSort,
} from "./tableData";
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  SERIES_PALETTE_SIZE,
  clampValue,
  yFor,
  normalizeSeries,
  valueScale,
  computeScale,
  axisScale,
  tickValues,
  formatTick,
  tooltipText,
  seriesColor,
  xFor,
  barGeometry,
  type ChartScale,
  type NormalizedChartSeries,
  type ChartVariant,
} from "./chartData";
import { toTextContent } from "./toTextContent";

type TableViewProps = {
  columns: unknown;
  rows: unknown;
  children: React.ReactNode;
  sort?: TableSort | undefined;
  onSort?: ((column: number) => void) | undefined;
};

function TableView({ columns, rows, children, sort, onSort }: TableViewProps) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const hasColumns = safeColumns.some(isTableColumn);
  const safeRows = Array.isArray(rows) ? rows.filter(Array.isArray) : [];
  const sortedRows =
    sort === undefined ? safeRows : sortTableRows(safeRows, sort);

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
  const [sort, setSort] = React.useState<TableSort | undefined>();
  return (
    <TableView
      {...props}
      sort={sort}
      onSort={(column) => setSort((current) => nextTableSort(current, column))}
    />
  );
}

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
    ...dataDefinitions.Table,
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
    ...dataDefinitions.Markdown,
    render: ({ value, children }) => (
      <div data-aui="markdown">
        {toTextContent(value)}
        {children}
      </div>
    ),
  },
  Chart: {
    ...dataDefinitions.Chart,
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
