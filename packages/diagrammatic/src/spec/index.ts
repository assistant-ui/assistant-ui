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
  RangeBarProps,
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
  UpsetProps,
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
 * format function stay out. `title` survives because it names the chart, and
 * `width`, `height` and `fontSize` survive because they are the chart's
 * pixel contract, not svg attributes.
 */
type Strip<P> = Omit<
  P,
  | "format"
  | Exclude<
      keyof Omit<ComponentPropsWithoutRef<"svg">, "children">,
      "width" | "height" | "fontSize"
    >
> & { title?: string };
type S<T extends string, P> = Omit<Common, keyof P> & { type: T } & Strip<P>;

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
  | S<"range-bar", RangeBarProps>
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
  | S<"upset", UpsetProps>
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
type Shape =
  | { kind: "string" | "number" | "boolean" }
  | { kind: "array"; items: Shape }
  | { kind: "tuple"; items: Shape[] }
  | {
      kind: "object";
      required: Record<string, Shape>;
      optional?: Record<string, Shape>;
    };
type Field = [string, Kind, Shape?];

const stringShape: Shape = { kind: "string" };
const numberShape: Shape = { kind: "number" };
const booleanShape: Shape = { kind: "boolean" };
const arrayOf = (items: Shape): Shape => ({ kind: "array", items });
const tupleOf = (...items: Shape[]): Shape => ({ kind: "tuple", items });
const objectOf = (
  required: Record<string, Shape>,
  optional?: Record<string, Shape>,
): Shape => ({ kind: "object", required, ...(optional ? { optional } : {}) });

const stringArray = arrayOf(stringShape);
const numberArray = arrayOf(numberShape);
const itemShape = objectOf({ label: stringShape, value: numberShape });
const seriesShape = objectOf({ name: stringShape, data: numberArray });
const matrixShape = objectOf({
  rows: stringArray,
  cols: stringArray,
  values: arrayOf(numberArray),
});
const treeNodeOptional: Record<string, Shape> = { value: numberShape };
const treeNodeShape = objectOf({ label: stringShape }, treeNodeOptional);
treeNodeOptional["children"] = arrayOf(treeNodeShape);
const itemArray = arrayOf(itemShape);
const seriesArray = arrayOf(seriesShape);
const pointArray = arrayOf(objectOf({ x: numberShape, y: numberShape }));
const connectedPointArray = arrayOf(
  objectOf({ x: numberShape, y: numberShape }, { label: stringShape }),
);
const connectedSeriesArray = arrayOf(
  objectOf({ name: stringShape, points: connectedPointArray }),
);
const graphShape = objectOf({
  nodes: arrayOf(
    objectOf({ id: stringShape }, { label: stringShape, group: numberShape }),
  ),
  links: arrayOf(
    objectOf(
      { source: stringShape, target: stringShape },
      { value: numberShape },
    ),
  ),
});

type Descriptor = {
  Component: ElementType;
  required: Field[];
  acceptsNumericUnit?: boolean;
  /** Fields a chart accepts in place of one another; at least one must be present. */
  either?: Field[];
};

const entry = (
  Component: ElementType,
  required: Field[],
  either?: Field[],
): Descriptor => ({ Component, required, ...(either ? { either } : {}) });

