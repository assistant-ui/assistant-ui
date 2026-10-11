import { defineComponent, h, ref, watch, type VNode } from "vue";
import { dataDefinitions } from "../../vocabulary/definitions/data";
import { formatValue } from "../../vocabulary/formatValue";
import {
  isTableColumn,
  tableAlignment,
  nextTableSort,
  sortTableRows,
  type TableSort,
} from "../../vocabulary/tableData";
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
} from "../../vocabulary/chartData";
import { textChildren } from "./textChildren";

function pointTargets(
  series: NormalizedChartSeries,
  positions: number[],
  count: number,
  scale: ChartScale,
) {
  return series.values.map((value, i) =>
    h(
      "circle",
      {
        "data-aui": "chart-point",
        cx: xFor(i, count),
        cy: yFor(positions[i] ?? 0, scale),
        r: 4,
        fill: "transparent",
      },
      [h("title", tooltipText(series.label, series.labels[i], i, value))],
    ),
  );
}

function renderSeriesMarks(
  variant: ChartVariant,
  series: NormalizedChartSeries[],
  count: number,
  scale: ChartScale,
  stacked: boolean,
  color: unknown,
): VNode[] {
  const seriesCount = series.length;
  const group = (s: NormalizedChartSeries, index: number, children?: VNode[]) =>
    h(
      "g",
      {
        "data-aui": "chart-series",
        "data-aui-series": index % SERIES_PALETTE_SIZE,
        "data-aui-color": seriesColor(s, seriesCount, color),
      },
      children,
    );

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
        return h(
          "rect",
          { x, y, width: perSeriesWidth, height, fill: "currentColor" },
          [h("title", tooltipText(s.label, s.labels[i], i, value))],
        );
      });
      if (stacked) {
        for (let i = 0; i < count; i++) {
          const value = s.values[i] ?? 0;
          if (value < 0) negatives[i] = (negatives[i] ?? 0) + value;
          else positives[i] = (positives[i] ?? 0) + value;
        }
      }
      return group(s, seriesIndex, marks);
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
        return group(s, seriesIndex, [
          h("circle", {
            cx: CHART_WIDTH / 2,
            cy: yFor(tops[0] ?? 0, scale),
            r: 2,
            fill: "currentColor",
          }),
          ...pointTargets(s, tops, count, scale),
        ]);
      }
      if (count === 0) return group(s, seriesIndex);
      const topPoints = tops.map(
        (v, i) => `${xFor(i, count)},${yFor(v, scale)}`,
      );
      const bottomPoints = bottoms
        .map((v, i) => `${xFor(i, count)},${yFor(v, scale)}`)
        .reverse();
      return group(s, seriesIndex, [
        h("polygon", {
          points: [...topPoints, ...bottomPoints].join(" "),
          fill: "currentColor",
          "fill-opacity": "0.25",
        }),
        h("polyline", {
          points: topPoints.join(" "),
          fill: "none",
          stroke: "currentColor",
          "vector-effect": "non-scaling-stroke",
        }),
        ...pointTargets(s, tops, count, scale),
      ]);
    });
  }

  return series.map((s, seriesIndex) =>
    group(s, seriesIndex, [
      ...(count === 1
        ? [
            h("circle", {
              cx: CHART_WIDTH / 2,
              cy: yFor(s.values[0] ?? 0, scale),
              r: 2,
              fill: "currentColor",
            }),
          ]
        : count > 1
          ? [
              h("polyline", {
                points: s.values
                  .map((v, i) => `${xFor(i, count)},${yFor(v, scale)}`)
                  .join(" "),
                fill: "none",
                stroke: "currentColor",
                "vector-effect": "non-scaling-stroke",
              }),
            ]
          : []),
      ...(variant === "line" ? pointTargets(s, s.values, count, scale) : []),
    ]),
  );
}

