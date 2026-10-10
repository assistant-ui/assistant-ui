# Migrating from recharts

A working map from a recharts dashboard to `diagrammatic`, written from the parts that actually differ. The host contract behind it is [host.md](./host.md).

Two differences drive everything else. A recharts chart is a client component that measures its container and renders in pixel space; a diagrammatic chart is a server component that renders in pixel space at a stated `width`, so size is a host decision rather than a measurement and only a fluid box needs the client. And a recharts tooltip receives the row; a diagrammatic tooltip receives an address into the data the host already has.

## Forms

| recharts | diagrammatic |
|---|---|
| `AreaChart` with one `Area` | `Area data` |
| `AreaChart` with several `Area` | `Area series` |
| `AreaChart` with `stackId` | `StackedArea` |
| `LineChart` | `Line data` or `Line series` |
| `BarChart` | `Column`, or `Bar` for a ranked horizontal breakdown |
| `BarChart layout="vertical"` | `Bar` |
| `BarChart` with `stackId` | `StackedBar`, plus `normalize` for percent |
| several `Bar` side by side | `GroupedBar` |
| `PieChart` with `innerRadius` | `Pie inner center centerLabel`, plus `legend={false}` for a DOM legend |
| `Treemap` | `Treemap root` |
| `ScatterChart` with `ZAxis` | `Scatter points[].size` |
| `Scatter` with a `Cell` per category | `Scatter points[].series` |
| `RadarChart` | `Radar` |
| `FunnelChart` | `Funnel` |
| a hand-rolled hour by weekday grid | `Heatmap mark="dot"` |
| a hand-rolled contribution calendar | `Heatmap mark="calendar"` |
| a hand-rolled composition bar | `SplitBar items block` |
| a hand-rolled label truncation | nothing: labels are cut to their margin |
| `ResponsiveContainer` | `width` and `height`, or `Fit` when the width is fluid |
| `CartesianGrid` plus `YAxis tickCount` | `yTicks={4}` |
| `XAxis ticks={...}` | `labels`, one per tick you want printed |
| `XAxis tick={{ fontSize: 12 }}` | `fontSize={12}` on the chart, every role follows |
| `Tooltip content` | `Root` plus `Tooltip`, looking the row up by `datum.index` |
| `Legend` | automatic, or `legend={false}` plus the DOM `Legend` |
| `isAnimationActive={false}` | nothing to turn off |

## Sizing

```tsx
<ResponsiveContainer width="100%" height={180}>
  <AreaChart data={rows}>…</AreaChart>
</ResponsiveContainer>
```

becomes, when the card width is known:

```tsx
<Area data={values} labels={ticks} width={420} height={180} yTicks={4} />
```

and when it is not:

```tsx
<Fit>
  {({ width }) => (
    <Area data={values} labels={ticks} width={width} height={180} yTicks={4} />
  )}
</Fit>
```

Both render in CSS pixels, so the tick labels are 11px whatever the width, and a `fontSize` on the chart is the one knob when the host's small text is another size. A figure given `width` alone takes its height from `aspect`; a figure given both ignores `aspect`. Without any of them a figure is 640 wide and shrinks, whole, inside a narrower host.

The chart text inherits the page font, so the `font-family` a recharts host set through a wrapper class is simply gone.

## Axes

A recharts axis draws itself and formats its own ticks. Here the value axis is opt-in and the category axis is a list of strings.

```tsx
// recharts
<YAxis tickFormatter={fmtCompact} tickCount={4} />
<XAxis dataKey="date" ticks={pickTicks(rows, r => r.date)} tickFormatter={fmtDay} />

// diagrammatic
<Area yTicks={4} format={fmtCompact} labels={pickTicks(rows, 5).map(fmtDay)} />
```

`labels` are spread evenly across the plotted span, so pass as many as you want printed rather than one per point. The widest printed tick sizes the value gutter, so `YAxis width` has no counterpart. `yTicks` on log paper counts in decades; `decades()` helpers in the host can be deleted.

## Tooltips

The tooltip surface stays yours. What changes is where the values come from: the mark carries `data-i` and `data-series`, and the host reads its own row.

