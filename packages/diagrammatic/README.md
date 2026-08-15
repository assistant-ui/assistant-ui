# `diagrammatic`

Every chart you can reach for: 74 React chart forms, drawn as server-rendered SVG with zero runtime dependencies. Correct defaults are the product; a validated categorical palette, diverging pairs with a neutral midpoint, zero-based bars, and automatic legends ship built in, and the whole skin reskins through CSS tokens so charts match your design system without configuration.

## Installation

```bash
npm install diagrammatic
```

## Usage

```tsx
import { StackedArea } from "diagrammatic";

<StackedArea
  title="Traffic by channel"
  labels={["Jan", "Feb", "Mar", "Apr"]}
  series={[
    { name: "search", data: [42, 48, 51, 58] },
    { name: "direct", data: [30, 29, 33, 35] },
  ]}
/>;
```

Every component is a server-safe pure function: no hooks, no browser APIs, usable in React Server Components and SSR as is. Charts fill their container's width and size their height from `aspect`. Every native svg attribute, `aria-*`, `data-*`, event handler, and `style` passes through to the root element, and refs forward.

## The 74 forms

Change over time (`Line`, `Area`, `StackedArea`, `Streamgraph`, `MirroredArea`, `StepLine`, `Slope`, `Bump`, `Candlestick`, `Horizon`, `Gantt`, `CalendarHeatmap`, `Punchcard`), comparison (`Bar`, `Column`, `GroupedBar`, `StackedBar`, `PercentStackedBar`, `Lollipop`, `DotPlot`, `Leaderboard`, `Pictogram`, `RadialBar`, `PolarArea`), part to whole (`Pie`, `Donut`, `Waffle`, `Treemap`, `Sunburst`, `Icicle`, `CirclePacking`, `Marimekko`, `Funnel`), distribution (`Histogram`, `Density`, `BoxPlot`, `Violin`, `Ridgeline`, `Beeswarm`, `StripPlot`, `PopulationPyramid`), correlation (`Scatter`, `Bubble`, `ConnectedScatter`, `Hexbin`, `Contour`, `Heatmap`, `Quadrant`, `ParallelCoordinates`, `Radar`), deviation (`DivergingBar`, `DivergingStacked`, `Dumbbell`, `DifferenceArea`), flow (`Sankey`, `Chord`, `Waterfall`), networks and hierarchy (`Network`, `ArcDiagram`, `Tree`, `Dendrogram`, `Venn`), spatial on an abstract tile map (`Choropleth`, `SymbolMap`, `DotMap`, `FlowMap`), and inline micro charts (`Sparkline`, `Sparkbar`, `WinLoss`, `Bullet`, `ProgressRing`, `Gauge`, `SplitBar`, `KpiTile`).

## Theming

Colors resolve through `--dg-*` custom properties with the shipped defaults as fallbacks, so the package renders correctly with no stylesheet and reskins globally through tokens:

| Token | Role |
| --- | --- |
| `--dg-c1` … `--dg-c4` | Categorical series, fixed order |
| `--dg-pos` / `--dg-neg` | Diverging pair (gains and losses) |
| `--dg-ink` | Single-series marks and text, defaults to `currentColor` |
| `--dg-muted` / `--dg-grid` | Secondary text, axes, grid |
| `--dg-surface` | Separator strokes and occluding fills |
| `--dg-font` | Chart text |

Import `diagrammatic/styles.css` to see the defaults in one place, or set the tokens yourself.

## Tooltips

Interactivity lives in the client-only `diagrammatic/interactive` entry, so the charts themselves stay server components. `Root` delegates pointer events to every chart mark inside it; `Tooltip` follows the pointer and renders your surface through a render prop:

```tsx
"use client";
import { Bar } from "diagrammatic";
import * as Interactive from "diagrammatic/interactive";

<Interactive.Root>
  <Bar items={items} />
  <Interactive.Tooltip side="top">
    {({ datum }) => (
      <div className="tooltip">
        {items[datum.index ?? 0]?.label}: {items[datum.index ?? 0]?.value}
      </div>
    )}
  </Interactive.Tooltip>
</Interactive.Root>;
```

Marks carry `data-part="mark"`, `data-i`, and `data-series`, so CSS hover emphasis (`[data-part="mark"]:hover`) and your own event delegation work without any of this.

## AI-generated charts

`diagrammatic/spec` renders serializable specs, so a model can emit JSON and you can draw it:

```tsx
import { Chart, validateSpec } from "diagrammatic/spec";

const spec = validateSpec(modelOutput);
<Chart spec={spec} />;
```

Unknown types render an inert placeholder instead of throwing; `validateSpec` is where you opt into errors.

## Accessibility

Pass `title` (or `aria-label`) to name a chart: it renders `role="img"`, `aria-label`, and an svg `<title>`. Without a name the chart is marked decorative. For data-critical charts, pair the visual with a table.

## Documentation

Live gallery and full reference at [assistant-ui.com/diagrammatic](https://www.assistant-ui.com/diagrammatic).