export const dataVocabulary = {
  Table: {
    ...dataDefinitions.Table,
    component: defineComponent({
      name: "GenerativeUITable",
      props: ["columns", "rows", "sortable"],
      setup(props, { slots }) {
        const sort = ref<TableSort>();
        watch(
          () => props.sortable === true,
          (sortable) => {
            if (!sortable) sort.value = undefined;
          },
        );
        return () => {
          const columns: unknown[] = Array.isArray(props.columns)
            ? props.columns
            : [];
          const rows: unknown[][] = Array.isArray(props.rows)
            ? props.rows.filter(Array.isArray)
            : [];
          const sortable = props.sortable === true;
          const sortedRows =
            sortable && sort.value ? sortTableRows(rows, sort.value) : rows;
          return h("table", { "data-aui": "table" }, [
            columns.some(isTableColumn)
              ? h("thead", [
                  h(
                    "tr",
                    columns.map((column, i) => {
                      const label = isTableColumn(column) ? column.label : "";
                      const direction =
                        sortable && sort.value?.column === i
                          ? sort.value.direction
                          : undefined;
                      return h(
                        "th",
                        {
                          "data-aui": "table-col",
                          "data-aui-align": tableAlignment(column),
                          "aria-sort": direction,
                        },
                        sortable
                          ? [
                              h(
                                "button",
                                {
                                  type: "button",
                                  "data-aui": "table-sort",
                                  onClick: () => {
                                    sort.value = nextTableSort(sort.value, i);
                                  },
                                },
                                [
                                  label,
                                  ...(direction
                                    ? [
                                        h(
                                          "span",
                                          {
                                            "aria-hidden": "true",
                                            "data-aui": "table-sort-direction",
                                          },
                                          direction === "ascending" ? "↑" : "↓",
                                        ),
                                      ]
                                    : []),
                                ],
                              ),
                            ]
                          : label,
                      );
                    }),
                  ),
                ])
              : null,
            rows.length
              ? h(
                  "tbody",
                  sortedRows.map((row) =>
                    h(
                      "tr",
                      row.map((cell, c) =>
                        h(
                          "td",
                          { "data-aui-align": tableAlignment(columns[c]) },
                          formatValue(
                            cell,
                            isTableColumn(columns[c])
                              ? columns[c].format
                              : undefined,
                          ),
                        ),
                      ),
                    ),
                  ),
                )
              : null,
            ...(slots.default?.() ?? []),
          ]);
        };
      },
    }),
  },
  Markdown: {
    ...dataDefinitions.Markdown,
    component: defineComponent({
      name: "GenerativeUIMarkdown",
      props: ["value"],
      setup(props, { slots }) {
        return () =>
          h("div", { "data-aui": "markdown" }, [
            ...textChildren(props.value),
            ...(slots.default?.() ?? []),
          ]);
      },
    }),
  },
  Chart: {
    ...dataDefinitions.Chart,
    component: defineComponent({
      name: "GenerativeUIChart",
      props: [
        "variant",
        "data",
        "series",
        "stacked",
        "showAxis",
        "showLegend",
        "color",
      ],
      setup(props) {
        return () => {
          const variant = props.variant as ChartVariant;
          const data = props.data as
            | { value?: number; label?: string }[]
            | undefined;
          const color = props.color;
          const usesExtendedFeatures =
            variant === "area" ||
            !!props.stacked ||
            !!props.showAxis ||
            !!props.showLegend ||
            (Array.isArray(props.series) && props.series.length > 0);
          const svgProps = (count: number) => ({
            "data-aui": "chart",
            "data-aui-variant": variant,
            "data-aui-color": color,
            role: "img",
            "aria-label": `${variant} chart with ${count} data points`,
            viewBox: `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`,
            preserveAspectRatio: "none",
          });
          const zeroLine = (scale: ChartScale) =>
            h("line", {
              "data-aui": "chart-zero",
              x1: 0,
              x2: CHART_WIDTH,
              y1: yFor(0, scale),
              y2: yFor(0, scale),
              stroke: "currentColor",
              "vector-effect": "non-scaling-stroke",
            });

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
            return h("svg", svgProps(n), [
              ...(scale.min < 0 && scale.max > 0 ? [zeroLine(scale)] : []),
              ...(variant === "bar"
                ? values.map((value, i) => {
                    const { y, height } = barGeometry(value, 0, scale);
                    return h(
                      "rect",
                      {
                        x: i * slot + gap / 2,
                        y,
                        width: barWidth,
                        height,
                        fill: "currentColor",
                      },
                      [
                        h(
                          "title",
                          tooltipText(
                            undefined,
                            chartSeries.labels[i],
                            i,
                            value,
                          ),
                        ),
                      ],
                    );
                  })
                : n === 1
                  ? [
                      h("circle", {
                        cx: CHART_WIDTH / 2,
                        cy: yFor(values[0] ?? 0, scale),
                        r: 2,
                        fill: "currentColor",
                      }),
                      ...(variant === "line"
                        ? pointTargets(chartSeries, values, n, scale)
                        : []),
                    ]
                  : n > 1
                    ? [
                        h("polyline", {
                          points: values
                            .map(
                              (value, i) =>
                                `${xFor(i, n)},${yFor(value, scale)}`,
                            )
                            .join(" "),
                          fill: "none",
                          stroke: "currentColor",
                        }),
                        ...(variant === "line"
                          ? pointTargets(chartSeries, values, n, scale)
                          : []),
                      ]
                    : []),
            ]);
          }

          const { count, series } = normalizeSeries(props.series, data);
          const stacked =
            !!props.stacked && (variant === "bar" || variant === "area");
          const rawScale = computeScale(series, count, stacked);
          const scale = props.showAxis ? axisScale(rawScale) : rawScale;
          const svg = h("svg", svgProps(count), [
            ...(rawScale.min < 0 && rawScale.max > 0 ? [zeroLine(scale)] : []),
            ...renderSeriesMarks(variant, series, count, scale, stacked, color),
          ]);
          if (!props.showAxis && !props.showLegend) return svg;
          return h("div", { "data-aui": "chart-frame" }, [
            props.showAxis
              ? h(
                  "div",
                  { "data-aui": "chart-ticks" },
                  tickValues(scale).map((tick) => h("div", formatTick(tick))),
                )
              : null,
            svg,
            props.showAxis
              ? h(
                  "div",
                  { "data-aui": "chart-xlabels" },
                  (series[0]?.labels ?? []).map((label) =>
                    h("div", label ?? ""),
                  ),
                )
              : null,
            props.showLegend
              ? h(
                  "div",
                  { "data-aui": "chart-legend" },
                  series.map((s, i) =>
                    h(
                      "span",
                      {
                        "data-aui": "chart-legend-item",
                        "data-aui-series": i % SERIES_PALETTE_SIZE,
                        "data-aui-color": seriesColor(s, series.length, color),
                      },
                      [
                        h("span", { "data-aui": "chart-legend-swatch" }),
                        s.label ?? `Series ${i + 1}`,
                      ],
                    ),
                  ),
                )
              : null,
          ]);
        };
      },
    }),
  },
};