```tsx
"use client";
import { Root, Tooltip } from "diagrammatic/interactive";

<Root>
  <Area series={series} labels={ticks} width={width} yTicks={4} />
  <Tooltip>
    {({ datum }) => {
      const row = rows[datum.index ?? 0];
      if (!row) return null;
      return (
        <div className="bg-popover ring-border rounded-lg px-2.5 py-2 shadow-md ring-1">
          <div className="font-mono text-xs">{fmtDay(row.date)}</div>
          {series.map((s) => (
            <Row key={s.name} label={s.name} value={format(row[s.name])} />
          ))}
        </div>
      );
    }}
  </Tooltip>
</Root>;
```

`datum.series` names the hovered series when the form has several, `datum.index2` addresses the second dimension of a grid, and `getSeriesColor(datum.element, name)` reads the rendered color for a swatch. A recharts `payload` mapper that formatted values inline becomes one lookup plus the formatting the host already owns.

Click and selection ride the same delegation: `onMarkClick` replaces a `Bar onClick`, and `highlight` replaces a selected-index style prop.

```tsx
<Root
  onMarkClick={(datum) => router.push(rows[datum.index ?? 0].href)}
  highlight={selected ? { index: selected } : null}
>
```

## Color

A shadcn/ui host imports the shipped bridge once:

```tsx
import "diagrammatic/shadcn.css";
```

It maps `--dg-c1` through `--dg-c5` to `--chart-1` through `--chart-5`, ink to `--foreground`, muted to `--muted-foreground`, grid to `--border`, and surface to `--background`. Any other system writes the same lines:

```css
[data-dg],
[data-dg-legend] {
  --dg-c1: var(--chart-1);
  --dg-c2: var(--chart-2);
  --dg-c3: var(--chart-3);
  --dg-c4: var(--chart-4);
  --dg-c5: var(--chart-5);
  --dg-grid: var(--color-border);
  --dg-muted: var(--color-muted-foreground);
}
```

A `<Cell fill={chartColor(i)} />` per datum disappears: color follows the series or the category (`points[].series` on a scatter, `categorical` on a bar) and comes from the palette. The palette is seven categories; a host with an eighth ranks and folds the tail into `Other`. The `ChartConfig` that shadcn's wrapper needs to name and color each key becomes nothing: names come from the data and colors from the tokens.

## Legends

A recharts `Legend` is HTML positioned over the plot. Here the built-in legend is drawn inside the figure, and the DOM `Legend` is the counterpart on the page's own type:

```tsx
import { Area, Legend } from "diagrammatic";

<Area series={series} legend={false} width={width} />
<Legend names={series.map((s) => s.name)} className="mt-2 text-xs text-muted-foreground" />
```

It is a plain list, server-safe, colored through the same tokens as the marks.

## Maps

`react-simple-maps` plus a `world-atlas` fetch plus a country-name table becomes `WorldMap` from `diagrammatic/world`, which carries Natural Earth 110m outlines as static path data and addresses countries by ISO 3166-1 alpha-2. Pan and zoom, which `ZoomableGroup` provided, is `Zoom` from `diagrammatic/interactive`.

```tsx
<Root>
  <Zoom max={8}>
    {(view) => (
      <WorldMap
        values={{ US: 412, DE: 96, JP: 74 }}
        view={view}
        title="Sign-ins by country"
      />
    )}
  </Zoom>
  <Tooltip>{({ datum }) => <CountryTip iso={datum.series} />}</Tooltip>
</Root>
```

The function child is what keeps borders and country labels at their drawn weight while the map magnifies; a node child would scale them with the picture.

The name-to-ISO mapping is the host's migration, once, on the data rather than on every render.

## What does not come across

- Dual value axes. Two units on one frame is two figures.
- A `fill` per datum. Category color comes from `series` or `categorical`; an arbitrary color per row stays out, and a token override is how a host recolors.
- Animation props. The charts render once, on the server.
- A wrapper class that restyles chart internals (`[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground`). The tokens are the surface, and the type is already on the page's scale.
