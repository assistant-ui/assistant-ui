# Diagrammatic coverage

This file is the record of chart types that exist in industry and science but are not plates, and the only ways those types are allowed to enter the product. [ceiling.md](./ceiling.md) is the bar for a published figure. This file is the bar for a new capability.

A name in the world is not a form. Industry and research multiply names by swapping coordinate paper, thresholds, and disciplinary glyphs onto the same marks. The atlas already holds the marks. Most of what production still asks for is a scale, a guide, a host prop, a composition, or a costume. A new export is the last resort.

Honeycomb is the worked example. Density honeycomb is `Hexbin`. A one-cell-per-region hex map is a tile preset on `Choropleth`, not a `Honeycomb` component. A hex waffle is a `Waffle` mark recipe, and it does not earn a plate.

## Lanes

Classify the request before writing code. One request occupies one lane.

| Lane | The job is | What ships | What does not ship |
|---|---|---|---|
| Scale | The marks exist; only the paper changes | A shared scale on cartesian hosts | `Bode`, `Weibull`, `LogLog` |
| Annotation | Spec limits, control limits, targets, callouts | A shared guide vocabulary | `ControlChart`, `Capability`, `Volcano` |
| Host prop | Same projection, different mark recipe | A data prop on the host | A second plate for a thin variant |
| Tile preset | Same spatial marks, different cell geometry | A `Tile[]` (and a hex cell if the mark must change) | `HexMap`, `Tilegram` |
| Composition | Two hosts, or a host inside user HTML | A demo or a userland recipe | `KpiTile`, `Raincloud`, `Pareto`, `Splom` |
| Costume | A domain story on an existing form | A flagship figure on that form's page | `KaplanMeier`, `FlameGraph`, `Spectrogram` |
| New form | A new projection or mark job | Component, spec arm, atlas plate, ceiling row | Anything that fails the tests below |
| Never | A diagram, a decoration, or one-discipline paper | Nothing | Word clouds, mermaid, Smith, Skew-T, force layouts |

### Tests for a new form

Every new plate has to pass all six.

1. The projection or the mark is a new job. Sunburst versus icicle is the precedent: polar versus cartesian is the form.
2. Props take data any scenario can feed. Pre-formatted copy is userland.
3. A host prop would have to lie to express it.
4. Two existing charts in user markup would not be fair.
5. The drawing is deterministic, zero-dependency, and RSC-safe.
6. More than one discipline would steal the figure.

If a request fails (5), it is out (force-directed networks stay out). If it fails (6), it is a costume or it is never. If it fails (3) or (4), it is a prop or a composition.

### How a lane is added

**Scale.** One vocabulary on every cartesian host, not a `log` boolean per chart. Shape: `xScale?: "linear" | "log"` and `yScale?: "linear" | "log"`, matching the existing `xTicks` / `yTicks` pair. Default is linear. Log requires a strictly positive domain; that invariant lives in the scale, not in each chart. Math lives in `packages/diagrammatic/src/core` as pure map functions. `plotFrame` and `TickGrid` consume them. Wire Line, Area, Scatter, ConnectedScatter, Histogram, Hexbin, and Contour first (the hosts industrial log-log actually uses). Spec fields ride the existing chart arms. Persistence stays `"dg/1"`. No new plate. A Bode plot is a Line figure with a log x axis.

Do not add probability paper or Weibull paper until a reliability figure cannot be told on log-log. Those papers are still scales, not forms.

**Annotation.** Cartesian charts already grew four local dialects: Line `regions` / `bands` / `marks`, Column and Bar `target`, Gauge `redline`, ConnectedScatter `refPoint`. The missing cross-cutting piece is a value-space guide: `{ at: number; axis?: "x" | "y"; label?: string }[]`. Name it `guides` on every cartesian host. Do not add `controlLimits` on Line, `specLimits` on Histogram, and `reference` on Scatter. Same prop, same hairline, same `data-part`. Shewhart, capability, volcano thresholds, and Bland-Altman mean lines become costumes of `guides` plus `bands`. Kaplan-Meier censor ticks extend Line `marks` with a kind (`"point"` \| `"censor"`), which is a host prop, not a form.

**Host prop.** Precedent: Line `step`, Pie `inner`, Heatmap `mark`, Histogram `smooth` / `cumulative`, StackedBar `normalize`, Scatter `size`. A hex waffle, if it is ever wanted, is `Waffle` `mark: "hex"`. A radial tree, if it is ever wanted, is `Tree` / `Dendrogram` `layout: "radial"` rather than a new export. Polar versus cartesian was split for sunburst and icicle because that split is the job; tree and dendrogram glyphs stay readable as one plate when the layout is a prop.

