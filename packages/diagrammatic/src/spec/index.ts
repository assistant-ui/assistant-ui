import {
  createElement,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from "react";
import { formatCompact } from "../core/types";
import * as charts from "../index";
import type {
  AreaProps,
  ArcDiagramProps,
  BarProps,
  BeeswarmProps,
  BoxPlotProps,
  BulletProps,
  BumpProps,
  CandlestickProps,
  ChordProps,
  ChoroplethProps,
  CirclePackingProps,
  ColumnProps,
  ConnectedScatterProps,
  ContourProps,
  DendrogramProps,
  DifferenceAreaProps,
  DivergingBarProps,
  DivergingStackedProps,
  DotMapProps,
  DotPlotProps,
  DumbbellProps,
  FlowMapProps,
  FunnelProps,
  GanttProps,
  GaugeProps,
  GroupedBarProps,
  HeatmapProps,
  HexbinProps,
  HistogramProps,
  HorizonProps,
  IcicleProps,
  LeaderboardProps,
  LineProps,
  LollipopProps,
  MarimekkoProps,
  MirroredAreaProps,
  NetworkProps,
  ParallelCoordinatesProps,
  PictogramProps,
  PieProps,
  PolarAreaProps,
  PopulationPyramidProps,
  ProgressRingProps,
  QuadrantProps,
  RadarProps,
  RadialBarProps,
  RidgelineProps,
  SankeyProps,
  ScatterProps,
  SlopeProps,
  SparkbarProps,
  SparklineProps,
  SplitBarProps,
  StackedAreaProps,
  StackedBarProps,
  StreamgraphProps,
  StripPlotProps,
  SunburstProps,
  SymbolMapProps,
  TreemapProps,
  TreeProps,
  VennProps,
  ViolinProps,
  WaffleProps,
  WaterfallProps,
  WinLossProps,
} from "../index";

export type Unit = "percent" | "compact" | "none";

type Common = {
  /** Persistence identifier for the spec shape, not the npm version. */
  v?: "dg/1";
  unit?: Unit;
};

/**
 * A spec is JSON: the svg prop surface (event handlers, style, refs) and the
 * format function stay out; `title` survives because it names the chart.
 */
type Strip<P> = Omit<
  P,
  "format" | keyof Omit<ComponentPropsWithoutRef<"svg">, "children">
> & { title?: string };
type S<T extends string, P> = Common & { type: T } & Strip<P>;

export type ChartSpec =
  | S<"line", LineProps>
  | S<"area", AreaProps>
  | S<"stacked-area", StackedAreaProps>
  | S<"streamgraph", StreamgraphProps>
  | S<"mirrored-area", MirroredAreaProps>
  | S<"slope", SlopeProps>
  | S<"bump", BumpProps>
  | S<"candlestick", CandlestickProps>
  | S<"horizon", HorizonProps>
  | S<"gantt", GanttProps>
  | S<"bar", BarProps>
  | S<"column", ColumnProps>
  | S<"grouped-bar", GroupedBarProps>
  | S<"stacked-bar", StackedBarProps>
  | S<"lollipop", LollipopProps>
  | S<"dot-plot", DotPlotProps>
  | S<"leaderboard", LeaderboardProps>
  | S<"pictogram", PictogramProps>
  | S<"radial-bar", RadialBarProps>
  | S<"polar-area", PolarAreaProps>
  | S<"pie", PieProps>
  | S<"waffle", WaffleProps>
  | S<"treemap", TreemapProps>
  | S<"sunburst", SunburstProps>
  | S<"icicle", IcicleProps>
  | S<"circle-packing", CirclePackingProps>
  | S<"marimekko", MarimekkoProps>
  | S<"funnel", FunnelProps>
  | S<"histogram", HistogramProps>
  | S<"box-plot", BoxPlotProps>
  | S<"violin", ViolinProps>
  | S<"ridgeline", RidgelineProps>
  | S<"beeswarm", BeeswarmProps>
  | S<"strip-plot", StripPlotProps>
  | S<"population-pyramid", PopulationPyramidProps>
  | S<"scatter", ScatterProps>
  | S<"connected-scatter", ConnectedScatterProps>
  | S<"hexbin", HexbinProps>
  | S<"contour", ContourProps>
  | S<"heatmap", HeatmapProps>
  | S<"quadrant", QuadrantProps>
  | S<"parallel-coordinates", ParallelCoordinatesProps>
  | S<"radar", RadarProps>
  | S<"diverging-bar", DivergingBarProps>
  | S<"diverging-stacked", DivergingStackedProps>
  | S<"dumbbell", DumbbellProps>
  | S<"difference-area", DifferenceAreaProps>
  | S<"sankey", SankeyProps>
  | S<"chord", ChordProps>
  | S<"waterfall", WaterfallProps>
  | S<"network", NetworkProps>
  | S<"arc-diagram", ArcDiagramProps>
  | S<"tree", TreeProps>
  | S<"dendrogram", DendrogramProps>
  | S<"venn", VennProps>
  | S<"choropleth", ChoroplethProps>
  | S<"symbol-map", SymbolMapProps>
  | S<"dot-map", DotMapProps>
  | S<"flow-map", FlowMapProps>
  | S<"sparkline", SparklineProps>
  | S<"sparkbar", SparkbarProps>
  | S<"win-loss", WinLossProps>
  | S<"bullet", BulletProps>
  | S<"progress-ring", ProgressRingProps>
  | S<"gauge", GaugeProps>
  | S<"split-bar", SplitBarProps>;

type Kind = "array" | "object" | "string" | "number";
type Descriptor = {
  Component: ElementType;
  required: [string, Kind][];
};

const entry = (
  Component: ElementType,
  required: [string, Kind][],
): Descriptor => ({ Component, required });

const REGISTRY: Record<string, Descriptor> = {
  line: entry(charts.Line, []),
  area: entry(charts.Area, [["data", "array"]]),
  "stacked-area": entry(charts.StackedArea, [["series", "array"]]),
  streamgraph: entry(charts.Streamgraph, [["series", "array"]]),
  "mirrored-area": entry(charts.MirroredArea, [
    ["down", "object"],
    ["up", "object"],
  ]),
  slope: entry(charts.Slope, [["items", "array"]]),
  bump: entry(charts.Bump, [["series", "array"]]),
  candlestick: entry(charts.Candlestick, [["data", "array"]]),
  horizon: entry(charts.Horizon, [["data", "array"]]),
  gantt: entry(charts.Gantt, [["rows", "array"]]),
  bar: entry(charts.Bar, [["items", "array"]]),
  column: entry(charts.Column, [["items", "array"]]),
  "grouped-bar": entry(charts.GroupedBar, [
    ["groups", "array"],
    ["series", "array"],
  ]),
  "stacked-bar": entry(charts.StackedBar, [
    ["groups", "array"],
    ["series", "array"],
  ]),
  lollipop: entry(charts.Lollipop, [["items", "array"]]),
  "dot-plot": entry(charts.DotPlot, [["items", "array"]]),
  leaderboard: entry(charts.Leaderboard, [["items", "array"]]),
  pictogram: entry(charts.Pictogram, [
    ["items", "array"],
    ["unit", "number"],
  ]),
  "radial-bar": entry(charts.RadialBar, [["items", "array"]]),
  "polar-area": entry(charts.PolarArea, [["items", "array"]]),
  pie: entry(charts.Pie, [["items", "array"]]),
  waffle: entry(charts.Waffle, [["items", "array"]]),
  treemap: entry(charts.Treemap, [["root", "object"]]),
  sunburst: entry(charts.Sunburst, [["root", "object"]]),
  icicle: entry(charts.Icicle, [["root", "object"]]),
  "circle-packing": entry(charts.CirclePacking, [["root", "object"]]),
  marimekko: entry(charts.Marimekko, [["columns", "array"]]),
  funnel: entry(charts.Funnel, [["items", "array"]]),
  histogram: entry(charts.Histogram, [["bins", "array"]]),
  "box-plot": entry(charts.BoxPlot, [["groups", "array"]]),
  violin: entry(charts.Violin, [["groups", "array"]]),
  ridgeline: entry(charts.Ridgeline, [["rows", "array"]]),
  beeswarm: entry(charts.Beeswarm, [["values", "array"]]),
  "strip-plot": entry(charts.StripPlot, [["rows", "array"]]),
  "population-pyramid": entry(charts.PopulationPyramid, [
    ["bands", "array"],
    ["left", "object"],
    ["right", "object"],
  ]),
  scatter: entry(charts.Scatter, [["points", "array"]]),
  "connected-scatter": entry(charts.ConnectedScatter, [["points", "array"]]),
  hexbin: entry(charts.Hexbin, [["points", "array"]]),
  contour: entry(charts.Contour, [["points", "array"]]),
  heatmap: entry(charts.Heatmap, [["matrix", "object"]]),
  quadrant: entry(charts.Quadrant, [
    ["points", "array"],
    ["xLabel", "string"],
    ["yLabel", "string"],
  ]),
  "parallel-coordinates": entry(charts.ParallelCoordinates, [
    ["axes", "array"],
    ["records", "array"],
  ]),
  radar: entry(charts.Radar, [
    ["axes", "array"],
    ["series", "array"],
  ]),
  "diverging-bar": entry(charts.DivergingBar, [["items", "array"]]),
  "diverging-stacked": entry(charts.DivergingStacked, [["rows", "array"]]),
  dumbbell: entry(charts.Dumbbell, [["items", "array"]]),
  "difference-area": entry(charts.DifferenceArea, [
    ["actual", "object"],
    ["reference", "object"],
  ]),
  sankey: entry(charts.Sankey, [["graph", "object"]]),
  chord: entry(charts.Chord, [
    ["groups", "array"],
    ["flows", "array"],
  ]),
  waterfall: entry(charts.Waterfall, [["steps", "array"]]),
  network: entry(charts.Network, [["graph", "object"]]),
  "arc-diagram": entry(charts.ArcDiagram, [["graph", "object"]]),
  tree: entry(charts.Tree, [["root", "object"]]),
  dendrogram: entry(charts.Dendrogram, [
    ["leaves", "array"],
    ["merges", "array"],
  ]),
  venn: entry(charts.Venn, [
    ["a", "object"],
    ["b", "object"],
    ["overlap", "number"],
  ]),
  choropleth: entry(charts.Choropleth, [["values", "array"]]),
  "symbol-map": entry(charts.SymbolMap, [["marks", "array"]]),
  "dot-map": entry(charts.DotMap, [["counts", "array"]]),
  "flow-map": entry(charts.FlowMap, [
    ["origin", "object"],
    ["routes", "array"],
  ]),
  sparkline: entry(charts.Sparkline, [["data", "array"]]),
  sparkbar: entry(charts.Sparkbar, [["data", "array"]]),
  "win-loss": entry(charts.WinLoss, [["data", "array"]]),
  bullet: entry(charts.Bullet, [
    ["value", "number"],
    ["target", "number"],
    ["bands", "array"],
  ]),
  "progress-ring": entry(charts.ProgressRing, [["value", "number"]]),
  gauge: entry(charts.Gauge, [["value", "number"]]),
  "split-bar": entry(charts.SplitBar, [
    ["a", "object"],
    ["b", "object"],
  ]),
};

export const CHART_TYPES = Object.keys(REGISTRY) as ChartSpec["type"][];

function kindOf(value: unknown): Kind | "other" {
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "object" && value !== null) return "object";
  return "other";
}

