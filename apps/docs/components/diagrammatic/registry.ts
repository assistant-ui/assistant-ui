import type { ComponentType } from "react";
import { LineChart } from "./charts/line";
import { AreaChart } from "./charts/area";
import { StackedAreaChart } from "./charts/stacked-area";
import { StreamgraphChart } from "./charts/streamgraph";
import { MirroredAreaChart } from "./charts/mirrored-area";
import { StepLineChart } from "./charts/step-line";
import { SlopeChart } from "./charts/slope";
import { BumpChart } from "./charts/bump";
import { CandlestickChart } from "./charts/candlestick";
import { HorizonChart } from "./charts/horizon";
import { GanttChart } from "./charts/gantt";
import { CalendarHeatmapChart } from "./charts/calendar-heatmap";
import { PunchcardChart } from "./charts/punchcard";
import { BarChart } from "./charts/bar";
import { ColumnChart } from "./charts/column";
import { GroupedBarChart } from "./charts/grouped-bar";
import { StackedBarChart } from "./charts/stacked-bar";
import { PercentStackedBarChart } from "./charts/percent-stacked-bar";
import { LollipopChart } from "./charts/lollipop";
import { DotPlotChart } from "./charts/dot-plot";
import { LeaderboardChart } from "./charts/leaderboard";
import { PictogramChart } from "./charts/pictogram";
import { RadialBarChart } from "./charts/radial-bar";
import { PolarAreaChart } from "./charts/polar-area";
import { PieChart } from "./charts/pie";
import { DonutChart } from "./charts/donut";
import { WaffleChart } from "./charts/waffle";
import { TreemapChart } from "./charts/treemap";
import { SunburstChart } from "./charts/sunburst";
import { IcicleChart } from "./charts/icicle";
import { CirclePackingChart } from "./charts/circle-packing";
import { MarimekkoChart } from "./charts/marimekko";
import { FunnelChart } from "./charts/funnel";
import { HistogramChart } from "./charts/histogram";
import { DensityChart } from "./charts/density";
import { BoxPlotChart } from "./charts/box-plot";
import { ViolinChart } from "./charts/violin";
import { RidgelineChart } from "./charts/ridgeline";
import { BeeswarmChart } from "./charts/beeswarm";
import { StripPlotChart } from "./charts/strip-plot";
import { PopulationPyramidChart } from "./charts/population-pyramid";
import { ScatterChart } from "./charts/scatter";
import { BubbleChart } from "./charts/bubble";
import { ConnectedScatterChart } from "./charts/connected-scatter";
import { HexbinChart } from "./charts/hexbin";
import { ContourChart } from "./charts/contour";
import { HeatmapChart } from "./charts/heatmap";
import { QuadrantChart } from "./charts/quadrant";
import { ParallelCoordinatesChart } from "./charts/parallel-coordinates";
import { RadarChart } from "./charts/radar";
import { DivergingBarChart } from "./charts/diverging-bar";
import { DivergingStackedChart } from "./charts/diverging-stacked";
import { DumbbellChart } from "./charts/dumbbell";
import { DifferenceAreaChart } from "./charts/difference-area";
import { SankeyChart } from "./charts/sankey";
import { ChordChart } from "./charts/chord";
import { WaterfallChart } from "./charts/waterfall";
import { NetworkChart } from "./charts/network";
import { ArcDiagramChart } from "./charts/arc-diagram";
import { TreeChart } from "./charts/tree";
import { DendrogramChart } from "./charts/dendrogram";
import { VennChart } from "./charts/venn";
import { ChoroplethChart } from "./charts/choropleth";
import { SymbolMapChart } from "./charts/symbol-map";
import { DotMapChart } from "./charts/dot-map";
import { FlowMapChart } from "./charts/flow-map";
import { SparklineChart } from "./charts/sparkline";
import { SparkbarChart } from "./charts/sparkbar";
import { WinLossChart } from "./charts/win-loss";
import { BulletChart } from "./charts/bullet";
import { ProgressRingChart } from "./charts/progress-ring";
import { GaugeChart } from "./charts/gauge";
import { SplitBarChart } from "./charts/split-bar";
import { KpiTileChart } from "./charts/kpi-tile";