**Tile preset.** Spatial hosts already take `tiles?: Tile[]`. `ABSTRACT_TILES` is the square landmass. A honeycomb map (one region, one hex, adjacency roughly kept) is a hex tile set plus a hex cell mark. Today `Choropleth` draws every tile as a hard-coded rect. The addition is: generalize the cell to a rect or a path on Choropleth, SymbolMap, DotMap, and FlowMap, then ship `HEX_TILES` (or a small builder) next to `ABSTRACT_TILES`. Do not add `HexMap`. Do not confuse this with `Hexbin`, which bins a point cloud.

**Composition.** `SmallMultiples` is the layout export. Pareto is Column plus Line. A raincloud is Violin plus BoxPlot plus Beeswarm. A scatterplot matrix is SmallMultiples of Scatter. A forest plot is RangeBar (or DotPlot) plus a userland summary row. A cluster heatmap (matrix locked to two dendrograms) starts as a documented composition; promote to a form only if shared permutation of rows and columns cannot be done fairly in userland.

**Costume.** Rewrite the host's flagship figure. Do not add an export. Do not add a plate. Update this file: move the row from "costume" to "costumed" when the figure exists.

**New form.** The mechanical path, in one change:

1. Non-trivial math in `packages/diagrammatic/src/core/layout.ts` with a direct unit test.
2. `packages/diagrammatic/src/react/charts/<slug>.tsx`: `forwardRef<SVGSVGElement>`, `displayName`, data props only, flat `data-part` seams in the four-slot address (`index`, `index2`, `series`, `series2`).
3. Barrel, spec arm, `CHART_TYPES`, render-contract fixture.
4. `apps/docs/components/diagrammatic/demos/<slug>.tsx` with one flagship figure that would pass [ceiling.md](./ceiling.md).
5. Registry row, hardcoded hero word on `app/diagrammatic/page.tsx`, ceiling score row, and a row moved in this file.

The public surface is append-only. Deleted unpublished slugs do not get redirects. `WorldMap` stays on `diagrammatic/world` and outside `"dg/1"` if the geometry outweighs the rest of the package.

**Never.** Word clouds, 3D pies and columns, Chernoff faces, decorative spirals, flowcharts, fishbones, value-stream maps, org-chart cosmetics, mermaid. One-discipline coordinate paper (Smith, Skew-T / tephigram, stereonet, CIE chromaticity): that is instrument software, not a vocabulary wall. Force-directed networks need a simulation, are non-deterministic, and cannot stay RSC-safe. Three-set Venn is Upset. KpiTile stays deleted.

## What the atlas already covers

Counts as of this file: 66 wall plates, 68 `"dg/1"` types (the wall plus Pictogram, RadialBar, StripPlot), `WorldMap` / `DotWorldMap` on the world entry, `SmallMultiples` as layout.

Shipped lanes (do not re-propose as new forms):

- Scale: `xScale` / `yScale` `"linear" | "log"` on Line, Area, Scatter, ConnectedScatter, Histogram, Hexbin, Contour, Column, Bar. Line also takes `xs` so frequency or any value-space x can sit on log paper. Persistence stays `"dg/1"`.
- Annotation: `guides?: { at, axis?, label? }[]` on Line, Area, Scatter, ConnectedScatter, Histogram, Column, Bar, RangeBar. Column/Bar `target` still works and renders as a guide.
- Host prop: Line `marks[].kind` `"point" | "censor"` for Kaplan-Meier ticks.
- Tile preset: `HEX_TILES` plus hex cells on Choropleth, SymbolMap, DotMap, FlowMap. Pass `tiles={HEX_TILES}`. Not a HexMap export.

Absorbed host recipes, not missing forms: donut (`Pie inner`), step line (`Line step`), density (`Histogram smooth`), cumulative histogram (`Histogram cumulative`), percent stacked (`StackedBar normalize`), bubble (`Scatter size`), punchcard (`Heatmap mark="dot"`), calendar heatmap (`Heatmap mark="calendar"`), Nightingale rose (`PolarArea`), fan-chart skeleton (`Line bands`), regime spans (`Line regions`), interval bar (`RangeBar`), Likert (`DivergingStacked`), butterfly (`PopulationPyramid`), flame semantics (`Icicle`), correlogram and adjacency matrix (`Heatmap`), two-set overlap (`Venn`), three-or-more overlap (`Upset`).

Off the wall, still exported: Pictogram, RadialBar, StripPlot. Do not resurrect them as plates.

## What the world still names

Each row is a name people will ask for. The lane is the decision. Do not reopen a "never" or "costume" row as a component without changing this file first.

### Scale

