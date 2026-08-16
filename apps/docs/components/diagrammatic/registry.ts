import type { DemoExample } from "./demos/types";
import { examples as lineExamples } from "./demos/line";
import { examples as areaExamples } from "./demos/area";
import { examples as stackedAreaExamples } from "./demos/stacked-area";
import { examples as streamgraphExamples } from "./demos/streamgraph";
import { examples as mirroredAreaExamples } from "./demos/mirrored-area";
import { examples as slopeExamples } from "./demos/slope";
import { examples as bumpExamples } from "./demos/bump";
import { examples as candlestickExamples } from "./demos/candlestick";
import { examples as horizonExamples } from "./demos/horizon";
import { examples as ganttExamples } from "./demos/gantt";
import { examples as barExamples } from "./demos/bar";
import { examples as columnExamples } from "./demos/column";
import { examples as groupedBarExamples } from "./demos/grouped-bar";
import { examples as stackedBarExamples } from "./demos/stacked-bar";
import { examples as lollipopExamples } from "./demos/lollipop";
import { examples as dotPlotExamples } from "./demos/dot-plot";
import { examples as leaderboardExamples } from "./demos/leaderboard";
import { examples as pictogramExamples } from "./demos/pictogram";
import { examples as radialBarExamples } from "./demos/radial-bar";
import { examples as polarAreaExamples } from "./demos/polar-area";
import { examples as pieExamples } from "./demos/pie";
import { examples as waffleExamples } from "./demos/waffle";
import { examples as treemapExamples } from "./demos/treemap";
import { examples as sunburstExamples } from "./demos/sunburst";
import { examples as icicleExamples } from "./demos/icicle";
import { examples as circlePackingExamples } from "./demos/circle-packing";
import { examples as marimekkoExamples } from "./demos/marimekko";
import { examples as funnelExamples } from "./demos/funnel";
import { examples as histogramExamples } from "./demos/histogram";
import { examples as boxPlotExamples } from "./demos/box-plot";
import { examples as violinExamples } from "./demos/violin";
import { examples as ridgelineExamples } from "./demos/ridgeline";
import { examples as beeswarmExamples } from "./demos/beeswarm";
import { examples as stripPlotExamples } from "./demos/strip-plot";
import { examples as populationPyramidExamples } from "./demos/population-pyramid";
import { examples as scatterExamples } from "./demos/scatter";
import { examples as connectedScatterExamples } from "./demos/connected-scatter";
import { examples as hexbinExamples } from "./demos/hexbin";
import { examples as contourExamples } from "./demos/contour";
import { examples as heatmapExamples } from "./demos/heatmap";
import { examples as quadrantExamples } from "./demos/quadrant";
import { examples as parallelCoordinatesExamples } from "./demos/parallel-coordinates";
import { examples as radarExamples } from "./demos/radar";
import { examples as divergingBarExamples } from "./demos/diverging-bar";
import { examples as divergingStackedExamples } from "./demos/diverging-stacked";
import { examples as dumbbellExamples } from "./demos/dumbbell";
import { examples as differenceAreaExamples } from "./demos/difference-area";
import { examples as sankeyExamples } from "./demos/sankey";
import { examples as chordExamples } from "./demos/chord";
import { examples as waterfallExamples } from "./demos/waterfall";
import { examples as networkExamples } from "./demos/network";
import { examples as arcDiagramExamples } from "./demos/arc-diagram";
import { examples as treeExamples } from "./demos/tree";
import { examples as dendrogramExamples } from "./demos/dendrogram";
import { examples as vennExamples } from "./demos/venn";
import { examples as choroplethExamples } from "./demos/choropleth";
import { examples as symbolMapExamples } from "./demos/symbol-map";
import { examples as dotMapExamples } from "./demos/dot-map";
import { examples as flowMapExamples } from "./demos/flow-map";
import { examples as sparklineExamples } from "./demos/sparkline";
import { examples as sparkbarExamples } from "./demos/sparkbar";
import { examples as winLossExamples } from "./demos/win-loss";
import { examples as bulletExamples } from "./demos/bullet";
import { examples as progressRingExamples } from "./demos/progress-ring";
import { examples as gaugeExamples } from "./demos/gauge";
import { examples as splitBarExamples } from "./demos/split-bar";

