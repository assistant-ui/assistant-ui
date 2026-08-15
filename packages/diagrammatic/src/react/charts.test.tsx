import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as dg from "../index";

const graph = {
  nodes: [
    { id: "solar", label: "solar" },
    { id: "gas", label: "gas" },
    { id: "homes", label: "homes" },
    { id: "industry", label: "industry" },
    { id: "transport", label: "transport" },
  ],
  links: [
    { source: "solar", target: "homes", value: 28 },
    { source: "solar", target: "industry", value: 18 },
    { source: "gas", target: "industry", value: 12 },
    { source: "gas", target: "transport", value: 20 },
  ],
};

const tree = {
  label: "repo",
  children: [
    {
      label: "packages",
      children: [
        { label: "react", value: 50 },
        { label: "core", value: 32 },
      ],
    },
    { label: "apps", children: [{ label: "web", value: 34 }] },
    { label: "docs", value: 20 },
  ],
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const series = [
  { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
  { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
  { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
];
const items = [
  { label: "react", value: 25 },
  { label: "vue", value: 12 },
  { label: "svelte", value: 6.2 },
  { label: "solid", value: 2.1 },
];
const points = Array.from({ length: 26 }, (_, i) => ({
  x: i * 4 + (i % 5),
  y: 90 - i * 2.4 + (i % 7),
}));

export const FIXTURES: Record<string, ReactElement> = {
  line: (
    <dg.Line
      data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
      labels={[...months, "Sep"]}
    />
  ),
  "line-multi": <dg.Line series={series.slice(0, 2)} labels={months} />,
  area: <dg.Area data={[22, 40, 34, 52, 64, 58, 74, 70, 88]} />,
  "stacked-area": <dg.StackedArea series={series} labels={months} />,
  streamgraph: <dg.Streamgraph series={series} />,
  "mirrored-area": (
    <dg.MirroredArea
      down={{ name: "download", data: [18, 30, 26, 40, 36, 48, 42, 52] }}
      up={{ name: "upload", data: [8, 12, 10, 16, 14, 18, 22, 16] }}
    />
  ),
  "step-line": <dg.StepLine data={[19, 19, 29, 25, 39, 35, 49, 59]} />,
  slope: (
    <dg.Slope
      items={[
        { label: "video", from: 30, to: 68 },
        { label: "social", from: 60, to: 50 },
        { label: "tv", from: 70, to: 30 },
      ]}
      highlight="video"
      labels={["2020", "2025"]}
    />
  ),
  bump: (
    <dg.Bump
      series={[
        { name: "react", ranks: [2, 1, 1, 2, 1] },
        { name: "jquery", ranks: [1, 2, 3, 3, 3] },
        { name: "vue", ranks: [3, 3, 2, 1, 2] },
      ]}
      labels={["21", "22", "23", "24", "25"]}
    />
  ),
  candlestick: (
    <dg.Candlestick
      data={[
        { open: 138, close: 152, low: 132, high: 156 },
        { open: 152, close: 146, low: 142, high: 158 },
        { open: 146, close: 160, low: 144, high: 164 },
        { open: 160, close: 172, low: 156, high: 176 },
      ]}
      labels={["M", "T", "W", "T"]}
    />
  ),
  horizon: (
    <dg.Horizon
      data={[2, 3.5, 5, 4.2, 6, 7.5, 9.5, 8.5, 6.5, 4.5, 3, 4]}
      labels={["00", "12", "24"]}
    />
  ),
  gantt: (
    <dg.Gantt
      rows={[
        { label: "design", from: 0, to: 20, state: "done" },
        { label: "build", from: 14, to: 48, state: "active" },
        { label: "launch", from: 44, to: 60, state: "planned" },
      ]}
      today={38}
      labels={["Apr", "May", "Jun"]}
    />
  ),
  "calendar-heatmap": (
    <dg.CalendarHeatmap
      values={Array.from(
        { length: 112 },
        (_, i) => (Math.sin(i * 1.7) + 1) * 5,
      )}
      labels={["May", "Jun", "Jul", "Aug"]}
    />
  ),
  punchcard: (
    <dg.Punchcard
      matrix={{
        rows: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        cols: ["0h", "", "", "6h", "", "", "12h", "", "", "18h", "", ""],
        values: Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 12 }, (_, c) =>
            Math.max(0, Math.sin((c / 12) * Math.PI) * (5 - r)),
          ),
        ),
      }}
    />
  ),
  bar: <dg.Bar items={items} />,
  column: (
    <dg.Column
      items={[38, 52, 44, 66, 58, 74, 90].map((v, i) => ({
        label: `Q${(i % 4) + 1}`,
        value: v,
      }))}
    />
  ),
  "grouped-bar": (
    <dg.GroupedBar groups={["NA", "EU", "APAC"]} series={series} />
  ),
  "stacked-bar": (
    <dg.StackedBar groups={["Jan", "Feb", "Mar", "Apr"]} series={series} />
  ),
  "percent-stacked-bar": (
    <dg.PercentStackedBar
      groups={["'21", "'22", "'23", "'24", "'25"]}
      series={series}
    />
  ),
  lollipop: <dg.Lollipop items={items} />,
  "dot-plot": <dg.DotPlot items={items} ticks={[5, 15, 25]} />,
  leaderboard: <dg.Leaderboard items={items} />,
  pictogram: (
    <dg.Pictogram items={items.slice(0, 3)} unit={5} unitLabel="people" />
  ),
  "radial-bar": (
    <dg.RadialBar
      items={[
        { label: "ship", value: 0.82 },
        { label: "quality", value: 0.58 },
        { label: "hiring", value: 0.36 },
      ]}
    />
  ),
  "polar-area": (
    <dg.PolarArea
      items={["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((label, i) => ({
        label,
        value: 3 + ((i * 7) % 9),
      }))}
    />
  ),
  pie: <dg.Pie items={items} />,
  donut: <dg.Donut items={items} center="128" centerLabel="GB used" />,
  waffle: <dg.Waffle items={items} />,
  treemap: <dg.Treemap root={tree} />,
  sunburst: <dg.Sunburst root={tree} />,
  icicle: <dg.Icicle root={tree} />,
  "circle-packing": <dg.CirclePacking root={tree} />,
  marimekko: (
    <dg.Marimekko
      columns={[
        { label: "AMER", width: 62, shares: items.slice(0, 3) },
        { label: "EMEA", width: 48, shares: items.slice(0, 3) },
        { label: "APAC", width: 40, shares: items.slice(0, 3) },
      ]}
    />
  ),
  funnel: (
    <dg.Funnel
      items={[
        { label: "visited", value: 8000 },
        { label: "signed up", value: 5760 },
        { label: "activated", value: 4000 },
        { label: "subscribed", value: 2720 },
      ]}
    />
  ),
  histogram: (
    <dg.Histogram
      bins={[6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5]}
      marker={{ at: 7, label: "median" }}
      labels={["0", "400ms", "800ms"]}
    />
  ),
  density: (
    <dg.Density
      bins={[2, 6, 14, 30, 52, 74, 88, 92, 80, 60, 46, 38, 30, 20, 10, 4]}
      marker={{ at: 7, label: "median 3:58" }}
    />
  ),
  "box-plot": (
    <dg.BoxPlot
      groups={[
        { label: "NA", low: 18, q1: 36, median: 48, q3: 62, high: 82 },
        { label: "EU", low: 30, q1: 48, median: 60, q3: 74, high: 94 },
        { label: "APAC", low: 12, q1: 26, median: 38, q3: 50, high: 66 },
      ]}
    />
  ),
  violin: (
    <dg.Violin
      groups={[
        { label: "apps", widths: [1, 4, 9, 13, 10, 5, 2], median: 0.55 },
        { label: "games", widths: [2, 6, 12, 15, 13, 8, 3], median: 0.48 },
      ]}
    />
  ),
  ridgeline: (
    <dg.Ridgeline
      rows={["Jan", "Feb", "Mar", "Apr"].map((label, i) => ({
        label,
        bins: Array.from({ length: 10 }, (_, k) =>
          Math.max(0.5, Math.sin(((k - i) / 9) * Math.PI) * 40),
        ),
      }))}
      highlight="Mar"
      labels={["-10°", "0°", "10°", "20°"]}
    />
  ),
  beeswarm: (
    <dg.Beeswarm
      values={[
        2, 3, 3.5, 4, 4.2, 4.4, 5, 5.2, 5.5, 6, 6.2, 6.5, 7, 7.4, 8, 9, 10, 12,
        24,
      ]}
      flag={{ at: 24, label: "24h" }}
    />
  ),
  "strip-plot": (
    <dg.StripPlot
      rows={[
        { label: "unit", values: [0.4, 0.6, 0.7, 0.9, 1.1, 1.4] },
        { label: "e2e", values: [1.8, 2.2, 2.6, 3.1, 3.8, 4.4] },
      ]}
      labels={["0s", "2s", "4s"]}
    />
  ),
  "population-pyramid": (
    <dg.PopulationPyramid
      bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
      left={{ name: "men", data: [22, 38, 56, 68, 76, 60, 42, 22] }}
      right={{ name: "women", data: [28, 42, 58, 64, 70, 56, 40, 24] }}
    />
  ),
  scatter: <dg.Scatter points={points} trend xLabel="hours" yLabel="rating" />,
  bubble: (
    <dg.Bubble
      points={points.slice(0, 10).map((p, i) => ({ ...p, size: 4 + i * 3 }))}
      xLabel="gdp per capita"
      yLabel="life expectancy"
    />
  ),
  "connected-scatter": (
    <dg.ConnectedScatter
      points={[
        { x: 2, y: 8, label: "2018" },
        { x: 4, y: 6 },
        { x: 3.5, y: 4 },
        { x: 6, y: 3.4 },
        { x: 8, y: 5, label: "2025" },
      ]}
      xLabel="unemployment"
      yLabel="inflation"
    />
  ),
  hexbin: (
    <dg.Hexbin
      points={[...points, ...points.map((p) => ({ x: p.x + 3, y: p.y - 5 }))]}
    />
  ),
  contour: <dg.Contour points={points} xLabel="height" yLabel="weight" />,
  heatmap: (
    <dg.Heatmap
      matrix={{
        rows: ["api", "web", "db", "jobs"],
        cols: ["8h", "10h", "12h", "14h", "16h", "18h"],
        values: Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 6 }, (_, c) => (Math.sin(r + c) + 1) / 2),
        ),
      }}
    />
  ),
  quadrant: (
    <dg.Quadrant
      points={points.slice(0, 12)}
      xLabel="effort"
      yLabel="impact"
      quadrants={["quick wins", "big bets", "fill-ins", "time sinks"]}
    />
  ),
  "parallel-coordinates": (
    <dg.ParallelCoordinates
      axes={["price", "battery", "weight", "screen"]}
      records={[
        { name: "air", values: [22, 58, 34, 70] },
        { name: "pro", values: [54, 30, 66, 42] },
        { name: "max", values: [80, 72, 50, 86] },
      ]}
    />
  ),
  radar: (
    <dg.Radar
      axes={["code", "reason", "write", "vision", "speed"]}
      series={[
        { name: "atlas-1", data: [0.85, 0.7, 0.6, 0.8, 0.75] },
        { name: "nova-2", data: [0.55, 0.85, 0.75, 0.45, 0.6] },
      ]}
    />
  ),
  "diverging-bar": (
    <dg.DivergingBar
      items={[
        { label: "cloud", value: 48 },
        { label: "search", value: 34 },
        { label: "maps", value: -12 },
        { label: "video", value: -38 },
      ]}
    />
  ),
  "diverging-stacked": (
    <dg.DivergingStacked
      rows={[
        { label: "eng", values: [8, 16, 18, 34, 24] },
        { label: "design", values: [14, 24, 22, 26, 14] },
        { label: "support", values: [22, 30, 20, 18, 10] },
      ]}
    />
  ),
  dumbbell: (
    <dg.Dumbbell
      items={[
        { label: "home", from: 38, to: 84 },
        { label: "search", from: 52, to: 76 },
        { label: "checkout", from: 66, to: 58 },
      ]}
    />
  ),
  "difference-area": (
    <dg.DifferenceArea
      actual={{
        name: "actual",
        data: [30, 44, 56, 48, 40, 34, 46, 62, 74, 84],
      }}
      reference={{
        name: "forecast",
        data: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58],
      }}
      labels={["Jan", "Apr", "Jul", "Oct"]}
    />
  ),
  sankey: <dg.Sankey graph={graph} />,
  chord: (
    <dg.Chord
      groups={["americas", "europe", "asia", "africa"]}
      flows={[
        { from: "americas", to: "asia", value: 30 },
        { from: "americas", to: "europe", value: 18 },
        { from: "europe", to: "africa", value: 14 },
        { from: "asia", to: "africa", value: 8 },
      ]}
    />
  ),
  waterfall: (
    <dg.Waterfall
      steps={[
        { label: "gross", value: 40, total: true },
        { label: "subs", value: 18 },
        { label: "addons", value: 14 },
        { label: "refunds", value: -22 },
        { label: "services", value: 20 },
        { label: "credits", value: -10 },
        { label: "net", value: 60, total: true },
      ]}
    />
  ),
  network: <dg.Network graph={graph} />,
  "arc-diagram": (
    <dg.ArcDiagram
      graph={{
        nodes: ["cli", "core", "ui", "db", "api", "ws"].map((id) => ({ id })),
        links: [
          { source: "cli", target: "ui" },
          { source: "cli", target: "ws" },
          { source: "core", target: "db" },
          { source: "ui", target: "api" },
        ],
      }}
      highlight="cli"
    />
  ),
  tree: <dg.Tree root={tree} />,
  dendrogram: (
    <dg.Dendrogram
      leaves={["login", "2fa", "billing", "refund", "export", "api"]}
      merges={[
        { a: 0, b: 1, height: 1 },
        { a: 2, b: 3, height: 1.4 },
        { a: 6, b: 7, height: 2.2 },
        { a: 4, b: 5, height: 1.8 },
        { a: 8, b: 9, height: 3 },
      ]}
      highlight={0}
    />
  ),
  venn: (
    <dg.Venn
      a={{ label: "web", value: 4200 }}
      b={{ label: "app", value: 3100 }}
      overlap={1300}
    />
  ),
  choropleth: (
    <dg.Choropleth
      values={dg.ABSTRACT_TILES.map((_, i) => (Math.sin(i * 1.3) + 1) / 2)}
      legendLabel="users/km²"
    />
  ),
  "symbol-map": (
    <dg.SymbolMap
      marks={[
        { col: 4, row: 1, value: 42, label: "west-1" },
        { col: 7, row: 3, value: 22 },
        { col: 13, row: 2, value: 16, label: "east-2" },
      ]}
    />
  ),
  "dot-map": (
    <dg.DotMap
      counts={dg.ABSTRACT_TILES.map((_, i) =>
        Math.max(0, Math.round(Math.sin(i) * 3)),
      )}
      unitLabel="1 dot = 100 users"
    />
  ),
  "flow-map": (
    <dg.FlowMap
      origin={{ col: 5, row: 3, label: "hub" }}
      routes={[
        { col: 13, row: 2, value: 26 },
        { col: 14, row: 4, value: 18 },
        { col: 11, row: 6, value: 12 },
      ]}
    />
  ),
  sparkline: <dg.Sparkline data={[40, 55, 48, 62, 58, 74, 70, 86]} fill />,
  sparkbar: <dg.Sparkbar data={[3, 5, 4, 7, 6, 9, 8, 10]} />,
  "win-loss": <dg.WinLoss data={[1, 1, -1, 1, -1, 1, 1, -1]} />,
  bullet: (
    <dg.Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
  ),
  "progress-ring": <dg.ProgressRing value={0.82} label="ship" />,
  gauge: <dg.Gauge value={0.68} label="error budget used" />,
  "split-bar": (
    <dg.SplitBar
      a={{ label: "down", value: 72 }}
      b={{ label: "up", value: 28 }}
    />
  ),
  "kpi-tile": (
    <dg.KpiTile
      label="active runs"
      value="1,284"
      delta={{ value: "12.4%", direction: "up" }}
      trend={[30, 42, 38, 52, 48, 62, 70, 84]}
    />
  ),
};

