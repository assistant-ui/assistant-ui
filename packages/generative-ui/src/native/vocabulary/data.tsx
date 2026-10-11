import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Color } from "../../ir";
import type { GenerativeUILibrary } from "../../types";
import {
  CHART_HEIGHT,
  axisScale,
  barGeometry,
  computeScale,
  formatTick,
  normalizeSeries,
  seriesColor,
  tickValues,
  tooltipText,
} from "../../vocabulary/chartData";
import { dataDefinitions } from "../../vocabulary/definitions/data";
import { formatValue } from "../../vocabulary/formatValue";
import {
  isTableColumn,
  nextTableSort,
  sortTableRows,
  tableAlignment,
  type TableSort,
} from "../../vocabulary/tableData";
import { toTextContent } from "../../vocabulary/toTextContent";
import {
  fade,
  FONT_WEIGHT,
  RADIUS,
  TEXT_SIZE,
  textColor,
  useInk,
  useNativeTheme,
} from "../theme";

const styles = StyleSheet.create({
  table: { alignSelf: "flex-start" },
  row: { flexDirection: "row", borderBottomWidth: 1 },
  lastRow: { borderBottomWidth: 0 },
  cell: { width: 120, paddingVertical: 8, paddingHorizontal: 12 },
  sortableCell: { minHeight: 40 },
  header: { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  body: { fontSize: 14, fontVariant: ["tabular-nums"] },
  markdown: { fontSize: TEXT_SIZE.md },
  chart: { width: "100%", position: "relative", overflow: "hidden" },
  bar: {
    position: "absolute",
    borderTopLeftRadius: RADIUS.control / 2,
    borderTopRightRadius: RADIUS.control / 2,
  },
  baseline: { position: "absolute", left: 0, right: 0, height: 1 },
  chartRow: { flexDirection: "row", alignItems: "stretch", gap: 4 },
  ticks: { justifyContent: "space-between", alignItems: "flex-end" },
  tick: { fontSize: 11 },
  xLabels: { flexDirection: "row" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  legendLabel: { fontSize: 12 },
});

type TableProps = {
  columns?: { label: string; align?: "start" | "end"; format?: unknown }[];
  rows?: (string | number | boolean)[][];
  sortable?: boolean;
  children?: ReactNode;
};

function TableView({
  columns,
  rows,
  children,
  sort,
  onSort,
}: TableProps & {
  sort?: TableSort | undefined;
  onSort?: (column: number) => void;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows.filter(Array.isArray) : [];
  const shownRows = sort ? sortTableRows(safeRows, sort) : safeRows;
  return (
    <ScrollView horizontal>
      <View style={styles.table}>
        {safeColumns.some(isTableColumn) ? (
          <View style={[styles.row, { borderBottomColor: theme.hairline }]}>
            {safeColumns.map((column, index) => {
              const label = isTableColumn(column) ? column.label : "";
              const direction =
                sort?.column === index ? sort.direction : undefined;
              const heading = (
                <Text
                  style={[
                    styles.header,
                    {
                      color: fade(ink, 0.62),
                      textAlign:
                        tableAlignment(column) === "end" ? "right" : "left",
                    },
                  ]}
                >
                  {label}
                  {direction === "ascending"
                    ? "↑"
                    : direction === "descending"
                      ? "↓"
                      : ""}
                </Text>
              );
              return onSort ? (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${direction ? `sorted ${direction}` : "not sorted"}`}
                  onPress={() => onSort(index)}
                  style={[styles.cell, styles.sortableCell]}
                >
                  {heading}
                </Pressable>
              ) : (
                <View key={index} style={styles.cell}>
                  {heading}
                </View>
              );
            })}
          </View>
        ) : null}
        {shownRows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            testID="table-row"
            style={[
              styles.row,
              rowIndex === shownRows.length - 1 && styles.lastRow,
              { borderBottomColor: theme.hairline },
            ]}
          >
            {row.map((cell, columnIndex) => (
              <View key={columnIndex} style={styles.cell}>
                <Text
                  testID="table-cell"
                  accessibilityLabel={
                    isTableColumn(safeColumns[columnIndex]) &&
                    safeColumns[columnIndex].label
                      ? `${safeColumns[columnIndex].label}: ${formatValue(cell, safeColumns[columnIndex].format)}`
                      : undefined
                  }
                  style={[
                    styles.body,
                    {
                      color: ink,
                      textAlign:
                        tableAlignment(safeColumns[columnIndex]) === "end"
                          ? "right"
                          : "left",
                    },
                  ]}
                >
                  {formatValue(
                    cell,
                    isTableColumn(safeColumns[columnIndex])
                      ? safeColumns[columnIndex].format
                      : undefined,
                  )}
                </Text>
              </View>
            ))}
          </View>
        ))}
        {children}
      </View>
    </ScrollView>
  );
}

function SortableTable(props: TableProps) {
  const [sort, setSort] = useState<TableSort | undefined>();
  return (
    <TableView
      {...props}
      sort={sort}
      onSort={(column) => setSort((current) => nextTableSort(current, column))}
    />
  );
}

function Table(props: TableProps) {
  return props.sortable ? (
    <SortableTable {...props} />
  ) : (
    <TableView {...props} />
  );
}

function Markdown({
  value,
  children,
}: {
  value?: string;
  children?: ReactNode;
}) {
  const ink = useInk();
  return (
    <View>
      <Text style={[styles.markdown, { color: ink }]}>
        {toTextContent(value)}
      </Text>
      {children}
    </View>
  );
}

type ChartProps = {
  variant: "bar" | "line" | "sparkline" | "area";
  data?: { label?: string; value: number }[];
  series?: {
    label?: string;
    color?: string;
    data: { label?: string; value: number }[];
  }[];
  stacked?: boolean;
  showAxis?: boolean;
  showLegend?: boolean;
  color?: string;
};

const COLOR_TOKENS: readonly Color[] = [
  "emphasis",
  "secondary",
  "alpha-70",
  "white",
  "white-70",
  "white-50",
];

function Chart({
  variant,
  data,
  series: seriesProp,
  stacked,
  showAxis,
  showLegend,
  color,
}: ChartProps) {
  const theme = useNativeTheme();
  const ink = useInk();
  const { count, series } = normalizeSeries(seriesProp, data);
  const isSparkline = variant === "sparkline";
  const hasAxis = !!showAxis && !isSparkline;
  const hasLegend = !isSparkline && !!showLegend;
  const isStacked = !!stacked && (variant === "bar" || variant === "area");
  const rawScale = computeScale(series, count, isStacked);
  const scale = hasAxis ? axisScale(rawScale) : rawScale;
  const height = hasAxis ? 104 : isSparkline ? 40 : 48;
  const factor = height / CHART_HEIGHT;
  const slot = count > 0 ? 100 / count : 0;
  const groupWidth = slot * 0.8;
  const barWidth = isStacked ? groupWidth : groupWidth / series.length;
  const positives = new Array<number>(count).fill(0);
  const negatives = new Array<number>(count).fill(0);
  const marks = series.flatMap((item, seriesIndex) => {
    const token = seriesColor(item, series.length, color);
    const fill = COLOR_TOKENS.includes(token as Color)
      ? textColor(token as Color, ink, theme)
      : theme.chart[seriesIndex % theme.chart.length]!;
    const result = item.values.map((value, pointIndex) => {
      const start = isStacked
        ? value < 0
          ? negatives[pointIndex]!
          : positives[pointIndex]!
        : 0;
      const { y, height: barHeight } = barGeometry(value, start, scale);
      const left =
        pointIndex * slot +
        slot * 0.1 +
        (isStacked ? 0 : seriesIndex * barWidth);
      return (
        <View
          key={`${seriesIndex}-${pointIndex}`}
          testID="chart-bar"
          accessible
          accessibilityRole="image"
          accessibilityLabel={tooltipText(
            item.label,
            item.labels[pointIndex],
            pointIndex,
            value,
          )}
          style={[
            styles.bar,
            {
              left: `${left}%`,
              width: `${barWidth}%`,
              top: y * factor,
              height: barHeight * factor,
              backgroundColor: fill,
            },
          ]}
        />
      );
    });
    if (isStacked)
      item.values.forEach((value, index) => {
        if (value < 0) negatives[index] = (negatives[index] ?? 0) + value;
        else positives[index] = (positives[index] ?? 0) + value;
      });
    return result;
  });
  const plot = (
    <View style={[styles.chart, { height }]}>
      {rawScale.min < 0 && rawScale.max > 0 ? (
        <View
          testID="chart-baseline"
          style={[
            styles.baseline,
            {
              top: barGeometry(0, 0, scale).y * factor,
              backgroundColor: fade(ink, 0.5),
            },
          ]}
        />
      ) : null}
      {marks}
    </View>
  );
  return (
    <View>
      <View style={styles.chartRow}>
        {hasAxis ? (
          <View style={[styles.ticks, { height }]}>
            {tickValues(scale).map((tick, index) => (
              <Text
                key={index}
                testID="chart-tick"
                style={[styles.tick, { color: fade(ink, 0.62) }]}
              >
                {formatTick(tick)}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {plot}
          {hasAxis ? (
            <View style={styles.xLabels}>
              {series[0]?.labels.map((label, index) => (
                <Text
                  key={index}
                  testID="chart-x-label"
                  style={[
                    styles.tick,
                    { flex: 1, textAlign: "center", color: fade(ink, 0.62) },
                  ]}
                >
                  {label ?? ""}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      {hasLegend ? (
        <View testID="chart-legend" style={styles.legend}>
          {series.map((item, index) => {
            const token = seriesColor(item, series.length, color);
            const fill = COLOR_TOKENS.includes(token as Color)
              ? textColor(token as Color, ink, theme)
              : theme.chart[index % theme.chart.length]!;
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: fill }]} />
                <Text style={[styles.legendLabel, { color: fade(ink, 0.62) }]}>
                  {item.label ?? `Series ${index + 1}`}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export const dataVocabulary = {
  Table: { ...dataDefinitions.Table, render: (props) => <Table {...props} /> },
  Markdown: {
    ...dataDefinitions.Markdown,
    render: (props) => <Markdown {...props} />,
  },
  Chart: { ...dataDefinitions.Chart, render: (props) => <Chart {...props} /> },
} satisfies GenerativeUILibrary;