type ChartInput = {
  slug: string;
  name: string;
  blurb: string;
  use: string;
  watch: string;
  exportName: string;
  examples: DemoExample[];
};

type SectionInput = {
  label: string;
  intro: string;
  charts: ChartInput[];
};

const SECTIONS: SectionInput[] = [
  {
    label: "Change over time",
    intro:
      "Trends, rhythms, and histories. The x axis is time; everything else is a choice.",
    charts: [
      {
        slug: "line",
        exportName: "Line",
        name: "Line",
        blurb: "The default for anything over time.",
        use: "Trends, rates, and anything measured on a continuous timeline.",
        watch:
          "More than four lines turns to spaghetti; facet into small multiples instead.",
        examples: lineExamples,
      },
      {
        slug: "area",
        exportName: "Area",
        name: "Area",
        blurb: "A line with the magnitude filled in.",
        use: "A single quantity where the volume under the trend matters.",
        watch:
          "Filled layers hide each other; for several series use a stacked area or separate panels.",
        examples: areaExamples,
      },
      {
        slug: "stacked-area",
        exportName: "StackedArea",
        name: "Stacked area",
        blurb: "How a total splits over time.",
        use: "A total and its parts moving together through time.",
        watch:
          "Middle bands ride on wobbly baselines; only the bottom band and the total read precisely.",
        examples: stackedAreaExamples,
      },
      {
        slug: "streamgraph",
        exportName: "Streamgraph",
        name: "Streamgraph",
        blurb: "A stacked area centered on its own flow.",
        use: "Organic part-to-whole rhythm over long ranges, where shape outranks exact values.",
        watch:
          "There is no readable axis; if someone needs numbers, use a stacked area.",
        examples: streamgraphExamples,
      },
      {
        slug: "mirrored-area",
        exportName: "MirroredArea",
        name: "Mirrored area",
        blurb: "Two directions of one flow, split by an axis.",
        use: "Paired in-and-out volumes: download against upload, inbound against outbound.",
        watch:
          "The two halves share a scale by convention; label both directions or one gets misread.",
        examples: mirroredAreaExamples,
      },
      {
        slug: "slope",
        exportName: "Slope",
        name: "Slope",
        blurb: "Two moments, joined by their change.",
        use: "Before-and-after across many entities, where the slope is the story.",
        watch:
          "Crossing lines get busy past a dozen entities; highlight a few and mute the rest.",
        examples: slopeExamples,
      },
      {
        slug: "bump",
        exportName: "Bump",
        name: "Bump",
        blurb: "Rank over time, crossings included.",
        use: "League tables and rankings where position matters more than value.",
        watch: "Ranks hide magnitudes; a one-place drop can be a landslide.",
        examples: bumpExamples,
      },
      {
        slug: "candlestick",
        exportName: "Candlestick",
        name: "Candlestick",
        blurb: "Open, close, high, and low per interval.",
        use: "Price movement summaries where range and direction both matter.",
        watch:
          "Each candle needs comfortable width; compress too far and wicks turn to noise.",
        examples: candlestickExamples,
      },
      {
        slug: "horizon",
        exportName: "Horizon",
        name: "Horizon",
        blurb: "A tall line folded into a short band.",
        use: "Dense grids of many series where vertical space is scarce.",
        watch:
          "Readers need a key to unfold the layers; keep the fold count at two or three.",
        examples: horizonExamples,
      },
      {
        slug: "gantt",
        exportName: "Gantt",
        name: "Gantt",
        blurb: "Work laid out against the calendar.",
        use: "Schedules, phases, and overlaps across a project window.",
        watch:
          "It shows plan, not progress; pair the bars with a done state or a today line.",
        examples: ganttExamples,
      },
    ],
  },
  {
    label: "Comparison",
    intro: "Magnitude across categories: which is bigger, and by how much.",
    charts: [
      {
        slug: "bar",
        exportName: "Bar",
        name: "Bar",
        blurb: "Magnitude by category, read sideways.",
        use: "Category comparisons with long labels; the horizontal layout gives names room.",
        watch:
          "Start the value axis at zero; a trimmed baseline lies about ratios.",
        examples: barExamples,
      },
      {
        slug: "column",
        exportName: "Column",
        name: "Column",
        blurb: "Magnitude by category, standing up.",
        use: "A handful of categories or periods side by side.",
        watch:
          "Past a dozen columns the labels collide; go horizontal instead.",
        examples: columnExamples,
      },
      {
        slug: "grouped-bar",
        exportName: "GroupedBar",
        name: "Grouped bar",
        blurb: "Sub-categories, shoulder to shoulder.",
        use: "Two or three series compared within each category.",
        watch:
          "Four or more bars per cluster stops being comparable; split into small multiples.",
        examples: groupedBarExamples,
      },
      {
        slug: "stacked-bar",
        exportName: "StackedBar",
        name: "Stacked bar",
        blurb: "Totals with their composition.",
        use: "Totals first, composition second, across categories.",
        watch:
          "Only the bottom segment sits on a common baseline; middle segments resist comparison.",
        examples: stackedBarExamples,
      },
      {
        slug: "lollipop",
        exportName: "Lollipop",
        name: "Lollipop",
        blurb: "A bar reduced to its point.",
        use: "The same jobs as bars with less ink, kinder to dense category lists.",
        watch:
          "The dot marks the value; stems thick enough to read as bars defeat the point.",
        examples: lollipopExamples,
      },
      {
        slug: "dot-plot",
        exportName: "DotPlot",
        name: "Dot plot",
        blurb: "One dot per category on a common scale.",
        use: "Precise category values without the visual weight of bars.",
        watch:
          "It needs a visible scale; dots floating in space rank but do not measure.",
        examples: dotPlotExamples,
      },
      {
        slug: "leaderboard",
        exportName: "Leaderboard",
        name: "Leaderboard",
        blurb: "Ranked rows with inline bars.",
        use: "Top-N lists where names, values, and proportion all need to be present.",
        watch:
          "Cap the list and fold the tail into Other; a 40-row leaderboard is a table.",
        examples: leaderboardExamples,
      },
      {
        slug: "pictogram",
        exportName: "Pictogram",
        name: "Pictogram",
        blurb: "Counts as repeated units.",
        use: "Small countable quantities with human weight: people, seats, incidents.",
        watch:
          "Partial units confuse; round honestly and never scale the icon itself.",
        examples: pictogramExamples,
      },
      {
        slug: "radial-bar",
        exportName: "RadialBar",
        name: "Radial bar",
        blurb: "Bars bent around a circle.",
        use: "A few progress-like values with strong visual identity.",
        watch:
          "Outer rings are longer at equal value; it decorates more than it measures.",
        examples: radialBarExamples,
      },
      {
        slug: "polar-area",
        exportName: "PolarArea",
        name: "Polar area",
        blurb: "Sector radius carries the value.",
        use: "Cyclic categories with a dramatic shape, the Nightingale rose.",
        watch:
          "Area grows with the square of radius; readers overestimate the big sectors.",
        examples: polarAreaExamples,
      },
    ],
  },
  {
    label: "Part to whole",
    intro:
      "Composition: how a total divides, in slices, cells, and nested area.",
    charts: [
      {
        slug: "pie",
        exportName: "Pie",
        name: "Pie",
        blurb: "The share of a whole, at a glance.",
        use: "Two to four shares where the headline is one dominant slice.",
        watch:
          "Angles compare poorly; five or more slices belong in a bar chart.",
        examples: pieExamples,
      },
      {
        slug: "waffle",
        exportName: "Waffle",
        name: "Waffle",
        blurb: "Percentages as a grid of cells.",
        use: "Shares that people can count, roughly one cell per percent.",
        watch:
          "It works to about four groups; beyond that the runs of color blur together.",
        examples: waffleExamples,
      },
      {
        slug: "treemap",
        exportName: "Treemap",
        name: "Treemap",
        blurb: "Nested totals as nested area.",
        use: "Hierarchical composition with many leaves, biggest first.",
        watch:
          "Area compares poorly across distant tiles; label the few that matter.",
        examples: treemapExamples,
      },
      {
        slug: "sunburst",
        exportName: "Sunburst",
        name: "Sunburst",
        blurb: "A hierarchy unrolled into rings.",
        use: "Two or three levels of composition around a common center.",
        watch:
          "Outer rings exaggerate; deep hierarchies read better as an icicle.",
        examples: sunburstExamples,
      },
      {
        slug: "icicle",
        exportName: "Icicle",
        name: "Icicle",
        blurb: "A hierarchy in straight rows.",
        use: "Drill-down composition where the rectangles stay comparable.",
        watch:
          "Depth eats height quickly; show the levels people actually navigate.",
        examples: icicleExamples,
      },
      {
        slug: "circle-packing",
        exportName: "CirclePacking",
        name: "Circle packing",
        blurb: "Containment as nested circles.",
        use: "Cluster membership and relative size with an organic feel.",
        watch:
          "Packing wastes space and distorts comparison; use it for structure, not measurement.",
        examples: circlePackingExamples,
      },
      {
        slug: "marimekko",
        exportName: "Marimekko",
        name: "Marimekko",
        blurb: "Two dimensions of share in one rectangle.",
        use: "Market maps: segment width by size, then split each by composition.",
        watch:
          "It takes practice to read; annotate the one or two cells that carry the story.",
        examples: marimekkoExamples,
      },
      {
        slug: "funnel",
        exportName: "Funnel",
        name: "Funnel",
        blurb: "Stage-by-stage survival.",
        use: "Conversion pipelines where each stage is a subset of the last.",
        watch: "The taper exaggerates; label every stage with its real rate.",
        examples: funnelExamples,
      },
    ],
  },
  {
    label: "Distribution",
    intro: "The shape of the data: spread, skew, clusters, and outliers.",
    charts: [
      {
        slug: "histogram",
        exportName: "Histogram",
        name: "Histogram",
        blurb: "Frequency by bin.",
        use: "The shape of one variable: skew, spread, and outliers.",
        watch: "Bin width changes the story; try several before trusting one.",
        examples: histogramExamples,
      },
      {
        slug: "box-plot",
        exportName: "BoxPlot",
        name: "Box plot",
        blurb: "Median, quartiles, and whiskers.",
        use: "Comparing distributions across groups on one scale.",
        watch:
          "It hides multimodality; a two-humped group looks like a calm box.",
        examples: boxPlotExamples,
      },
      {
        slug: "violin",
        exportName: "Violin",
        name: "Violin",
        blurb: "A box plot with its shape restored.",
        use: "Group comparisons where the full density profile matters.",
        watch:
          "Small samples make confident-looking violins; show the sample size.",
        examples: violinExamples,
      },
      {
        slug: "ridgeline",
        exportName: "Ridgeline",
        name: "Ridgeline",
        blurb: "Distributions in overlapping rows.",
        use: "How a distribution drifts across many groups or time slices.",
        watch:
          "Overlap hides valleys behind peaks; order the rows meaningfully.",
        examples: ridgelineExamples,
      },
      {
        slug: "beeswarm",
        exportName: "Beeswarm",
        name: "Beeswarm",
        blurb: "Every point, nudged apart.",
        use: "Small datasets where each observation deserves its own dot.",
        watch:
          "Past a few hundred points the swarm congeals; switch to a density.",
        examples: beeswarmExamples,
      },
      {
        slug: "strip-plot",
        exportName: "StripPlot",
        name: "Strip plot",
        blurb: "Raw points along a line.",
        use: "Quick distribution reads and honest small-n comparisons.",
        watch: "Identical values overplot; jitter, or shift to a beeswarm.",
        examples: stripPlotExamples,
      },
      {
        slug: "population-pyramid",
        exportName: "PopulationPyramid",
        name: "Population pyramid",
        blurb: "Two distributions, back to back.",
        use: "Age and cohort structure compared between two groups.",
        watch:
          "Mirrored bars resist precise comparison; overlay them if exact gaps matter.",
        examples: populationPyramidExamples,
      },
    ],
  },
  {
    label: "Correlation & multivariate",
    intro:
      "How measures move together, and profiles across many dimensions at once.",
    charts: [
      {
        slug: "scatter",
        exportName: "Scatter",
        name: "Scatter",
        blurb: "Two variables, one dot each.",
        use: "Relationships, clusters, and outliers between two measures.",
        watch:
          "The trend line is a summary, not proof; correlation is not causation.",
        examples: scatterExamples,
      },
      {
        slug: "connected-scatter",
        exportName: "ConnectedScatter",
        name: "Connected scatter",
        blurb: "A scatter walked through time.",
        use: "How two measures moved together across ordered periods.",
        watch: "It needs a start and end cue; unlabeled loops disorient.",
        examples: connectedScatterExamples,
      },
      {
        slug: "hexbin",
        exportName: "Hexbin",
        name: "Hexbin",
        blurb: "Density where dots would overflow.",
        use: "Tens of thousands of points binned into honest cells.",
        watch:
          "Bin size sets the story and empty cells matter; show the scale.",
        examples: hexbinExamples,
      },
      {
        slug: "contour",
        exportName: "Contour",
        name: "Contour",
        blurb: "Density as elevation lines.",
        use: "The shape of a dense 2D distribution without overplotting.",
        watch: "Levels are model output; annotate what each band means.",
        examples: contourExamples,
      },
      {
        slug: "heatmap",
        exportName: "Heatmap",
        name: "Heatmap",
        blurb: "A matrix colored by value.",
        use: "Category-by-category intensity: confusion matrices, correlations, schedules.",
        watch: "One sequential ramp only; a rainbow scrambles the order.",
        examples: heatmapExamples,
      },
      {
        slug: "quadrant",
        exportName: "Quadrant",
        name: "Quadrant",
        blurb: "A scatter cut into four decisions.",
        use: "Prioritization maps: effort against impact, risk against reward.",
        watch:
          "The cut lines are editorial; be ready to defend where the crosshair sits.",
        examples: quadrantExamples,
      },
      {
        slug: "parallel-coordinates",
        exportName: "ParallelCoordinates",
        name: "Parallel coordinates",
        blurb: "Each axis a dimension, each line a record.",
        use: "Spotting profiles and trade-offs across four or more measures.",
        watch:
          "Axis order changes the picture; normalize each axis and say so.",
        examples: parallelCoordinatesExamples,
      },
      {
        slug: "radar",
        exportName: "Radar",
        name: "Radar",
        blurb: "A profile drawn around a center.",
        use: "Two or three profiles compared across a handful of shared dimensions.",
        watch:
          "Shape area misleads and axis order is arbitrary; bars are often clearer.",
        examples: radarExamples,
      },
    ],
  },
  {
    label: "Deviation",
    intro: "Signed difference from a reference: zero, neutral, or a target.",
    charts: [
      {
        slug: "diverging-bar",
        exportName: "DivergingBar",
        name: "Diverging bar",
        blurb: "Signed values from a shared zero.",
        use: "Surplus against deficit, growth against decline, by category.",
        watch:
          "Sort by value, not alphabet, so the sign structure stays visible.",
        examples: divergingBarExamples,
      },
      {
        slug: "diverging-stacked",
        exportName: "DivergingStacked",
        name: "Diverging stacked bar",
        blurb: "Sentiment centered on neutral.",
        use: "Likert scales and any agree-versus-disagree balance.",
        watch:
          "Anchor rows on the neutral midpoint or the comparison collapses.",
        examples: divergingStackedExamples,
      },
      {
        slug: "dumbbell",
        exportName: "Dumbbell",
        name: "Dumbbell",
        blurb: "Then and now, one row per entity.",
        use: "Before-and-after gaps across categories without slope clutter.",
        watch: "Two points only; for the path between them use a slope chart.",
        examples: dumbbellExamples,
      },
      {
        slug: "difference-area",
        exportName: "DifferenceArea",
        name: "Difference area",
        blurb: "The gap between two lines, shaded.",
        use: "Actual against target where being above or below is the story.",
        watch:
          "Shade the gap, not the lines, and reserve the two hues for sign.",
        examples: differenceAreaExamples,
      },
    ],
  },
  {
    label: "Flow",
    intro: "Quantities in motion between states, stages, and totals.",
    charts: [
      {
        slug: "sankey",
        exportName: "Sankey",
        name: "Sankey",
        blurb: "Where quantities come from and go.",
        use: "Distribution across stages: sources into channels into destinations.",
        watch: "Links must conserve; leaks and rounding need explaining.",
        examples: sankeyExamples,
      },
      {
        slug: "chord",
        exportName: "Chord",
        name: "Chord",
        blurb: "Flows between peers around a circle.",
        use: "Dense mutual exchange: migration, trade, traffic between equals.",
        watch:
          "Beautiful and hard to read; reserve it for genuinely circular relationships.",
        examples: chordExamples,
      },
      {
        slug: "waterfall",
        exportName: "Waterfall",
        name: "Waterfall",
        blurb: "How a total was built, step by step.",
        use: "Bridges from a starting figure through gains and losses to an end.",
        watch:
          "Floating bars confuse without connectors and clear sign colors.",
        examples: waterfallExamples,
      },
    ],
  },
  {
    label: "Networks & hierarchy",
    intro: "Structure itself: what connects to what, and what contains what.",
    charts: [
      {
        slug: "network",
        exportName: "Network",
        name: "Network",
        blurb: "Entities and their relationships.",
        use: "Structure in connections: hubs, bridges, and islands.",
        watch:
          "Force layouts are unstable art; pin the nodes readers must find.",
        examples: networkExamples,
      },
      {
        slug: "arc-diagram",
        exportName: "ArcDiagram",
        name: "Arc diagram",
        blurb: "A network flattened onto one line.",
        use: "Connection patterns over an ordered set, sequences especially.",
        watch: "Node order decides everything; sort it on purpose.",
        examples: arcDiagramExamples,
      },
      {
        slug: "tree",
        exportName: "Tree",
        name: "Tree",
        blurb: "Parent-child structure, top down.",
        use: "Org charts, file systems, and decision paths.",
        watch:
          "Wide levels squeeze; collapse subtrees rather than shrinking the type.",
        examples: treeExamples,
      },
      {
        slug: "dendrogram",
        exportName: "Dendrogram",
        name: "Dendrogram",
        blurb: "Merge history as brackets.",
        use: "Hierarchical clustering: what joined what, and how early.",
        watch:
          "Height is the metric; cutting at a level is what defines the clusters.",
        examples: dendrogramExamples,
      },
      {
        slug: "venn",
        exportName: "Venn",
        name: "Venn",
        blurb: "Set overlap, literally.",
        use: "Two or three sets where the overlap is the message.",
        watch: "Region area rarely matches the counts; label every region.",
        examples: vennExamples,
      },
    ],
  },
  {
    label: "Spatial",
    intro: "Values placed on geography, drawn here on an abstract tile map.",
    charts: [
      {
        slug: "choropleth",
        exportName: "ABSTRACT_TILES",
        name: "Choropleth",
        blurb: "Regions colored by value.",
        use: "Rates and ratios across regions on one sequential ramp.",
        watch: "Big areas dominate; map rates, never raw counts.",
        examples: choroplethExamples,
      },
      {
        slug: "symbol-map",
        exportName: "SymbolMap",
        name: "Symbol map",
        blurb: "Sized marks on places.",
        use: "Absolute quantities at locations, where counts stay honest.",
        watch:
          "Overlapping circles occlude; scale by area and show a size legend.",
        examples: symbolMapExamples,
      },
      {
        slug: "dot-map",
        exportName: "ABSTRACT_TILES",
        name: "Dot map",
        blurb: "One dot, one unit, placed.",
        use: "Density and settlement patterns that emerge from individual units.",
        watch:
          "Placement within a region is approximate; say what one dot equals.",
        examples: dotMapExamples,
      },
      {
        slug: "flow-map",
        exportName: "FlowMap",
        name: "Flow map",
        blurb: "Movement between places.",
        use: "Origin-to-destination volumes: routes, trade, migration.",
        watch: "More than a handful of routes tangles; bundle or filter.",
        examples: flowMapExamples,
      },
    ],
  },
  {
    label: "Micro",
    intro:
      "Charts the size of a word, built to live inside tables, tiles, and sentences.",
    charts: [
      {
        slug: "sparkline",
        exportName: "Sparkline",
        name: "Sparkline",
        blurb: "A trend the size of a word.",
        use: "Inline context in tables and tiles: direction at a glance.",
        watch: "No axes means no precision; pair it with the current value.",
        examples: sparklineExamples,
      },
      {
        slug: "sparkbar",
        exportName: "Sparkbar",
        name: "Sparkbar",
        blurb: "A bar series the size of a word.",
        use: "Discrete periods inline: recent counts beside their label.",
        watch: "Keep one scale across sibling rows or the comparison lies.",
        examples: sparkbarExamples,
      },
      {
        slug: "win-loss",
        exportName: "WinLoss",
        name: "Win-loss",
        blurb: "Outcome sequences as up-down ticks.",
        use: "Streaks and momentum across repeated binary events.",
        watch: "Two states only; when magnitude matters, use a sparkbar.",
        examples: winLossExamples,
      },
      {
        slug: "bullet",
        exportName: "Bullet",
        name: "Bullet",
        blurb: "A KPI against target and bands.",
        use: "Dashboard measures with qualitative context in minimal height.",
        watch: "Explain the bands once; unlabeled shading is decoration.",
        examples: bulletExamples,
      },
      {
        slug: "progress-ring",
        exportName: "ProgressRing",
        name: "Progress ring",
        blurb: "Completion, wrapped in a circle.",
        use: "Single completion states in cards, lists, and avatars.",
        watch:
          "Rings past 100% or holding several values stop reading; use a bar.",
        examples: progressRingExamples,
      },
      {
        slug: "gauge",
        exportName: "Gauge",
        name: "Gauge",
        blurb: "A dial with one number on it.",
        use: "A single bounded value where alarm zones matter.",
        watch: "It spends a lot of space on one number; a bullet is denser.",
        examples: gaugeExamples,
      },
      {
        slug: "split-bar",
        exportName: "SplitBar",
        name: "Split bar",
        blurb: "One row, two shares.",
        use: "Inline two-way proportions: sent against received, hit against miss.",
        watch: "Two segments only; more shares deserve a real stacked bar.",
        examples: splitBarExamples,
      },
    ],
  },
];

export type Chart = ChartInput & {
  section: string;
  sectionIndex: number;
  index: number;
};

export type ChartSection = {
  label: string;
  intro: string;
  charts: Chart[];
};

let running = 0;
export const CHART_SECTIONS: ChartSection[] = SECTIONS.map(
  (section, sectionIndex) => ({
    label: section.label,
    intro: section.intro,
    charts: section.charts.map((chart) => {
      running += 1;
      return { ...chart, section: section.label, sectionIndex, index: running };
    }),
  }),
);

export const CHARTS: Chart[] = CHART_SECTIONS.flatMap(
  (section) => section.charts,
);

export const CHART_COUNT = CHARTS.length;
export const SECTION_COUNT = CHART_SECTIONS.length;

export function sectionId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function getChart(slug: string): Chart | undefined {
  return CHARTS.find((chart) => chart.slug === slug);
}