const REGISTRY: Record<string, Descriptor> = {
  line: entry(
    charts.Line,
    [],
    [
      ["data", "array", numberArray],
      ["series", "array", seriesArray],
    ],
  ),
  area: entry(
    charts.Area,
    [],
    [
      ["data", "array", numberArray],
      ["series", "array", seriesArray],
    ],
  ),
  "stacked-area": entry(charts.StackedArea, [["series", "array", seriesArray]]),
  streamgraph: entry(charts.Streamgraph, [["series", "array", seriesArray]]),
  "mirrored-area": entry(charts.MirroredArea, [
    ["down", "object", seriesShape],
    ["up", "object", seriesShape],
  ]),
  slope: entry(charts.Slope, [
    [
      "items",
      "array",
      arrayOf(
        objectOf({
          label: stringShape,
          from: numberShape,
          to: numberShape,
        }),
      ),
    ],
  ]),
  bump: entry(charts.Bump, [
    [
      "series",
      "array",
      arrayOf(objectOf({ name: stringShape, ranks: numberArray })),
    ],
  ]),
  candlestick: entry(charts.Candlestick, [
    [
      "data",
      "array",
      arrayOf(
        objectOf({
          open: numberShape,
          high: numberShape,
          low: numberShape,
          close: numberShape,
        }),
      ),
    ],
  ]),
  horizon: entry(
    charts.Horizon,
    [],
    [
      ["data", "array", numberArray],
      ["series", "array", seriesArray],
    ],
  ),
  gantt: entry(charts.Gantt, [
    [
      "rows",
      "array",
      arrayOf(
        objectOf(
          { label: stringShape, from: numberShape, to: numberShape },
          { state: stringShape },
        ),
      ),
    ],
  ]),
  bar: entry(charts.Bar, [["items", "array", itemArray]]),
  column: entry(charts.Column, [["items", "array", itemArray]]),
  "grouped-bar": entry(charts.GroupedBar, [
    ["groups", "array", stringArray],
    ["series", "array", seriesArray],
  ]),
  "stacked-bar": entry(charts.StackedBar, [
    ["groups", "array", stringArray],
    ["series", "array", seriesArray],
  ]),
  lollipop: entry(charts.Lollipop, [["items", "array", itemArray]]),
  "dot-plot": entry(charts.DotPlot, [["items", "array", itemArray]]),
  "range-bar": entry(charts.RangeBar, [
    [
      "items",
      "array",
      arrayOf(
        objectOf(
          { label: stringShape, from: numberShape, to: numberShape },
          { at: numberShape },
        ),
      ),
    ],
  ]),
  leaderboard: entry(charts.Leaderboard, [["items", "array", itemArray]]),
  pictogram: entry(charts.Pictogram, [
    ["items", "array", itemArray],
    ["unit", "number"],
  ]),
  "radial-bar": entry(charts.RadialBar, [
    [
      "items",
      "array",
      arrayOf(
        objectOf(
          { label: stringShape, value: numberShape },
          { max: numberShape },
        ),
      ),
    ],
  ]),
  "polar-area": entry(charts.PolarArea, [["items", "array", itemArray]]),
  pie: entry(charts.Pie, [["items", "array", itemArray]]),
  waffle: entry(charts.Waffle, [["items", "array", itemArray]]),
  treemap: entry(charts.Treemap, [["root", "object", treeNodeShape]]),
  sunburst: entry(charts.Sunburst, [["root", "object", treeNodeShape]]),
  icicle: entry(charts.Icicle, [["root", "object", treeNodeShape]]),
  "circle-packing": entry(charts.CirclePacking, [
    ["root", "object", treeNodeShape],
  ]),
  marimekko: entry(charts.Marimekko, [
    [
      "columns",
      "array",
      arrayOf(
        objectOf({
          label: stringShape,
          width: numberShape,
          shares: itemArray,
        }),
      ),
    ],
  ]),
  funnel: entry(charts.Funnel, [["items", "array", itemArray]]),
  histogram: entry(charts.Histogram, [["bins", "array", numberArray]]),
  "box-plot": entry(charts.BoxPlot, [
    [
      "groups",
      "array",
      arrayOf(
        objectOf(
          {
            label: stringShape,
            low: numberShape,
            q1: numberShape,
            median: numberShape,
            q3: numberShape,
            high: numberShape,
          },
          { points: numberArray },
        ),
      ),
    ],
  ]),
  violin: entry(charts.Violin, [
    [
      "groups",
      "array",
      arrayOf(
        objectOf(
          { label: stringShape, widths: numberArray, median: numberShape },
          { points: numberArray },
        ),
      ),
    ],
  ]),
  ridgeline: entry(charts.Ridgeline, [
    [
      "rows",
      "array",
      arrayOf(objectOf({ label: stringShape, bins: numberArray })),
    ],
  ]),
  beeswarm: entry(charts.Beeswarm, [["values", "array", numberArray]]),
  "strip-plot": entry(charts.StripPlot, [
    [
      "rows",
      "array",
      arrayOf(objectOf({ label: stringShape, values: numberArray })),
    ],
  ]),
  "population-pyramid": entry(charts.PopulationPyramid, [
    ["bands", "array", stringArray],
    ["left", "object", seriesShape],
    ["right", "object", seriesShape],
  ]),
  scatter: entry(charts.Scatter, [
    [
      "points",
      "array",
      arrayOf(
        objectOf(
          { x: numberShape, y: numberShape },
          {
            size: numberShape,
            label: stringShape,
            series: stringShape,
          },
        ),
      ),
    ],
  ]),
  "connected-scatter": entry(
    charts.ConnectedScatter,
    [],
    [
      ["points", "array", connectedPointArray],
      ["series", "array", connectedSeriesArray],
    ],
  ),
  hexbin: entry(charts.Hexbin, [["points", "array", pointArray]]),
  contour: entry(charts.Contour, [["points", "array", pointArray]]),
  heatmap: entry(charts.Heatmap, [["matrix", "object", matrixShape]]),
  quadrant: entry(charts.Quadrant, [
    [
      "points",
      "array",
      arrayOf(
        objectOf({ x: numberShape, y: numberShape }, { label: stringShape }),
      ),
    ],
    ["xLabel", "string"],
    ["yLabel", "string"],
  ]),
  "parallel-coordinates": entry(charts.ParallelCoordinates, [
    ["axes", "array", stringArray],
    [
      "records",
      "array",
      arrayOf(objectOf({ name: stringShape, values: numberArray })),
    ],
  ]),
  radar: entry(charts.Radar, [
    ["axes", "array", stringArray],
    ["series", "array", seriesArray],
  ]),
  "diverging-bar": entry(charts.DivergingBar, [["items", "array", itemArray]]),
  "diverging-stacked": entry(charts.DivergingStacked, [
    [
      "rows",
      "array",
      arrayOf(
        objectOf({
          label: stringShape,
          values: tupleOf(
            numberShape,
            numberShape,
            numberShape,
            numberShape,
            numberShape,
          ),
        }),
      ),
    ],
  ]),
  dumbbell: entry(charts.Dumbbell, [
    [
      "items",
      "array",
      arrayOf(
        objectOf({
          label: stringShape,
          from: numberShape,
          to: numberShape,
        }),
      ),
    ],
  ]),
  "difference-area": entry(charts.DifferenceArea, [
    ["actual", "object", seriesShape],
    ["reference", "object", seriesShape],
  ]),
  sankey: entry(charts.Sankey, [["graph", "object", graphShape]]),
  chord: entry(charts.Chord, [
    ["groups", "array", stringArray],
    [
      "flows",
      "array",
      arrayOf(
        objectOf({
          from: stringShape,
          to: stringShape,
          value: numberShape,
        }),
      ),
    ],
  ]),
  waterfall: entry(charts.Waterfall, [
    [
      "steps",
      "array",
      arrayOf(
        objectOf(
          { label: stringShape, value: numberShape },
          { total: booleanShape },
        ),
      ),
    ],
  ]),
  network: entry(charts.Network, [["graph", "object", graphShape]]),
  "arc-diagram": entry(charts.ArcDiagram, [["graph", "object", graphShape]]),
  tree: entry(charts.Tree, [["root", "object", treeNodeShape]]),
  dendrogram: entry(charts.Dendrogram, [
    ["leaves", "array", stringArray],
    [
      "merges",
      "array",
      arrayOf(
        objectOf({ a: numberShape, b: numberShape, height: numberShape }),
      ),
    ],
  ]),
  venn: entry(charts.Venn, [
    ["a", "object", itemShape],
    ["b", "object", itemShape],
    ["overlap", "number"],
  ]),
  upset: entry(charts.Upset, [
    ["sets", "array", stringArray],
    [
      "intersections",
      "array",
      arrayOf(objectOf({ sets: stringArray, value: numberShape })),
    ],
  ]),
  choropleth: entry(charts.Choropleth, [["values", "array", numberArray]]),
  "symbol-map": entry(charts.SymbolMap, [
    [
      "marks",
      "array",
      arrayOf(
        objectOf(
          { col: numberShape, row: numberShape, value: numberShape },
          { label: stringShape },
        ),
      ),
    ],
  ]),
  "dot-map": {
    ...entry(charts.DotMap, [["counts", "array", numberArray]]),
    acceptsNumericUnit: true,
  },
  "flow-map": entry(charts.FlowMap, [
    [
      "origin",
      "object",
      objectOf({ col: numberShape, row: numberShape }, { label: stringShape }),
    ],
    [
      "routes",
      "array",
      arrayOf(
        objectOf({ col: numberShape, row: numberShape, value: numberShape }),
      ),
    ],
  ]),
  sparkline: entry(charts.Sparkline, [["data", "array", numberArray]]),
  sparkbar: entry(charts.Sparkbar, [["data", "array", numberArray]]),
  "win-loss": entry(charts.WinLoss, [["data", "array", numberArray]]),
  bullet: entry(charts.Bullet, [
    ["value", "number"],
    ["target", "number"],
    ["bands", "array", tupleOf(numberShape, numberShape, numberShape)],
  ]),
  "progress-ring": entry(charts.ProgressRing, [["value", "number"]]),
  gauge: entry(charts.Gauge, [["value", "number"]]),
  "split-bar": entry(
    charts.SplitBar,
    [],
    [
      ["items", "array", itemArray],
      ["a", "object", itemShape],
      ["b", "object", itemShape],
    ],
  ),
};

