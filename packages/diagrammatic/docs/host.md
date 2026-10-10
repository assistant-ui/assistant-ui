# Diagrammatic host contract

This file is the record of what a host may ask of a figure and what the figure guarantees back: size, type, the value axis, color, legends, and interaction. [coverage.md](./coverage.md) is the bar for a new form. [ceiling.md](./ceiling.md) is the bar for a published figure. This file is the bar for the surface every form shares, and it exists because those two files govern chart types while most of what a product actually gets stuck on is the frame around them.

A request that is not about which marks to draw belongs here, not in coverage.md. Do not open a new form to solve a host problem, and do not answer a host problem with a CSS rescue on the consumer's side.

## The box

Every figure is drawn in CSS pixels. The root svg carries `width`, `height`, and `viewBox="0 0 width height"`, so one unit inside the figure is one pixel on the page, the same unit the page's own type, borders, and spacing use. Margins, hairlines, dot radii, hit pads, and type are all pixel measures, which is what lets a figure sit next to a paragraph without looking imported: its 11px tick labels are the same 11px the host's small text is.

The inline micro charts (`Sparkline`, `Sparkbar`, `WinLoss`, `SplitBar`) are the exception: they sit inside a sentence or a table cell at a height in em of the surrounding text with an auto width, and take pixels only when a `width` is passed.

| Knob | What it sets | Default |
|---|---|---|
| `width` | rendered width in CSS pixels | 640 |
| `height` | rendered height in CSS pixels | `width / aspect` |
| `aspect` | the shape when `height` is not given | per form, most are 5/3 |
| `fontSize` | the type size in CSS pixels | 11 |

## Size

A figure renders at its `width`. The root style is `display: block; max-width: 100%; height: auto`, so a host narrower than the figure shrinks it as a whole and a wider host leaves it at its size, like an image. The shrink is proportional and is what a phone gets from a figure sized for a card; a host that wants type to hold at 11px on a narrow screen states a smaller `width`.

A host that knows the width from its layout passes it and the figure stays a server component. A host with a fluid box measures once and hands the width down:

```tsx
import { Fit } from "diagrammatic/interactive";

<Fit>{({ width }) => <Area data={days} labels={ticks} width={width} />}</Fit>;
```

`Fit` renders `initial` (640 by default) on the server and on the first client render, then measures its box and redraws at the measured width in steps of `step` pixels. The chart inside the callback is a client component, because the callback is. A card with a fixed height passes `height` as well and `aspect` is ignored.

## Type

`fontSize` is the one type knob. It is the size of axis and category labels; printed values and row labels step up a tenth so a number reads over the ticks around it; a chart's own printed sizes (a pie's centre number, a gauge's nameplate) are multiples of the same base. Every text element carries its size in em of the root, and the root carries `fontSize` as its `font-size` attribute, so a stylesheet rule on `[data-dg]` that sets `font-size` moves every role together. The frame allowances that hold the type (the tick gutter, the label row, the legend row) are computed from `fontSize`, so larger type still has margin to sit in.

The font family is inherited: chart text uses `var(--dg-font, inherit)`, which resolves to the host's face unless a token says otherwise. There is no per-role size prop and no font prop; `fontSize` and the tokens are the vocabulary.

`FONT_SIZE_RANGE` (6 to 48) holds a size that arrives from a spec, because type taller than its own frame is not a figure.

Do not add a per-chart type prop beyond `fontSize`. Do not rescue a figure's type with consumer CSS; if a figure needs it, the default or the frame is wrong.

## Text that does not fit

Nothing is drawn outside the box. A row label longer than its gutter is cut with a trailing ellipsis, a legend that would cross the right edge cuts its names, an end value is pulled inside the edge, and a treemap tile prints only what its tile holds. Silent clipping is the failure this prevents.

Width is `chars × fontSize × 0.6`, an estimate for the inherited face that is exact for a monospace one; the ellipsis absorbs the error. Charts render on the server, so measuring the real advance is not available. `truncate`, `textWidth`, and `charsThatFit` are exported for a host laying out its own labels against the same rule.

A legend that has to cut every name is a legend with too many series: `legend={false}` plus the DOM `Legend` is the escape, and it is the better chart.

## Value axis

`yTicks` and `xTicks` take either an explicit ladder or a count.

| Value | Result |
|---|---|
| unset | no value axis, which stays the default |
| `4` | four intervals on the 1-2-5 ladder inside the chart's own domain |
| `[{ at, label }]` | exactly those ticks, and they widen the domain |