/**
 * Structural check of an untrusted spec: known type, required fields present
 * with the right shape. Throws with a path on failure; deep field validation
 * stays with TypeScript at authoring time.
 */
export function validateSpec(input: unknown): ChartSpec {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Chart spec must be an object.");
  }
  const spec = input as Record<string, unknown>;
  if (spec["v"] !== undefined && spec["v"] !== "dg/1") {
    throw new Error(`Unknown spec version at "v": ${String(spec["v"])}.`);
  }
  const type = spec["type"];
  if (typeof type !== "string" || !(type in REGISTRY)) {
    throw new Error(`Unknown chart type at "type": ${String(type)}.`);
  }
  for (const [key, kind] of REGISTRY[type]!.required) {
    const value = spec[key];
    if (value === undefined) {
      throw new Error(`Missing required field "${key}" for type "${type}".`);
    }
    if (kindOf(value) !== kind) {
      throw new Error(
        `Field "${key}" for type "${type}" must be ${kind === "array" ? "an array" : `a ${kind}`}.`,
      );
    }
  }
  return input as ChartSpec;
}

const UNIT_FORMAT: Record<Unit, (value: number) => string> = {
  percent: (value) => `${Math.round(value * 10) / 10}%`,
  compact: formatCompact,
  none: (value) => String(value),
};