type ChartInput = {
  slug: string;
  scenario: string;
  name: string;
  blurb: string;
  use: string;
  watch: string;
  Component: ComponentType;
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
        scenario: "Monthly active users, January to September",
        name: "Line",
        blurb: "The default for anything over time.",
        use: "Trends, rates, and anything measured on a continuous timeline.",
        watch:
          "More than four lines turns to spaghetti; facet into small multiples instead.",
        Component: LineChart,
      },
      {
        slug: "area",
        scenario: "Cumulative signups over the year",
        name: "Area",
        blurb: "A line with the magnitude filled in.",
        use: "A single quantity where the volume under the trend matters.",
        watch:
          "Filled layers hide each other; for several series use a stacked area or separate panels.",
        Component: AreaChart,
      },
      {
        slug: "stacked-area",
        scenario: "Site traffic by acquisition channel",
        name: "Stacked area",
        blurb: "How a total splits over time.",
        use: "A total and its parts moving together through time.",
        watch:
          "Middle bands ride on wobbly baselines; only the bottom band and the total read precisely.",
        Component: StackedAreaChart,
      },
      {
        slug: "streamgraph",
        scenario: "Listening hours by genre across a season",
        name: "Streamgraph",
        blurb: "A stacked area centered on its own flow.",
        use: "Organic part-to-whole rhythm over long ranges, where shape outranks exact values.",
        watch:
          "There is no readable axis; if someone needs numbers, use a stacked area.",
        Component: StreamgraphChart,
      },
      {
        slug: "mirrored-area",
        scenario:
          "Router throughput over one day: download above, upload below",
        name: "Mirrored area",
        blurb: "Two directions of one flow, split by an axis.",
        use: "Paired in-and-out volumes: download against upload, inbound against outbound.",
        watch:
          "The two halves share a scale by convention; label both directions or one gets misread.",
        Component: MirroredAreaChart,
      },
      {
        slug: "step-line",
        scenario: "Seat price across eight releases",
        name: "Step line",
        blurb: "Values that hold until they change.",
        use: "Prices, quotas, versions, and anything that jumps between plateaus.",
        watch:
          "Interpolating between steps invents data; the flat segments are the truth.",
        Component: StepLineChart,
      },
      {
        slug: "slope",
        scenario: "Share of media time, 2020 against 2025",
        name: "Slope",
        blurb: "Two moments, joined by their change.",
        use: "Before-and-after across many entities, where the slope is the story.",
        watch:
          "Crossing lines get busy past a dozen entities; highlight a few and mute the rest.",
        Component: SlopeChart,
      },
      {
        slug: "bump",
        scenario: "Frontend framework popularity rank across five years",
        name: "Bump",
        blurb: "Rank over time, crossings included.",
        use: "League tables and rankings where position matters more than value.",
        watch: "Ranks hide magnitudes; a one-place drop can be a landslide.",
        Component: BumpChart,
      },
      {
        slug: "candlestick",
        scenario: "A stock's two trading weeks, daily candles",
        name: "Candlestick",
        blurb: "Open, close, high, and low per interval.",
        use: "Price movement summaries where range and direction both matter.",
        watch:
          "Each candle needs comfortable width; compress too far and wicks turn to noise.",
        Component: CandlestickChart,
      },
      {
        slug: "horizon",
        scenario: "Server load across 24 hours, folded three times",
        name: "Horizon",
        blurb: "A tall line folded into a short band.",
        use: "Dense grids of many series where vertical space is scarce.",
        watch:
          "Readers need a key to unfold the layers; keep the fold count at two or three.",
        Component: HorizonChart,
      },
      {
        slug: "gantt",
        scenario: "A release plan from April to July, today marked",
        name: "Gantt",
        blurb: "Work laid out against the calendar.",
        use: "Schedules, phases, and overlaps across a project window.",
        watch:
          "It shows plan, not progress; pair the bars with a done state or a today line.",
        Component: GanttChart,
      },
      {
        slug: "calendar-heatmap",
        scenario: "Contribution activity across 16 weeks",
        name: "Calendar heatmap",
        blurb: "Weeks of days, colored by intensity.",
        use: "Daily habits and activity rhythms across weeks and months.",
        watch:
          "Weekday patterns dominate; normalize before comparing across rows.",
        Component: CalendarHeatmapChart,
      },
      {
        slug: "punchcard",
        scenario: "Commits by weekday and hour",
        name: "Punchcard",
        blurb: "Hour-by-weekday rhythm as dots.",
        use: "When during the week something happens, at a glance.",
        watch:
          "Dot area reads coarsely; keep exact values one hover or one table away.",
        Component: PunchcardChart,
      },
    ],
  },
  {
    label: "Comparison",
    intro: "Magnitude across categories: which is bigger, and by how much.",
    charts: [
      {
        slug: "bar",
        scenario: "Weekly npm downloads across frameworks",
        name: "Bar",
        blurb: "Magnitude by category, read sideways.",
        use: "Category comparisons with long labels; the horizontal layout gives names room.",
        watch:
          "Start the value axis at zero; a trimmed baseline lies about ratios.",
        Component: BarChart,
      },
      {
        slug: "column",
        scenario: "Quarterly revenue, seven quarters",
        name: "Column",
        blurb: "Magnitude by category, standing up.",
        use: "A handful of categories or periods side by side.",
        watch:
          "Past a dozen columns the labels collide; go horizontal instead.",
        Component: ColumnChart,
      },
      {
        slug: "grouped-bar",
        scenario: "Signups by region, split by plan",
        name: "Grouped bar",
        blurb: "Sub-categories, shoulder to shoulder.",
        use: "Two or three series compared within each category.",
        watch:
          "Four or more bars per cluster stops being comparable; split into small multiples.",
        Component: GroupedBarChart,
      },
      {
        slug: "stacked-bar",
        scenario: "Monthly cloud cost by service",
        name: "Stacked bar",
        blurb: "Totals with their composition.",
        use: "Totals first, composition second, across categories.",
        watch:
          "Only the bottom segment sits on a common baseline; middle segments resist comparison.",
        Component: StackedBarChart,
      },
      {
        slug: "percent-stacked-bar",
        scenario: "Device mix by year, shares only",
        name: "100% stacked bar",
        blurb: "Composition, with the totals normalized away.",
        use: "Share-of-whole comparisons when absolute size is a distraction.",
        watch:
          "The totals are gone; state somewhere what each column adds up to.",
        Component: PercentStackedBarChart,
      },
      {
        slug: "lollipop",
        scenario: "Satisfaction score by team",
        name: "Lollipop",
        blurb: "A bar reduced to its point.",
        use: "The same jobs as bars with less ink, kinder to dense category lists.",
        watch:
          "The dot marks the value; stems thick enough to read as bars defeat the point.",
        Component: LollipopChart,
      },
      {
        slug: "dot-plot",
        scenario: "Median salary by role",
        name: "Dot plot",
        blurb: "One dot per category on a common scale.",
        use: "Precise category values without the visual weight of bars.",
        watch:
          "It needs a visible scale; dots floating in space rank but do not measure.",
        Component: DotPlotChart,
      },
      {
        slug: "leaderboard",
        scenario: "Top referrers by visits",
        name: "Leaderboard",
        blurb: "Ranked rows with inline bars.",
        use: "Top-N lists where names, values, and proportion all need to be present.",
        watch:
          "Cap the list and fold the tail into Other; a 40-row leaderboard is a table.",
        Component: LeaderboardChart,
      },
      {
        slug: "pictogram",
        scenario: "Headcount by office, one square per ten people",
        name: "Pictogram",
        blurb: "Counts as repeated units.",
        use: "Small countable quantities with human weight: people, seats, incidents.",
        watch:
          "Partial units confuse; round honestly and never scale the icon itself.",
        Component: PictogramChart,
      },
      {
        slug: "radial-bar",
        scenario: "Quarterly goals, percent complete",
        name: "Radial bar",
        blurb: "Bars bent around a circle.",
        use: "A few progress-like values with strong visual identity.",
        watch:
          "Outer rings are longer at equal value; it decorates more than it measures.",
        Component: RadialBarChart,
      },
      {
        slug: "polar-area",
        scenario: "Wind hours by compass direction",
        name: "Polar area",
        blurb: "Sector radius carries the value.",
        use: "Cyclic categories with a dramatic shape, the Nightingale rose.",
        watch:
          "Area grows with the square of radius; readers overestimate the big sectors.",
        Component: PolarAreaChart,
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
        scenario: "Browser share of sessions",
        name: "Pie",
        blurb: "The share of a whole, at a glance.",
        use: "Two to four shares where the headline is one dominant slice.",
        watch:
          "Angles compare poorly; five or more slices belong in a bar chart.",
        Component: PieChart,
      },
      {
        slug: "donut",
        scenario: "128 GB of storage, by content type",
        name: "Donut",
        blurb: "A pie with room for a number.",
        use: "Share-of-whole with a KPI sitting in the middle.",
        watch: "The hole removes the angle anchor; keep the slice count low.",
        Component: DonutChart,
      },
      {
        slug: "waffle",
        scenario: "Survey: how often teams deploy",
        name: "Waffle",
        blurb: "Percentages as a grid of cells.",
        use: "Shares that people can count, roughly one cell per percent.",
        watch:
          "It works to about four groups; beyond that the runs of color blur together.",
        Component: WaffleChart,
      },
      {
        slug: "treemap",
        scenario: "Disk usage by directory",
        name: "Treemap",
        blurb: "Nested totals as nested area.",
        use: "Hierarchical composition with many leaves, biggest first.",
        watch:
          "Area compares poorly across distant tiles; label the few that matter.",
        Component: TreemapChart,
      },
      {
        slug: "sunburst",
        scenario: "Budget by department, then team",
        name: "Sunburst",
        blurb: "A hierarchy unrolled into rings.",
        use: "Two or three levels of composition around a common center.",
        watch:
          "Outer rings exaggerate; deep hierarchies read better as an icicle.",
        Component: SunburstChart,
      },
      {
        slug: "icicle",
        scenario: "Monorepo size: repo, workspaces, packages",
        name: "Icicle",
        blurb: "A hierarchy in straight rows.",
        use: "Drill-down composition where the rectangles stay comparable.",
        watch:
          "Depth eats height quickly; show the levels people actually navigate.",
        Component: IcicleChart,
      },
      {
        slug: "circle-packing",
        scenario: "An org's clusters: platform, growth, labs",
        name: "Circle packing",
        blurb: "Containment as nested circles.",
        use: "Cluster membership and relative size with an organic feel.",
        watch:
          "Packing wastes space and distorts comparison; use it for structure, not measurement.",
        Component: CirclePackingChart,
      },
      {
        slug: "marimekko",
        scenario: "A market: region width, vendor share",
        name: "Marimekko",
        blurb: "Two dimensions of share in one rectangle.",
        use: "Market maps: segment width by size, then split each by composition.",
        watch:
          "It takes practice to read; annotate the one or two cells that carry the story.",
        Component: MarimekkoChart,
      },
      {
        slug: "funnel",
        scenario: "Signup funnel, five stages with rates",
        name: "Funnel",
        blurb: "Stage-by-stage survival.",
        use: "Conversion pipelines where each stage is a subset of the last.",
        watch: "The taper exaggerates; label every stage with its real rate.",
        Component: FunnelChart,
      },
    ],
  },
  {
    label: "Distribution",
    intro: "The shape of the data: spread, skew, clusters, and outliers.",
    charts: [
      {
        slug: "histogram",
        scenario: "API response times, binned",
        name: "Histogram",
        blurb: "Frequency by bin.",
        use: "The shape of one variable: skew, spread, and outliers.",
        watch: "Bin width changes the story; try several before trusting one.",
        Component: HistogramChart,
      },
      {
        slug: "density",
        scenario: "Marathon finish times, smoothed",
        name: "Density",
        blurb: "A histogram smoothed into a curve.",
        use: "Distribution shape without bin artifacts, kind to overlays.",
        watch:
          "Bandwidth is a choice; smooth too wide and real structure disappears.",
        Component: DensityChart,
      },
      {
        slug: "box-plot",
        scenario: "Request latency by region",
        name: "Box plot",
        blurb: "Median, quartiles, and whiskers.",
        use: "Comparing distributions across groups on one scale.",
        watch:
          "It hides multimodality; a two-humped group looks like a calm box.",
        Component: BoxPlotChart,
      },
      {
        slug: "violin",
        scenario: "Review scores by category",
        name: "Violin",
        blurb: "A box plot with its shape restored.",
        use: "Group comparisons where the full density profile matters.",
        watch:
          "Small samples make confident-looking violins; show the sample size.",
        Component: ViolinChart,
      },
      {
        slug: "ridgeline",
        scenario: "Daily temperatures, month by month",
        name: "Ridgeline",
        blurb: "Distributions in overlapping rows.",
        use: "How a distribution drifts across many groups or time slices.",
        watch:
          "Overlap hides valleys behind peaks; order the rows meaningfully.",
        Component: RidgelineChart,
      },
      {
        slug: "beeswarm",
        scenario: "PR review latency, one dot per PR",
        name: "Beeswarm",
        blurb: "Every point, nudged apart.",
        use: "Small datasets where each observation deserves its own dot.",
        watch:
          "Past a few hundred points the swarm congeals; switch to a density.",
        Component: BeeswarmChart,
      },
      {
        slug: "strip-plot",
        scenario: "Test durations by suite",
        name: "Strip plot",
        blurb: "Raw points along a line.",
        use: "Quick distribution reads and honest small-n comparisons.",
        watch: "Identical values overplot; jitter, or shift to a beeswarm.",
        Component: StripPlotChart,
      },
      {
        slug: "population-pyramid",
        scenario: "Age structure, men against women",
        name: "Population pyramid",
        blurb: "Two distributions, back to back.",
        use: "Age and cohort structure compared between two groups.",
        watch:
          "Mirrored bars resist precise comparison; overlay them if exact gaps matter.",
        Component: PopulationPyramidChart,
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
        scenario: "Product rating against hours of use",
        name: "Scatter",
        blurb: "Two variables, one dot each.",
        use: "Relationships, clusters, and outliers between two measures.",
        watch:
          "The trend line is a summary, not proof; correlation is not causation.",
        Component: ScatterChart,
      },
      {
        slug: "bubble",
        scenario: "GDP per capita against life expectancy, sized by population",
        name: "Bubble",
        blurb: "A scatter with a third variable as size.",
        use: "Two relationships plus magnitude, for a few dozen entities at most.",
        watch: "Size by area, never radius, and label the bubbles that matter.",
        Component: BubbleChart,
      },
      {
        slug: "connected-scatter",
        scenario: "Inflation against unemployment, 2018 to 2025",
        name: "Connected scatter",
        blurb: "A scatter walked through time.",
        use: "How two measures moved together across ordered periods.",
        watch: "It needs a start and end cue; unlabeled loops disorient.",
        Component: ConnectedScatterChart,
      },
      {
        slug: "hexbin",
        scenario: "Ride pickups binned over a city grid",
        name: "Hexbin",
        blurb: "Density where dots would overflow.",
        use: "Tens of thousands of points binned into honest cells.",
        watch:
          "Bin size sets the story and empty cells matter; show the scale.",
        Component: HexbinChart,
      },
      {
        slug: "contour",
        scenario: "Height and weight of five thousand runners",
        name: "Contour",
        blurb: "Density as elevation lines.",
        use: "The shape of a dense 2D distribution without overplotting.",
        watch: "Levels are model output; annotate what each band means.",
        Component: ContourChart,
      },
      {
        slug: "heatmap",
        scenario: "Deploys by service and hour of day",
        name: "Heatmap",
        blurb: "A matrix colored by value.",
        use: "Category-by-category intensity: confusion matrices, correlations, schedules.",
        watch: "One sequential ramp only; a rainbow scrambles the order.",
        Component: HeatmapChart,
      },
      {
        slug: "quadrant",
        scenario: "Ideas placed by effort and impact",
        name: "Quadrant",
        blurb: "A scatter cut into four decisions.",
        use: "Prioritization maps: effort against impact, risk against reward.",
        watch:
          "The cut lines are editorial; be ready to defend where the crosshair sits.",
        Component: QuadrantChart,
      },
      {
        slug: "parallel-coordinates",
        scenario: "Three laptops across four spec axes",
        name: "Parallel coordinates",
        blurb: "Each axis a dimension, each line a record.",
        use: "Spotting profiles and trade-offs across four or more measures.",
        watch:
          "Axis order changes the picture; normalize each axis and say so.",
        Component: ParallelCoordinatesChart,
      },
      {
        slug: "radar",
        scenario: "Two models across five capabilities",
        name: "Radar",
        blurb: "A profile drawn around a center.",
        use: "Two or three profiles compared across a handful of shared dimensions.",
        watch:
          "Shape area misleads and axis order is arbitrary; bars are often clearer.",
        Component: RadarChart,
      },
    ],
  },
  {
    label: "Deviation",
    intro: "Signed difference from a reference: zero, neutral, or a target.",
    charts: [
      {
        slug: "diverging-bar",
        scenario: "Revenue against plan, by product",
        name: "Diverging bar",
        blurb: "Signed values from a shared zero.",
        use: "Surplus against deficit, growth against decline, by category.",
        watch:
          "Sort by value, not alphabet, so the sign structure stays visible.",
        Component: DivergingBarChart,
      },
      {
        slug: "diverging-stacked",
        scenario: "Would recommend: agreement by team",
        name: "Diverging stacked bar",
        blurb: "Sentiment centered on neutral.",
        use: "Likert scales and any agree-versus-disagree balance.",
        watch:
          "Anchor rows on the neutral midpoint or the comparison collapses.",
        Component: DivergingStackedChart,
      },
      {
        slug: "dumbbell",
        scenario: "Page load score, before and after the optimization",
        name: "Dumbbell",
        blurb: "Then and now, one row per entity.",
        use: "Before-and-after gaps across categories without slope clutter.",
        watch: "Two points only; for the path between them use a slope chart.",
        Component: DumbbellChart,
      },
      {
        slug: "difference-area",
        scenario: "Actual revenue against forecast",
        name: "Difference area",
        blurb: "The gap between two lines, shaded.",
        use: "Actual against target where being above or below is the story.",
        watch:
          "Shade the gap, not the lines, and reserve the two hues for sign.",
        Component: DifferenceAreaChart,
      },
    ],
  },
  {
    label: "Flow",
    intro: "Quantities in motion between states, stages, and totals.",
    charts: [
      {
        slug: "sankey",
        scenario: "Energy from sources to uses",
        name: "Sankey",
        blurb: "Where quantities come from and go.",
        use: "Distribution across stages: sources into channels into destinations.",
        watch: "Links must conserve; leaks and rounding need explaining.",
        Component: SankeyChart,
      },
      {
        slug: "chord",
        scenario: "Trade flows between four regions",
        name: "Chord",
        blurb: "Flows between peers around a circle.",
        use: "Dense mutual exchange: migration, trade, traffic between equals.",
        watch:
          "Beautiful and hard to read; reserve it for genuinely circular relationships.",
        Component: ChordChart,
      },
      {
        slug: "waterfall",
        scenario: "Gross to net, gains and losses bridged",
        name: "Waterfall",
        blurb: "How a total was built, step by step.",
        use: "Bridges from a starting figure through gains and losses to an end.",
        watch:
          "Floating bars confuse without connectors and clear sign colors.",
        Component: WaterfallChart,
      },
    ],
  },
  {
    label: "Networks & hierarchy",
    intro: "Structure itself: what connects to what, and what contains what.",
    charts: [
      {
        slug: "network",
        scenario: "Service dependencies around an API",
        name: "Network",
        blurb: "Entities and their relationships.",
        use: "Structure in connections: hubs, bridges, and islands.",
        watch:
          "Force layouts are unstable art; pin the nodes readers must find.",
        Component: NetworkChart,
      },
      {
        slug: "arc-diagram",
        scenario: "Module imports in file order",
        name: "Arc diagram",
        blurb: "A network flattened onto one line.",
        use: "Connection patterns over an ordered set, sequences especially.",
        watch: "Node order decides everything; sort it on purpose.",
        Component: ArcDiagramChart,
      },
      {
        slug: "tree",
        scenario: "A small org chart",
        name: "Tree",
        blurb: "Parent-child structure, top down.",
        use: "Org charts, file systems, and decision paths.",
        watch:
          "Wide levels squeeze; collapse subtrees rather than shrinking the type.",
        Component: TreeChart,
      },
      {
        slug: "dendrogram",
        scenario: "Support tickets clustered by topic",
        name: "Dendrogram",
        blurb: "Merge history as brackets.",
        use: "Hierarchical clustering: what joined what, and how early.",
        watch:
          "Height is the metric; cutting at a level is what defines the clusters.",
        Component: DendrogramChart,
      },
      {
        slug: "venn",
        scenario: "Web and app users, overlap counted",
        name: "Venn",
        blurb: "Set overlap, literally.",
        use: "Two or three sets where the overlap is the message.",
        watch: "Region area rarely matches the counts; label every region.",
        Component: VennChart,
      },
    ],
  },
  {
    label: "Spatial",
    intro: "Values placed on geography, drawn here on an abstract tile map.",
    charts: [
      {
        slug: "choropleth",
        scenario: "Users per square km by region, abstract tile map",
        name: "Choropleth",
        blurb: "Regions colored by value.",
        use: "Rates and ratios across regions on one sequential ramp.",
        watch: "Big areas dominate; map rates, never raw counts.",
        Component: ChoroplethChart,
      },
      {
        slug: "symbol-map",
        scenario: "Points of presence sized by capacity",
        name: "Symbol map",
        blurb: "Sized marks on places.",
        use: "Absolute quantities at locations, where counts stay honest.",
        watch:
          "Overlapping circles occlude; scale by area and show a size legend.",
        Component: SymbolMapChart,
      },
      {
        slug: "dot-map",
        scenario: "Users placed one dot per hundred",
        name: "Dot map",
        blurb: "One dot, one unit, placed.",
        use: "Density and settlement patterns that emerge from individual units.",
        watch:
          "Placement within a region is approximate; say what one dot equals.",
        Component: DotMapChart,
      },
      {
        slug: "flow-map",
        scenario: "Shipments out of one hub",
        name: "Flow map",
        blurb: "Movement between places.",
        use: "Origin-to-destination volumes: routes, trade, migration.",
        watch: "More than a handful of routes tangles; bundle or filter.",
        Component: FlowMapChart,
      },
    ],
  },
  {
    label: "Micro & KPI",
    intro:
      "Charts the size of a word, built to live inside tables, tiles, and sentences.",
    charts: [
      {
        slug: "sparkline",
        scenario: "A node's vitals, inline",
        name: "Sparkline",
        blurb: "A trend the size of a word.",
        use: "Inline context in tables and tiles: direction at a glance.",
        watch: "No axes means no precision; pair it with the current value.",
        Component: SparklineChart,
      },
      {
        slug: "sparkbar",
        scenario: "Deploys per hour, three days inline",
        name: "Sparkbar",
        blurb: "A bar series the size of a word.",
        use: "Discrete periods inline: recent counts beside their label.",
        watch: "Keep one scale across sibling rows or the comparison lies.",
        Component: SparkbarChart,
      },
      {
        slug: "win-loss",
        scenario: "Two seasons of match results",
        name: "Win-loss",
        blurb: "Outcome sequences as up-down ticks.",
        use: "Streaks and momentum across repeated binary events.",
        watch: "Two states only; when magnitude matters, use a sparkbar.",
        Component: WinLossChart,
      },
      {
        slug: "bullet",
        scenario: "Revenue and NPS against target and bands",
        name: "Bullet",
        blurb: "A KPI against target and bands.",
        use: "Dashboard measures with qualitative context in minimal height.",
        watch: "Explain the bands once; unlabeled shading is decoration.",
        Component: BulletChart,
      },
      {
        slug: "progress-ring",
        scenario: "Three quarterly goals",
        name: "Progress ring",
        blurb: "Completion, wrapped in a circle.",
        use: "Single completion states in cards, lists, and avatars.",
        watch:
          "Rings past 100% or holding several values stop reading; use a bar.",
        Component: ProgressRingChart,
      },
      {
        slug: "gauge",
        scenario: "Error budget consumed",
        name: "Gauge",
        blurb: "A dial with one number on it.",
        use: "A single bounded value where alarm zones matter.",
        watch: "It spends a lot of space on one number; a bullet is denser.",
        Component: GaugeChart,
      },
      {
        slug: "split-bar",
        scenario: "Two-way shares, inline",
        name: "Split bar",
        blurb: "One row, two shares.",
        use: "Inline two-way proportions: sent against received, hit against miss.",
        watch: "Two segments only; more shares deserve a real stacked bar.",
        Component: SplitBarChart,
      },
      {
        slug: "kpi-tile",
        scenario: "A headline metric with delta and trend",
        name: "KPI tile",
        blurb: "The number, its change, and its recent past.",
        use: "Headline metrics where the value itself is the chart.",
        watch: "One tile, one message; a wall of tiles is a table in costume.",
        Component: KpiTileChart,
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

export function getChart(slug: string): Chart | undefined {
  return CHARTS.find((chart) => chart.slug === slug);
}