export const CHART_TYPES = Object.keys(REGISTRY) as ChartSpec["type"][];

function kindOf(value: unknown): Kind | "other" {
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "object" && value !== null) return "object";
  return "other";
}

function invalidShape(
  value: unknown,
  shape: Shape,
  path: string,
): { path: string; expected: string } | undefined {
  switch (shape.kind) {
    case "string":
      return typeof value === "string"
        ? undefined
        : { path, expected: "a string" };
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? undefined
        : { path, expected: "a finite number" };
    case "boolean":
      return typeof value === "boolean"
        ? undefined
        : { path, expected: "a boolean" };
    case "array":
      if (!Array.isArray(value)) return { path, expected: "an array" };
      for (let i = 0; i < value.length; i++) {
        const error = invalidShape(value[i], shape.items, `${path}[${i}]`);
        if (error) return error;
      }
      return undefined;
    case "tuple":
      if (!Array.isArray(value) || value.length !== shape.items.length) {
        return { path, expected: `a tuple of ${shape.items.length} items` };
      }
      for (let i = 0; i < shape.items.length; i++) {
        const error = invalidShape(value[i], shape.items[i]!, `${path}[${i}]`);
        if (error) return error;
      }
      return undefined;
    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return { path, expected: "an object" };
      }
      const record = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(shape.required)) {
        const error = invalidShape(record[key], field, `${path}.${key}`);
        if (error) return error;
      }
      for (const [key, field] of Object.entries(shape.optional ?? {})) {
        if (record[key] === undefined) continue;
        const error = invalidShape(record[key], field, `${path}.${key}`);
        if (error) return error;
      }
      return undefined;
  }
}