export type ChartProps = {
  spec: ChartSpec;
  className?: string;
};

/**
 * Renders any spec by its `type`. An unknown type renders an inert placeholder
 * instead of throwing, so a stream of model output cannot take the page down;
 * run {@link validateSpec} first when you want the error.
 */
export function Chart({ spec, className }: ChartProps): ReactElement {
  const descriptor = REGISTRY[(spec as { type?: string }).type ?? ""];
  if (!descriptor) {
    return createElement(
      "svg",
      {
        viewBox: "0 0 200 40",
        role: "img",
        "aria-label": "Unknown chart type",
        className,
        style: { display: "block", width: "100%", height: "auto" },
        "data-dg": "",
      },
      createElement(
        "text",
        {
          x: 100,
          y: 23,
          textAnchor: "middle",
          fontSize: 6,
          fill: "color-mix(in oklab, currentColor 45%, transparent)",
        },
        `unknown chart type: ${String((spec as { type?: string }).type)}`,
      ),
    );
  }
  const { type: _type, v: _v, unit, ...rest } = spec as Record<string, unknown>;
  const props: Record<string, unknown> = { ...rest };
  if (unit !== undefined) {
    props["format"] = UNIT_FORMAT[unit as Unit] ?? formatCompact;
  }
  if (className !== undefined) props["className"] = className;
  return createElement(descriptor.Component, props);
}
