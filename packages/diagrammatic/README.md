# `diagrammatic`

Every chart you can reach for: 68 React chart forms, drawn as server-rendered SVG with zero runtime dependencies. Correct defaults are the product; a validated categorical palette, diverging pairs with a neutral midpoint, zero-based bars, and automatic legends ship built in. Every figure is drawn in CSS pixels and inherits your page font, so its 11px tick labels are the same 11px as your captions, and the whole skin reskins through CSS tokens so charts match your design system without configuration.

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

Every component is a server-safe pure function: no hooks, no browser APIs, usable in React Server Components and SSR as is. A chart renders at its `width` in CSS pixels (640 by default), takes its height from `height` or `aspect`, prints its type at `fontSize` (11 by default), and shrinks whole inside a narrower host. `Fit` from `diagrammatic/interactive` measures a fluid box and hands the width down. Every native svg attribute, `aria-*`, `data-*`, event handler, and `style` passes through to the root element, and refs forward.

## The 68 forms

Change over time (`Line`, `Area`, `StackedArea`, `Streamgraph`, `MirroredArea`, `Slope`, `Bump`, `Candlestick`, `Horizon`, `Gantt`), comparison (`Bar`, `Column`, `GroupedBar`, `StackedBar`, `Lollipop`, `DotPlot`, `RangeBar`, `Leaderboard`, `Pictogram`, `RadialBar`, `PolarArea`), part to whole (`Pie`, `Waffle`, `Treemap`, `Sunburst`, `Icicle`, `CirclePacking`, `Marimekko`, `Funnel`), distribution (`Histogram`, `BoxPlot`, `Violin`, `Ridgeline`, `Beeswarm`, `StripPlot`, `PopulationPyramid`), correlation (`Scatter`, `ConnectedScatter`, `Hexbin`, `Contour`, `Heatmap`, `Quadrant`, `ParallelCoordinates`, `Radar`), deviation (`DivergingBar`, `DivergingStacked`, `Dumbbell`, `DifferenceArea`), flow (`Sankey`, `Chord`, `Waterfall`), networks and hierarchy (`Network`, `ArcDiagram`, `Tree`, `Dendrogram`, `Venn`, `Upset`), spatial on an abstract tile map (`Choropleth`, `SymbolMap`, `DotMap`, `FlowMap`), and inline micro charts (`Sparkline`, `Sparkbar`, `WinLoss`, `Bullet`, `ProgressRing`, `Gauge`, `SplitBar`).

Thin variants are host props rather than separate forms: `Line` takes `step`, `Histogram` takes `smooth`, `StackedBar` takes `normalize`, `Heatmap` takes a calendar layout and `mark="cell" | "dot"`, `Scatter` takes `size`, and `Pie` takes an inner radius and a center label. `SmallMultiples` lays any form out as a panel grid.

Real geography lives in its own entry so only map pages pay for the geometry:

```tsx
import { WorldMap, DotWorldMap } from "diagrammatic/world";
```

## Theming

Colors resolve through `--dg-*` custom properties with the shipped defaults as fallbacks, so the package renders correctly with no stylesheet and reskins globally through tokens:

| Token | Role |
| --- | --- |
| `--dg-c1` … `--dg-c7` | Categorical series, fixed order |
| `--dg-pos` / `--dg-neg` | Diverging pair (gains and losses) |
| `--dg-ink` | Single-series marks and text, defaults to `currentColor` |
| `--dg-muted` / `--dg-grid` | Secondary text, axes, grid |
| `--dg-surface` | Separator strokes and occluding fills |
| `--dg-font` | Chart text, inherits the host font by default |

Import `diagrammatic/styles.css` to see the defaults in one place, or set the tokens yourself. That file also carries the highlight styles, so import it if you use `highlight` on `Interactive.Root`. A shadcn/ui app imports `diagrammatic/shadcn.css` and every figure takes its `--chart-*`, foreground, muted, border, and background tokens.

The built-in legend is drawn inside the figure; `legend={false}` plus the `Legend` export puts one on the page instead, on the page's own type and colored through the same tokens.

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

- [docs/host.md](./docs/host.md) is the contract for the frame every form shares: size, type, the value axis, color, legends, and interaction.
- [docs/migrating-from-recharts.md](./docs/migrating-from-recharts.md) maps a recharts dashboard onto that contract.
- [docs/coverage.md](./docs/coverage.md) is the record of chart types that exist in the world but are not forms here, and the only lanes by which one may enter.
- [docs/ceiling.md](./docs/ceiling.md) is the acceptance bar for a published figure.