| Name | The data job | Lane | Host if any |
|---|---|---|---|
| Log / semi-log / log-log | Magnitude across orders | Shipped | Line `xs` + `xScale`/`yScale`, Scatter, Histogram, ConnectedScatter |
| Bode | Amplitude and phase against log frequency | Costumed | Line fig 2, loop gain |
| Particle-size / sieve | Cumulative mass on log size | Scale, then costume | Scatter or Histogram |
| Weibull / normal probability paper | Points that should fall on a straight line after a transform | Scale (later) | Scatter |
| Duration / flow-duration | Exceedance against log or probability | Scale, then costume | Line |
| S-N / Wöhler | Life against stress on log-log | Scale, then costume | Scatter |

### Annotation

| Name | The data job | Lane | Host if any |
|---|---|---|---|
| Shewhart / X-bar-R / I-MR / p / c / u | Series plus centre line plus control limits plus rules | Shipped as API | Line `guides` + `bands` |
| CUSUM / EWMA | Transformed series against limits | Annotation | Line; transform is data |
| Capability histogram | Distribution plus specification limits | Costumed | Histogram fig 1, 200ms and SLO 800ms guides |
| Volcano | Effect against significance with cut lines | Costumed | Scatter fig 2 |
| Bland-Altman / MA | Mean against difference with bias and limits | Annotation | Scatter `guides` |
| Control / SLO / error-budget | Series against a contract | Shipped as API | Line or Area `guides` |

### Host prop or tile

| Name | The data job | Lane | Host if any |
|---|---|---|---|
| Kaplan-Meier | Step survival plus censor ticks plus band | Costumed | Line fig 3 |
| Hex waffle / unit honeycomb | One cell, one unit, hex tiling | Host prop (do not build until asked) | Waffle `mark` |
| Radial tree / circular dendrogram | Hierarchy on polar paper | Host prop if ever | Tree / Dendrogram `layout` |
| Honeycomb map / hex tile map / tilegram | One region, one hex | Shipped | `HEX_TILES` on Choropleth fig 2 |
| Hexbin map (geo) | Point density on geography | Costume or world helper | Hexbin is cartesian; a geo hex grid is tiles + counts |
| OHLC bar / Heikin-Ashi | Same four prices, different mark | Host prop (do not build until asked) | Candlestick |
| 2d square histogram | Square bins of a point cloud | Host prop (do not build until asked) | Hexbin `mark` |

### Composition

| Name | The data job | Lane | Recipe |
|---|---|---|---|
| Pareto | Ranked magnitude plus cumulative share | Composition | Column + Line |
| Raincloud | Shape plus summary plus raw points | Composition | Violin + BoxPlot + Beeswarm |
| Scatterplot matrix / pair plot | Every pair of variables | Composition | SmallMultiples of Scatter |
| Dual-axis / combo | Two units on one frame | Composition (prefer facets) | Two charts; dual axes stay out of the package |
| Forest (as a page) | Labeled studies, interval, pooled mark | Composition | RangeBar + userland diamond |
| Cluster heatmap | Matrix ordered by two dendrograms | Composition first | Heatmap + Dendrogram; promote only if lockstep permutation cannot be fair |
| Instrument cluster / small multiples | Several of the same form | Composition | SmallMultiples (already) |
| Stat tile / KPI card | Number plus chrome plus a micro chart | Composition | Sparkline inside user HTML |
| Bundle / city metaphor | Hierarchy plus area plus extra chrome | Composition | Treemap or Sunburst |

### Costume (flagship on an existing form)

| Name | The data job | Host |
|---|---|---|
| Spectrogram / waterfall FFT / Campbell | Time × frequency × energy | Heatmap; traces as Line overlays |
| Volume profile / market profile | Volume against price | Histogram, or a bar beside Candlestick in user markup |
| Depth / order book | Bid and ask cumulative size | MirroredArea or PopulationPyramid |
| Footprint / liquidity heatmap | Volume at price × time | Heatmap |
| Drawdown / underwater | Area under a peak | Area or DifferenceArea |
| Calendar returns | Month × year of a signed rate | Heatmap `calendar` |
| Fan / cone of uncertainty | Nested quantile envelopes | Line `bands` (KM fig uses this) |
| Efficient frontier | Cloud plus a path on the cheap-good corner | ConnectedScatter + Scatter |
| Wind rose / wave rose | Direction × intensity | PolarArea |
| Hovmöller | Space × time of a field | Heatmap |
| Trace waterfall / span chart | Timed intervals | Gantt |
| Flame / icicle of stacks | Width is time or samples | Icicle |
| Service map / call graph | Directed relations | Network, ArcDiagram, or Sankey |
| SHAP beeswarm | One swarm per feature, colored | Beeswarm |
| Partial dependence / ICE | Response against one feature | Line series or SmallMultiples |
| Confusion matrix | Labeled counts | Heatmap `values` |
| Manhattan / Miami | Position against −log p | Column or Scatter (the x axis is concatenated regions) |
| RECIST waterfall / swimmer | Signed change per subject, or a subject timeline | Waterfall or Gantt |
| Phylogeny / cladogram | Rooted tree with branch lengths | Dendrogram or Tree |
| Stress-strain, I-V, titration, DSC | Controlled x, measured y | Line or ConnectedScatter |
| Hydrograph | Discharge against time | Line |
| Nyquist | Path on the complex plane | ConnectedScatter |
| Eye / constellation | Overlaid cycles or IQ points | Scatter or Hexbin |
| Risk matrix | Discrete severity × likelihood | Heatmap |
| Correlogram | Correlation matrix | Heatmap |