A count on log paper counts in decades instead, because a linear ladder on log paper lands on nothing. Labels come from the chart's `format`, and the widest printed label sizes the gutter, so a six-digit axis is not cut and a two-digit one does not waste the plot. The math is `core/scale.ts` (`niceTicks`, `decadeTicks`, `resolveTicks`) and it is exported, so a host that wants the ladder for something else (a legend, a table header) can ask for the same numbers.

Ticks stay opt-in. A chart with no value axis is a legitimate default here, not an omission.

## Color

Categorical color is `--dg-c1` through `--dg-c7`, resolved through `var()` with the shipped defaults as fallbacks, and `cat(i)` cycles them. Seven is the palette: the shipped hues are the validated set, so an eighth is a palette change that has to clear the same lightness, chroma, CVD separation and contrast checks before it exists, not a slot a host can quietly add. Past seven categories a host ranks them and folds the tail into one `Other`, which is the honest chart anyway.

Bridging a host palette is a stylesheet, not a prop. A shadcn/ui host imports the shipped bridge and is done:

```tsx
import "diagrammatic/shadcn.css";
```

It maps the categorical tokens to `--chart-1` through `--chart-5` (the sixth and seventh fall back to the shipped hues), ink to `--foreground`, muted to `--muted-foreground`, grid to `--border`, and surface to `--background`. Any other system writes the same few lines itself:

```css
[data-dg],
[data-dg-legend] {
  --dg-c1: var(--brand-1);
  --dg-grid: var(--line);
  --dg-font: var(--font-mono);
}
```

`--dg-ink`, `--dg-muted`, `--dg-grid`, `--dg-surface`, `--dg-pos`, `--dg-neg` and `--dg-font` cover the rest of the skin. There is no color prop and there will not be one.

## Legends and copy

The built-in legend is drawn inside the SVG and appears when a chart has two or more named series. `legend={false}` turns it off. The `Legend` export from the package root is the DOM counterpart: a flat list of swatch and name pairs on the page's own type, wrapping like text, colored through the same tokens, and server-safe.

```tsx
import { Area, Legend } from "diagrammatic";

<Area series={series} legend={false} width={width} />
<Legend names={series.map((s) => s.name)} />
```

`getSeriesColor` from `diagrammatic/interactive` reads the rendered color of a series from the live figure when a host would rather ask the chart than the palette.

Pre-formatted copy stays out of props. A chart prints numbers through `format`; everything else the host writes around the figure.

## Interaction

Charts stamp four seams on every drawn mark (`index`, `index2`, `series`, `series2`) and nothing else. The interactive layer reads those seams:

| Component | Job |
|---|---|
| `Root` | delegates pointer events to marks, drives hover, click, and highlight |
| `Tooltip` | positions a host-rendered tip against the hovered mark |
| `Zoom` | pans and scales a figure that holds more detail than its frame |
| `viewOf` | the window a zoom transform opens, for a host driving its own |
| `Fit` | measures a fluid box and hands down its width |

All four are client components; the charts inside them stay server components, because the transform, the measurement, and the tooltip live on the wrapper rather than in the geometry. A tooltip receives an address, never the data: the host looks the row up in the data it already has.

`Zoom` has two modes and the child decides which. A node child is scaled as rendered, which is what arbitrary content needs and what stroke widths and type scale with. A function child receives the `view` window instead and hands it to a chart, which redraws through it: hairlines and labels keep their drawn size at any magnification, which is what a map wants.

```tsx
<Zoom max={8}>{(view) => <WorldMap values={byCountry} view={view} />}</Zoom>
```

`view` is a window in fractions of the box, so `{ x: 0, y: 0, w: 1, h: 1 }` is the whole figure and `w: 0.5` is twice the magnification. Fractions rather than pixels so the same window means the same thing at any `width`.

`summary` puts a sentence in the figure's `<desc>`, which assistive technology reads after the `title`. A chart is an image to a screen reader: `title` names it and `summary` says what it shows.

## What does not enter

- A per-role type size, a color, or a font prop on a chart. `fontSize` and the tokens are the vocabulary.
- Dual value axes. Two units on one frame is a composition of two figures.
- A responsive mode that measures inside every chart. Measurement is one wrapper, opt-in, and client-side.
- A fluid default that stretches the figure to its host. A figure has a size; a host that wants it to fill measures once with `Fit`.
- Consumer CSS that rescues default type. If a figure needs it, the default or the frame is wrong.
- Pre-formatted copy in props. A chart cuts a label to fit; it does not take the label already cut, and it does not take a formatted string where a number belongs.