describe("every chart form", () => {
  for (const [name, element] of Object.entries(FIXTURES)) {
    it(`${name} renders a marked, finite SVG`, () => {
      const html = renderToStaticMarkup(element);
      expect(html).toContain("<svg");
      expect(html).toContain('data-part="mark"');
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
      expect(html).not.toContain("undefined");
    });
  }

  it("names the chart for assistive tech when title is given", () => {
    const html = renderToStaticMarkup(
      <dg.Line data={[1, 2, 3]} title="Monthly active users" />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Monthly active users"');
    expect(html).toContain("<title>Monthly active users</title>");
  });

  it("stays decorative without a title", () => {
    const html = renderToStaticMarkup(<dg.Line data={[1, 2, 3]} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });

  it("resolves every color through a --dg token", () => {
    const html = renderToStaticMarkup(<dg.StackedArea series={series} />);
    expect(html).toContain("var(--dg-c1, #3b82f6)");
    expect(html).not.toMatch(/(?:fill|stroke)="#(?!fff)/);
  });

  it("passes native svg props through and merges style", () => {
    const html = renderToStaticMarkup(
      <dg.Line
        data={[1, 2, 3]}
        data-testid="chart"
        aria-label="Signups"
        style={{ maxWidth: "20rem" }}
      />,
    );
    expect(html).toContain('data-testid="chart"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Signups"');
    expect(html).toContain("max-width:20rem");
    expect(html).toContain("display:block");
  });

  it("forwards refs on every chart form", () => {
    for (const [name, componentOrValue] of Object.entries(dg)) {
      if (typeof componentOrValue !== "object" || componentOrValue === null)
        continue;
      if (!("displayName" in componentOrValue)) continue;
      expect((componentOrValue as { displayName?: string }).displayName).toBe(
        name,
      );
    }
    expect((dg.Sankey as { $$typeof?: symbol }).$$typeof?.toString()).toContain(
      "react.forward_ref",
    );
  });
});