### New form (only after the lanes above)

| Name | Why it is a new job | When to open it |
|---|---|---|
| Ternary | Three parts that sum to one; cartesian axes would lie | A materials, geology, or formulation figure cannot be told without it |
| Parallel sets | Axes are variables; ribbons are the joint distribution. Sankey nodes are entities. | A categorical flow across three or more dimensions is a real demand |
| Cluster heatmap as a form | Shared permutation is the chart | The composition recipe has been tried and the lockstep layout cannot be fair |
| Isoline / isopleth map | Level sets on real geography; `Contour` is a cartesian point-cloud ellipse | Geographic continuous fields become a product demand |
| Cartogram (value-warped geography) | Area encodes the measure | Do not open without a specific figure; heavy, and rare outside elections and epidemiology |

Radial tree is listed under host prop, not here. Circos is a circular multi-track layout; `Chord` is one track. Circos as a product is a genome browser, not a vocabulary plate. Leave it closed.

### Never

| Name | Why |
|---|---|
| Word cloud, tag cloud, phrase net | Decoration that fights comparison |
| 3D pie, 3D column, prism map | Occlusion as a feature |
| Chernoff faces, glyph soup | Unreadable encoding |
| Spiral calendar, decorative radar variants | Costume of Heatmap or Radar at best |
| Flowchart, fishbone, value stream, PERT cosmetics, org chart, mermaid | Diagrams; the first mermaid wall was rejected |
| Smith, Skew-T, tephigram, stereonet, CIE chromaticity | One-discipline paper |
| Force-directed network | Non-deterministic, client simulation |
| Three-or-more Venn / Euler | Upset is the form past two sets |
| KpiTile | Copy in props |
| Hive plot, hierarchical edge bundling, Voronoi treemap, Dorling / Demers | Real, rare, and not what production is missing |

## Ordered backlog

Do not start a new form while a higher row is still open and would absorb the request.

1. **Log scale on cartesian hosts.** Shipped.
2. **`guides` on the cartesian hosts that take a value axis.** Shipped on Line, Area, Scatter, ConnectedScatter, Histogram, Column, Bar, RangeBar. Remaining cartesian hosts (box, violin, stacked, …) get `guides` when a figure needs them, not as a sweep.
3. **Line mark kind `censor`.** Shipped. Line fig 3 is the Kaplan-Meier costume.
4. **Hex cell + `HEX_TILES`.** Shipped. Choropleth fig 2 is the honeycomb map.
5. **Costumes still worth writing as figures**, not exports: spectrogram (Heatmap), flame (Icicle, already the semantics), depth (MirroredArea). Bode, wind rose, forest, volcano, KM, hex map are drawn.
6. **New forms, and only if 1 to 5 still cannot tell the story:** ternary, then parallel sets, then a lockstep cluster heatmap.

A request that is not in this file is classified here first. A request that is already in a lane is implemented in that lane. Do not add a parallel mechanism.

## Honeycomb, specifically

| What people say | What it is | Status |
|---|---|---|
| 蜂窝图 as density | Hexagonal binning of a point cloud | Shipped: `Hexbin` |
| 蜂群图 | One-dimensional jittered distribution | Shipped: `Beeswarm` |
| Hexagon as a scatter marker | A point shape | Shipped on ConnectedScatter |
| 蜂窝图 as a hex waffle | Unit chart on a hex grid | Not shipped; host prop on Waffle if ever |
| 蜂窝图 as a hex map | One region, one hex | Not shipped; tile preset, not a new form |
| Hexbin on a real map | Counts in geo hexes | Not shipped; tiles plus counts, or a world helper |

## Maintenance

When a costume figure ships, mark the row costumed. When a lane item ships (scale, guides, hex tiles), write the prop names into the lane section so this file stays the API memory, not a wishlist. When a new form ships, add the ceiling row in the same change and delete it from "New form" above. Do not let this file and [ceiling.md](./ceiling.md) disagree about what is a plate.