/**
 * Structural check of an untrusted spec against the field shapes in REGISTRY.
 * Throws with a path on failure.
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
  if (typeof type !== "string" || !Object.hasOwn(REGISTRY, type)) {
    throw new Error(`Unknown chart type at "type": ${String(type)}.`);
  }
  const descriptor = REGISTRY[type]!;
  const shaped = ([key, kind, shape]: Field) => {
    const value = spec[key];
    if (value === undefined) return false;
    if (kindOf(value) !== kind) {
      throw new Error(
        `Field "${key}" for type "${type}" must be ${kind === "array" || kind === "object" ? `an ${kind}` : `a ${kind}`}.`,
      );
    }
    if (shape) {
      const error = invalidShape(value, shape, key);
      if (error) {
        throw new Error(
          `Field "${error.path}" for type "${type}" must be ${error.expected}.`,
        );
      }
    }
    return true;
  };
  for (const field of descriptor.required) {
    if (!shaped(field)) {
      throw new Error(
        `Missing required field "${field[0]}" for type "${type}".`,
      );
    }
  }
  if (descriptor.either) {
    if (!descriptor.either.some(([key]) => spec[key] !== undefined)) {
      const names = descriptor.either.map(([key]) => `"${key}"`).join(" or ");
      throw new Error(`Missing required field ${names} for type "${type}".`);
    }
    for (const field of descriptor.either) shaped(field);
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
  const type = (spec as { type?: string }).type ?? "";
  const descriptor = Object.hasOwn(REGISTRY, type) ? REGISTRY[type] : undefined;
  if (!descriptor) {
    return createElement(
      "svg",
      {
        viewBox: "0 0 640 40",
        width: 640,
        height: 40,
        fontSize: 11,
        role: "img",
        "aria-label": "Unknown chart type",
        className,
        style: {
          display: "block",
          maxWidth: "100%",
          height: "auto",
          fontFamily: "var(--dg-font, inherit)",
        },
        "data-dg": "",
      },
      createElement(
        "text",
        {
          x: 320,
          y: 24,
          textAnchor: "middle",
          fill: "color-mix(in oklab, currentColor 45%, transparent)",
        },
        `unknown chart type: ${String((spec as { type?: string }).type)}`,
      ),
    );
  }
  const { type: _type, v: _v, unit, ...rest } = spec as Record<string, unknown>;
  const props: Record<string, unknown> = { ...rest };
  if (
    typeof unit === "number" &&
    (descriptor.acceptsNumericUnit ||
      descriptor.required.some(
        ([key, kind]) => key === "unit" && kind === "number",
      ))
  ) {
    props["unit"] = unit;
  } else if (unit !== undefined) {
    const format =
      typeof unit === "string" && Object.hasOwn(UNIT_FORMAT, unit)
        ? UNIT_FORMAT[unit as Unit]
        : undefined;
    props["format"] = format ?? formatCompact;
  }
  if (className !== undefined) props["className"] = className;
  return createElement(descriptor.Component, props);
}
