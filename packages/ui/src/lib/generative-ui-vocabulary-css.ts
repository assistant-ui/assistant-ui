/**
 * CSS for the generative-ui vocabulary's `data-aui` markup, shared by the shadcn registry (which emits it as a `registry:style` item) and any host that renders the vocabulary's markup directly and wants to inject the same rules itself, e.g. the docs gallery.
 */

export type CssDeclarationBlock = Record<string, string>;
export type CssMediaBlock = Record<string, CssDeclarationBlock>;
type CssRuleset = Record<string, CssDeclarationBlock | CssMediaBlock>;

export const auiHairlineBorder =
  "color-mix(in oklab, var(--border) 60%, transparent)";

/**
 * A card earns its frame from its content rather than by existing: the renderer
 * stamps `data-aui-surface` when a tinted background or a footer makes it one,
 * and a carousel slot is a surface by position. Plain sections stay weightless
 * so a composition of several reads as one message rather than a stack of
 * slabs. The flag is an attribute rather than `:has()` because the repository's
 * browserslist still includes Firefox 111, where an unsupported selector would
 * discard the whole rule.
 */
export const auiCardSurfaceSelectors = [
  '[data-aui="card"][data-aui-surface]',
  '[data-aui="carousel"] [data-aui="card"]',
] as const;

const cardSurface = (scope?: string) =>
  auiCardSurfaceSelectors.map((s) => (scope ? `${scope} ${s}` : s)).join(", ");

// Density knobs, host-overridable via CSS custom properties: --aui-control-height, --aui-control-font-size, --aui-button-padding-x, --aui-field-padding-x.
export const generativeUiVocabularyCss: CssRuleset = {
  "[data-aui]": {
    "box-sizing": "border-box",
  },

  '[data-aui="header"]': {
    margin: "0",
    "font-size": "1.25rem",
    "font-weight": "600",
    "letter-spacing": "-0.01em",
    "line-height": "1.2",
  },
  '[data-aui="text"]': {
    "line-height": "1.5",
  },
  '[data-aui="caption"]': {
    margin: "0",
    "font-size": "0.75rem",
    "line-height": "1.4",
    color: "color-mix(in oklab, currentColor 62%, transparent)",
  },

  '[data-aui="text"][data-aui-size="sm"], [data-aui="header"][data-aui-size="sm"]':
    { "font-size": "0.75rem" },
  '[data-aui="text"][data-aui-size="md"], [data-aui="header"][data-aui-size="md"]':
    { "font-size": "0.875rem" },
  '[data-aui="text"][data-aui-size="lg"], [data-aui="header"][data-aui-size="lg"]':
    { "font-size": "1.125rem" },
  '[data-aui="text"][data-aui-size="xl"], [data-aui="header"][data-aui-size="xl"]':
    { "font-size": "1.25rem" },
  '[data-aui="text"][data-aui-size="2xl"], [data-aui="header"][data-aui-size="2xl"]':
    {
      "font-size": "1.5rem",
      "font-weight": "600",
      "letter-spacing": "-0.02em",
    },
  '[data-aui="text"][data-aui-size="3xl"], [data-aui="header"][data-aui-size="3xl"]':
    {
      "font-size": "2.25rem",
      "font-weight": "600",
      "letter-spacing": "-0.02em",
    },

  '[data-aui="text"][data-aui-weight="normal"]': { "font-weight": "400" },
  '[data-aui="text"][data-aui-weight="medium"]': { "font-weight": "500" },
  '[data-aui="text"][data-aui-weight="semibold"]': { "font-weight": "600" },
  '[data-aui="text"][data-aui-weight="bold"]': { "font-weight": "700" },

  '[data-aui="text"][data-aui-color="emphasis"]': {
    color: "var(--foreground)",
  },
  '[data-aui="text"][data-aui-color="secondary"]': {
    color: "color-mix(in oklab, currentColor 62%, transparent)",
  },
  '[data-aui="text"][data-aui-color="alpha-70"]': {
    color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
  },
  '[data-aui="text"][data-aui-color="white"]': { color: "white" },
  '[data-aui="text"][data-aui-color="white-70"]': {
    color: "color-mix(in oklab, white 70%, transparent)",
  },
  '[data-aui="text"][data-aui-color="white-50"]': {
    color: "color-mix(in oklab, white 50%, transparent)",
  },

  '[data-aui="fact"]': { margin: "0" },
  '[data-aui="fact-label"]': {
    margin: "0",
    "font-size": "0.6875rem",
    "text-transform": "uppercase",
    "letter-spacing": "0.05em",
    color: "color-mix(in oklab, currentColor 62%, transparent)",
  },
  '[data-aui="fact-value"]': {
    margin: "0",
    "font-size": "0.875rem",
    "font-variant-numeric": "tabular-nums",
  },

  '[data-aui="button"], [data-aui="card-confirm"], [data-aui="card-cancel"]': {
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    gap: "0.25rem",
    height: "var(--aui-control-height, 2.5rem)",
    padding: "0 var(--aui-button-padding-x, 1.25rem)",
    "border-radius": "calc(var(--radius) - 2px)",
    "font-size": "var(--aui-control-font-size, 0.875rem)",
    "font-weight": "500",
    border: "1px solid transparent",
    cursor: "pointer",
    "background-color": "var(--secondary)",
    color: "var(--secondary-foreground)",
    transition: "background-color 0.15s ease",
    "white-space": "nowrap",
    "flex-shrink": "0",
  },
  '[data-aui="button"]:focus-visible, [data-aui="card-confirm"]:focus-visible, [data-aui="card-cancel"]:focus-visible':
    {
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    },
  '[data-aui="button"][data-aui-style="primary"], [data-aui="card-confirm"]': {
    "background-color": "var(--primary)",
    color: "var(--primary-foreground)",
  },
  '[data-aui="button"][data-aui-style="primary"]:hover, [data-aui="card-confirm"]:hover':
    {
      "background-color":
        "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  '[data-aui="button"][data-aui-style="secondary"]': {
    "background-color": "var(--secondary)",
    color: "var(--secondary-foreground)",
  },
  '[data-aui="button"][data-aui-style="secondary"]:hover': {
    "background-color":
      "color-mix(in oklab, var(--secondary) 90%, transparent)",
  },
  '[data-aui="button"][data-aui-style="outline"]': {
    "background-color": "transparent",
    color: "var(--foreground)",
    "border-color": auiHairlineBorder,
  },
  '[data-aui="button"][data-aui-style="outline"]:hover': {
    "background-color": "var(--accent)",
    color: "var(--accent-foreground)",
  },
  '[data-aui="button"][data-aui-style="ghost"], [data-aui="card-cancel"]': {
    "background-color": "transparent",
    color: "var(--foreground)",
  },
  '[data-aui="button"][data-aui-style="ghost"]:hover, [data-aui="card-cancel"]:hover':
    {
      "background-color": "var(--accent)",
      color: "var(--accent-foreground)",
    },
  '[data-aui="button"][data-aui-style="danger"]': {
    "background-color": "var(--destructive)",
    color: "var(--primary-foreground)",
  },
  '[data-aui="button"][data-aui-style="danger"]:hover': {
    "background-color":
      "color-mix(in oklab, var(--destructive) 90%, transparent)",
  },
  '[data-aui="button"][data-aui-block]': { width: "100%" },

  '[data-aui="select"], [data-aui="input"], [data-aui="datepicker"]': {
    display: "block",
    width: "100%",
    "min-width": "0",
    height: "var(--aui-control-height, 2.5rem)",
    padding: "0 var(--aui-field-padding-x, 0.875rem)",
    "border-radius": "calc(var(--radius) - 2px)",
    border: "1px solid var(--input)",
    "background-color": "transparent",
    "font-size": "var(--aui-control-font-size, 0.875rem)",
    color: "var(--foreground)",
  },
  '[data-aui="datepicker"]': { "max-width": "100%" },
  '[data-aui="input"][data-aui-multiline]': {
    height: "auto",
    "min-height": "2.5rem",
    padding: "0.625rem var(--aui-field-padding-x, 0.875rem)",
    "line-height": "1.5",
    resize: "vertical",
  },
  '[data-aui="input"]::placeholder': {
    color: "color-mix(in oklab, currentColor 45%, transparent)",
  },
  '[data-aui="select"]:focus-visible, [data-aui="input"]:focus-visible, [data-aui="datepicker"]:focus-visible':
    {
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    },

  '[data-aui="checkbox"]': {
    display: "inline-flex",
    "align-items": "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  '[data-aui="radiogroup-option"]': {
    display: "flex",
    "align-items": "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  '[data-aui="checkbox"] input, [data-aui="radiogroup-option"] input': {
    "accent-color": "var(--primary)",
    width: "1rem",
    height: "1rem",
    margin: "0",
    cursor: "pointer",
  },
  '[data-aui="checkbox"] input:focus-visible, [data-aui="radiogroup-option"] input:focus-visible':
    {
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    },
  '[data-aui="radiogroup"]': {
    border: "none",
    margin: "0",
    padding: "0",
    display: "flex",
    "flex-direction": "column",
    gap: "0.25rem",
  },

  // The surface spaces itself: several `present` calls land as adjacent blocks
  // in a host container this stylesheet does not own. In a block context these
  // margins collapse into one gap between neighbours; a flex or grid host adds
  // them to its own spacing instead.
  '[data-aui="root"]': {
    display: "flex",
    "flex-direction": "column",
    gap: "0.875rem",
    "margin-block": "0.875rem",
  },
  // A call whose nodes have not arrived yet renders no children, and an empty
  // surface would otherwise hold its margins open for the length of the stream.
  '[data-aui="root"]:empty': { display: "none" },

  // Padding rides a custom property rather than the surface rule, so the
  // `data-aui-padding` tokens below still win on source order; a selector
  // specific enough to name a surface would otherwise outrank them and make
  // the model's own value inert.
  '[data-aui="card"]': {
    display: "flex",
    "flex-direction": "column",
    gap: "0.875rem",
    padding: "var(--aui-card-padding, 0)",
  },
  [cardSurface()]: {
    "--aui-card-padding": "1.25rem",
    "background-color": "var(--card)",
    color: "var(--card-foreground)",
    border: `1px solid ${auiHairlineBorder}`,
    "border-radius": "var(--radius)",
    "box-shadow": "none",
  },
  '[data-aui="card-title"]': {
    margin: "0",
    "font-size": "0.9375rem",
    "font-weight": "600",
  },
  '[data-aui="card-footer"]': {
    display: "flex",
    "justify-content": "flex-end",
    gap: "0.5rem",
    "padding-top": "0.75rem",
    "border-top": `1px solid ${auiHairlineBorder}`,
  },
  '[data-aui-padding="0"]': { padding: "0" },
  '[data-aui-padding="1"]': { padding: "calc(1 * 4px)" },
  '[data-aui-padding="2"]': { padding: "calc(2 * 4px)" },
  '[data-aui-padding="3"]': { padding: "calc(3 * 4px)" },
  '[data-aui-padding="4"]': { padding: "calc(4 * 4px)" },
  '[data-aui-padding="5"]': { padding: "calc(5 * 4px)" },
  '[data-aui-padding="6"]': { padding: "calc(6 * 4px)" },
  '[data-aui-padding="7"]': { padding: "calc(7 * 4px)" },
  '[data-aui-padding="8"]': { padding: "calc(8 * 4px)" },

  '[data-aui="row"]': {
    display: "flex",
    "flex-direction": "row",
    gap: "0.5rem",
  },
  '[data-aui="col"]': {
    display: "flex",
    "flex-direction": "column",
    gap: "0.625rem",
  },
  '[data-aui="form"]': {
    display: "flex",
    "flex-direction": "column",
    gap: "0.75rem",
    margin: "0",
  },
  '[data-aui="spacer"]': { flex: "1" },

  '[data-aui="row"][data-aui-align="start"], [data-aui="col"][data-aui-align="start"]':
    { "align-items": "flex-start" },
  '[data-aui="row"][data-aui-align="center"], [data-aui="col"][data-aui-align="center"]':
    { "align-items": "center" },
  '[data-aui="row"][data-aui-align="end"], [data-aui="col"][data-aui-align="end"]':
    {
      "align-items": "flex-end",
    },
  '[data-aui="row"][data-aui-justify="start"]': {
    "justify-content": "flex-start",
  },
  '[data-aui="row"][data-aui-justify="center"]': {
    "justify-content": "center",
  },
  '[data-aui="row"][data-aui-justify="end"]': { "justify-content": "flex-end" },
  '[data-aui="row"][data-aui-justify="between"]': {
    "justify-content": "space-between",
  },

  '[data-aui-gap="0"]': { gap: "0" },
  '[data-aui-gap="1"]': { gap: "calc(1 * 4px)" },
  '[data-aui-gap="2"]': { gap: "calc(2 * 4px)" },
  '[data-aui-gap="3"]': { gap: "calc(3 * 4px)" },
  '[data-aui-gap="4"]': { gap: "calc(4 * 4px)" },
  '[data-aui-gap="5"]': { gap: "calc(5 * 4px)" },
  '[data-aui-gap="6"]': { gap: "calc(6 * 4px)" },
  '[data-aui-gap="7"]': { gap: "calc(7 * 4px)" },
  '[data-aui-gap="8"]': { gap: "calc(8 * 4px)" },

  '[data-aui="box"]': { display: "block" },

  '[data-aui="icon"]': {
    display: "inline-block",
    "vertical-align": "-0.125em",
    "flex-shrink": "0",
  },

  '[data-aui="alert"]': {
    "border-width": "1px",
    "border-style": "solid",
    "border-radius": "var(--radius)",
    padding: "0.75rem 0.875rem",
  },
  '[data-aui="alert"][data-aui-tone="info"]': {
    "border-color": "color-mix(in oklab, var(--primary) 45%, transparent)",
    "background-color": "color-mix(in oklab, var(--primary) 8%, transparent)",
  },
  '[data-aui="alert"][data-aui-tone="success"]': {
    "border-color": "color-mix(in oklab, var(--aui-success) 45%, transparent)",
    "background-color":
      "color-mix(in oklab, var(--aui-success) 8%, transparent)",
  },
  '[data-aui="alert"][data-aui-tone="warning"]': {
    "border-color": "color-mix(in oklab, var(--aui-warning) 45%, transparent)",
    "background-color":
      "color-mix(in oklab, var(--aui-warning) 8%, transparent)",
  },
  '[data-aui="alert"][data-aui-tone="danger"]': {
    "border-color": "color-mix(in oklab, var(--destructive) 45%, transparent)",
    "background-color":
      "color-mix(in oklab, var(--destructive) 8%, transparent)",
  },
  '[data-aui="alert-title"]': { margin: "0 0 0.25rem 0", "font-weight": "500" },
  '[data-aui="alert-desc"]': {
    margin: "0",
    color: "color-mix(in oklab, currentColor 62%, transparent)",
    "font-size": "0.8125rem",
  },

  '[data-aui="table"]': { width: "100%", "border-collapse": "collapse" },
  '[data-aui="table-col"]': {
    "text-align": "left",
    "font-size": "0.75rem",
    "font-weight": "500",
    color: "color-mix(in oklab, currentColor 62%, transparent)",
    padding: "0.5rem 0.75rem",
    "border-bottom": `1px solid ${auiHairlineBorder}`,
  },
  '[data-aui="table"] td': {
    "font-size": "0.875rem",
    padding: "0.5rem 0.75rem",
    "text-align": "left",
    "font-variant-numeric": "tabular-nums",
  },
  '[data-aui="table"] tbody tr:not(:last-child) td': {
    "border-bottom": `1px solid ${auiHairlineBorder}`,
  },

  '[data-aui="chart"]': {
    display: "block",
    width: "100%",
    height: "3rem",
    color: "var(--chart-1)",
  },
  '[data-aui="chart"] polyline, [data-aui="chart"] polygon': {
    "stroke-width": "1.5",
  },
  '[data-aui="chart"][data-aui-color] [data-aui="chart-series"]:only-child': {
    color: "inherit",
  },
  '[data-aui="chart"][data-aui-color="emphasis"]': {
    color: "var(--foreground)",
  },
  '[data-aui="chart"][data-aui-color="secondary"]': {
    color: "color-mix(in oklab, currentColor 62%, transparent)",
  },
  '[data-aui="chart"][data-aui-color="alpha-70"]': {
    color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
  },
  '[data-aui="chart"][data-aui-color="white"]': { color: "white" },
  '[data-aui="chart"][data-aui-color="white-70"]': {
    color: "color-mix(in oklab, white 70%, transparent)",
  },
  '[data-aui="chart"][data-aui-color="white-50"]': {
    color: "color-mix(in oklab, white 50%, transparent)",
  },

  '[data-aui="chart-frame"]': {
    display: "grid",
    "grid-template-columns": "auto 1fr",
    gap: "0.25rem",
  },
  '[data-aui="chart-frame"] > [data-aui="chart-ticks"]': {
    "grid-column": "1",
    "grid-row": "1",
    display: "flex",
    "flex-direction": "column",
    "justify-content": "space-between",
    "text-align": "right",
  },
  '[data-aui="chart-frame"] > [data-aui="chart-ticks"], [data-aui="chart-frame"] > [data-aui="chart-xlabels"]':
    {
      "font-size": "0.6875rem",
      color: "var(--muted-foreground)",
    },
  '[data-aui="chart-frame"] > svg[data-aui="chart"]': {
    "grid-column": "2",
    "grid-row": "1",
    height: "6.5rem",
  },
  '[data-aui="chart-frame"] > [data-aui="chart-xlabels"]': {
    "grid-column": "2",
    "grid-row": "2",
    display: "flex",
    "justify-content": "space-between",
  },
  '[data-aui="chart-frame"] > [data-aui="chart-legend"]': {
    "grid-column": "1 / -1",
    "grid-row": "3",
    display: "flex",
    gap: "0.75rem",
    "font-size": "0.75rem",
    color: "var(--muted-foreground)",
  },
  '[data-aui="chart-legend-item"]': {
    display: "inline-flex",
    "align-items": "center",
    gap: "0.25rem",
  },
  '[data-aui="chart-legend-swatch"]': {
    display: "inline-block",
    width: "0.625rem",
    height: "0.625rem",
    "border-radius": "calc(var(--radius) - 4px)",
    "background-color": "currentColor",
  },
  '[data-aui="chart-series"][data-aui-series="0"], [data-aui="chart-legend-item"][data-aui-series="0"]':
    { color: "var(--chart-1)" },
  '[data-aui="chart-series"][data-aui-series="1"], [data-aui="chart-legend-item"][data-aui-series="1"]':
    { color: "var(--chart-2)" },
  '[data-aui="chart-series"][data-aui-series="2"], [data-aui="chart-legend-item"][data-aui-series="2"]':
    { color: "var(--chart-3)" },
  '[data-aui="chart-series"][data-aui-series="3"], [data-aui="chart-legend-item"][data-aui-series="3"]':
    { color: "var(--chart-4)" },
  '[data-aui="chart-series"][data-aui-series="4"], [data-aui="chart-legend-item"][data-aui-series="4"]':
    { color: "var(--chart-5)" },

  '[data-aui="carousel"]': {
    display: "flex",
    "overflow-x": "auto",
    "scroll-snap-type": "x mandatory",
    "scroll-behavior": "smooth",
    gap: "0.75rem",
    "padding-bottom": "0.5rem",
    "scrollbar-width": "thin",
  },
  '[data-aui="carousel"]:focus-visible': {
    outline: "2px solid var(--ring)",
    "outline-offset": "2px",
  },
  '[data-aui="carousel-slide"]': {
    "scroll-snap-align": "start",
    flex: "0 0 auto",
    "min-width": "14rem",
  },
  "@media (prefers-reduced-motion: reduce)": {
    '[data-aui="carousel"]': { "scroll-behavior": "auto" },
  },

  '[data-aui="listview"]': {
    "list-style": "none",
    margin: "0",
    padding: "0",
  },
  '[data-aui="listview-item"] + [data-aui="listview-item"]': {
    "border-top": `1px solid ${auiHairlineBorder}`,
  },
  '[data-aui="listview-item-trigger"]': {
    padding: "0.75rem 0.875rem",
    "border-radius": "calc(var(--radius) - 2px)",
    cursor: "pointer",
  },
  '[data-aui="listview-item-trigger"]:hover': {
    "background-color": "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  '[data-aui="listview-item-trigger"]:focus-visible': {
    outline: "2px solid var(--ring)",
    "outline-offset": "2px",
  },

  '[data-aui="divider"]': {
    border: "none",
    "border-top": `1px solid ${auiHairlineBorder}`,
    margin: "0.75rem 0",
  },
  '[data-aui="divider"][data-aui-flush]': { margin: "0" },
  '[data-aui="card"] > [data-aui="divider"]': { margin: "0" },

  '[data-aui="image"]': {
    "max-width": "100%",
    display: "block",
    "border-radius": "calc(var(--radius) - 2px)",
  },
  '[data-aui="image"][data-aui-size="sm"]': { "max-width": "8rem" },
  '[data-aui="image"][data-aui-size="md"]': { "max-width": "16rem" },
  '[data-aui="image"][data-aui-size="lg"]': { "max-width": "24rem" },
  '[data-aui="image"][data-aui-round]': {
    width: "2.5rem",
    height: "2.5rem",
    "border-radius": "9999px",
    "object-fit": "cover",
    "aspect-ratio": "1 / 1",
  },
  '[data-aui="image"][data-aui-round][data-aui-size="sm"]': {
    width: "2rem",
    height: "2rem",
  },
  '[data-aui="image"][data-aui-round][data-aui-size="md"]': {
    width: "2.5rem",
    height: "2.5rem",
  },
  '[data-aui="image"][data-aui-round][data-aui-size="lg"]': {
    width: "3.25rem",
    height: "3.25rem",
  },

  '[data-aui="markdown"]': { "font-size": "0.875rem", "line-height": "1.6" },
  '[data-aui="markdown"] p': { margin: "0 0 0.5rem 0" },
  '[data-aui="markdown"] p:last-child': { "margin-bottom": "0" },
  '[data-aui="markdown"] a': {
    color: "var(--primary)",
    "text-decoration": "underline",
    "text-underline-offset": "2px",
  },
  '[data-aui="markdown"] code': {
    "font-size": "0.8125em",
    "background-color": "color-mix(in oklab, var(--muted) 60%, transparent)",
    padding: "0.125rem 0.375rem",
    "border-radius": "calc(var(--radius) - 4px)",
    "font-family":
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  '[data-aui="markdown"] pre': {
    "background-color": "color-mix(in oklab, var(--muted) 60%, transparent)",
    padding: "0.75rem",
    "border-radius": "calc(var(--radius) - 2px)",
    "overflow-x": "auto",
  },
  '[data-aui="markdown"] pre code': {
    "background-color": "transparent",
    padding: "0",
  },
  '[data-aui="markdown"] ul, [data-aui="markdown"] ol': {
    "padding-left": "1.25rem",
  },
  '[data-aui="markdown"] ol': { "list-style-type": "decimal" },
  '[data-aui="markdown"] ul': { "list-style-type": "disc" },
  '[data-aui="markdown"] li': { margin: "0.25rem 0" },
  '[data-aui="markdown"] h1, [data-aui="markdown"] h2, [data-aui="markdown"] h3':
    {
      margin: "0.75em 0 0.25em",
      "font-weight": "600",
    },
  '[data-aui="markdown"] h1': { "font-size": "1.125em" },
  '[data-aui="markdown"] h2': { "font-size": "1.0625em" },
  '[data-aui="markdown"] h3': { "font-size": "1em" },
  '[data-aui="markdown"] blockquote': {
    "border-left": `2px solid ${auiHairlineBorder}`,
    "padding-left": "0.75rem",
    color: "color-mix(in oklab, currentColor 62%, transparent)",
    margin: "0.5em 0",
  },

  '[data-aui="badge"]': {
    display: "inline-flex",
    "align-items": "center",
    gap: "0.25rem",
    "border-radius": "9999px",
    padding: "0.125rem 0.5rem",
    "font-size": "0.75rem",
    "font-weight": "500",
    "line-height": "1.4",
    "font-variant-numeric": "tabular-nums",
    "background-color": "var(--muted)",
    color: "color-mix(in oklab, currentColor 62%, transparent)",
    "flex-shrink": "0",
    "white-space": "nowrap",
  },
  '[data-aui="badge"][data-aui-variant="info"]': {
    "background-color": "color-mix(in oklab, var(--primary) 15%, transparent)",
    color: "var(--primary)",
  },
  '[data-aui="badge"][data-aui-variant="success"]': {
    "background-color":
      "color-mix(in oklab, var(--aui-success) 15%, transparent)",
    color: "var(--aui-success)",
  },
  '[data-aui="badge"][data-aui-variant="warning"]': {
    "background-color":
      "color-mix(in oklab, var(--aui-warning) 15%, transparent)",
    color: "var(--aui-warning)",
  },
  '[data-aui="badge"][data-aui-variant="danger"]': {
    "background-color":
      "color-mix(in oklab, var(--destructive) 15%, transparent)",
    color: "var(--destructive)",
  },
};

/** Light/dark values for the vocabulary's own theme tokens (`--aui-success`, `--aui-warning`), layered on top of the host's shadcn theme. */
export const generativeUiThemeVars = {
  light: {
    "--aui-success": "oklch(0.6 0.15 149)",
    "--aui-warning": "oklch(0.68 0.16 70)",
  },
  dark: {
    "--aui-success": "oklch(0.72 0.17 149)",
    "--aui-warning": "oklch(0.8 0.17 75)",
  },
} as const;

const T = '[data-aui-theme="elements"]';
const TD = `.dark ${T}`;
const inkFill = (pct: number) =>
  `color-mix(in oklab, var(--foreground) ${pct}%, transparent)`;
const elementsHairline = inkFill(6);
const elementsMonoStack =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/** Light/dark values for the elements theme's own tokens, scoped to the themed subtree. */
export const generativeUiElementsThemeVars = {
  light: {
    "--aui-live": "oklch(0.623 0.214 259.815)",
  },
  dark: {
    "--aui-live": "oklch(0.707 0.165 254.624)",
  },
} as const;

/**
 * The elements theme for the vocabulary: the borderless paper/field/ink language from the elements family, applied to any subtree carrying `data-aui-theme="elements"`. Layered after {@link generativeUiVocabularyCss}; the base rules keep layout and typography, this layer replaces surfaces, borders, radii, and color.
 */
export const generativeUiElementsThemeCss: CssRuleset = {
  [cardSurface(T)]: {
    border: `1px solid ${auiHairlineBorder}`,
    "border-radius": "20px",
    "background-color": "var(--background)",
    "box-shadow": "none",
  },
  [cardSurface(TD)]: {
    "background-color": "var(--popover)",
    "box-shadow": "none",
  },
  [`${T} [data-aui="card-footer"]`]: {
    "border-top": "none",
    "padding-top": "0.25rem",
  },

  [`${T} [data-aui="select"], ${T} [data-aui="input"], ${T} [data-aui="datepicker"]`]:
    {
      border: "none",
      "border-radius": "12px",
      "background-color": inkFill(4),
      "caret-color": "var(--aui-live)",
      transition: "background-color 0.15s ease",
    },
  [`${TD} [data-aui="select"], ${TD} [data-aui="input"], ${TD} [data-aui="datepicker"]`]:
    {
      "background-color": inkFill(6),
    },
  [`${T} [data-aui="select"]:focus-visible, ${T} [data-aui="input"]:focus-visible, ${T} [data-aui="datepicker"]:focus-visible`]:
    {
      outline: "none",
      "background-color": inkFill(7),
    },
  [`${TD} [data-aui="select"]:focus-visible, ${TD} [data-aui="input"]:focus-visible, ${TD} [data-aui="datepicker"]:focus-visible`]:
    {
      "background-color": inkFill(9),
    },
  [`${T} [data-aui="input"]::placeholder`]: {
    color: inkFill(35),
  },

  [`${T} [data-aui="button"], ${T} [data-aui="card-confirm"], ${T} [data-aui="card-cancel"]`]:
    {
      border: "none",
      "border-radius": "9999px",
      transition:
        "background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease, transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)",
    },
  [`${T} [data-aui="button"]:active, ${T} [data-aui="card-confirm"]:active, ${T} [data-aui="card-cancel"]:active`]:
    {
      transform: "scale(0.96)",
    },
  [`${T} [data-aui="button"]:focus-visible, ${T} [data-aui="card-confirm"]:focus-visible, ${T} [data-aui="card-cancel"]:focus-visible`]:
    {
      outline: `2px solid ${inkFill(20)}`,
      "outline-offset": "2px",
    },
  [`${T} [data-aui="button"][data-aui-style="primary"], ${T} [data-aui="card-confirm"]`]:
    {
      "background-color": "var(--foreground)",
      color: "var(--background)",
    },
  [`${T} [data-aui="button"][data-aui-style="primary"]:hover, ${T} [data-aui="card-confirm"]:hover`]:
    {
      "background-color": "var(--foreground)",
      opacity: "0.9",
    },
  [`${T} [data-aui="button"][data-aui-style="secondary"], ${T} [data-aui="button"][data-aui-style="outline"], ${T} [data-aui="button"]:not([data-aui-style])`]:
    {
      "background-color": inkFill(4),
      color: "var(--foreground)",
      "border-color": "transparent",
    },
  [`${T} [data-aui="button"][data-aui-style="secondary"]:hover, ${T} [data-aui="button"][data-aui-style="outline"]:hover, ${T} [data-aui="button"]:not([data-aui-style]):hover`]:
    {
      "background-color": inkFill(7),
      color: "var(--foreground)",
    },
  [`${TD} [data-aui="button"][data-aui-style="secondary"], ${TD} [data-aui="button"][data-aui-style="outline"], ${TD} [data-aui="button"]:not([data-aui-style])`]:
    {
      "background-color": inkFill(6),
    },
  [`${T} [data-aui="button"][data-aui-style="ghost"], ${T} [data-aui="card-cancel"]`]:
    {
      "background-color": "transparent",
      color: inkFill(55),
    },
  [`${T} [data-aui="button"][data-aui-style="ghost"]:hover, ${T} [data-aui="card-cancel"]:hover`]:
    {
      "background-color": inkFill(6),
      color: inkFill(90),
    },

  [`${T} [data-aui="checkbox"] input, ${T} [data-aui="radiogroup-option"] input`]:
    {
      "accent-color": "var(--foreground)",
    },

  [`${T} [data-aui="alert"]`]: {
    border: "none",
    "border-radius": "14px",
  },
  [`${T} [data-aui="alert-title"]`]: {
    "font-size": "0.875rem",
    "font-weight": "500",
  },
  [`${T} [data-aui="alert-desc"]`]: {
    "font-size": "0.8125rem",
  },

  [`${T} [data-aui="divider"]`]: {
    "border-top-color": elementsHairline,
  },
  [`${T} [data-aui="listview-item"] + [data-aui="listview-item"]`]: {
    "border-top-color": elementsHairline,
  },
  [`${T} [data-aui="listview-item-trigger"]`]: {
    "border-radius": "10px",
  },
  [`${T} [data-aui="listview-item-trigger"]:hover`]: {
    "background-color": inkFill(4),
  },

  [`${T} [data-aui="table-col"]`]: {
    "font-family": elementsMonoStack,
    "font-size": "0.6875rem",
    "letter-spacing": "-0.01em",
    "text-transform": "none",
    color: inkFill(35),
    "border-bottom-color": elementsHairline,
  },
  [`${T} [data-aui="table"] tbody tr:not(:last-child) td`]: {
    "border-bottom-color": elementsHairline,
  },

  [`${T} [data-aui="fact-label"]`]: {
    "font-family": elementsMonoStack,
    "letter-spacing": "-0.01em",
    "text-transform": "none",
    color: inkFill(35),
  },

  [`${T} [data-aui="badge"]`]: {
    "align-self": "center",
    "background-color": inkFill(6),
    color: inkFill(70),
  },
  [`${T} [data-aui="badge"][data-aui-variant="info"]`]: {
    "background-color": "color-mix(in oklab, var(--aui-live) 12%, transparent)",
    color: "var(--aui-live)",
  },

  [`${T} [data-aui="chart"]`]: {
    color: inkFill(70),
  },
  [`${T} [data-aui="chart"] polygon`]: {
    "fill-opacity": "0.12",
  },
  [`${T} [data-aui="chart-series"][data-aui-series="0"], ${T} [data-aui="chart-legend-item"][data-aui-series="0"]`]:
    { color: inkFill(80) },
  [`${T} [data-aui="chart-series"][data-aui-series="1"], ${T} [data-aui="chart-legend-item"][data-aui-series="1"]`]:
    { color: "var(--aui-live)" },
  [`${T} [data-aui="chart-series"][data-aui-series="2"], ${T} [data-aui="chart-legend-item"][data-aui-series="2"]`]:
    { color: inkFill(45) },
  [`${T} [data-aui="chart-series"][data-aui-series="3"], ${T} [data-aui="chart-legend-item"][data-aui-series="3"]`]:
    { color: "var(--aui-success)" },
  [`${T} [data-aui="chart-series"][data-aui-series="4"], ${T} [data-aui="chart-legend-item"][data-aui-series="4"]`]:
    { color: inkFill(30) },
  [`${T} [data-aui="chart-legend-swatch"]`]: {
    "border-radius": "9999px",
  },

  [`${T} [data-aui="image"]`]: {
    "border-radius": "12px",
    outline: "1px solid oklch(0 0 0 / 0.08)",
    "outline-offset": "-1px",
  },
  [`${TD} [data-aui="image"]`]: {
    outline: "1px solid oklch(1 0 0 / 0.1)",
  },

  [`${T} [data-aui="markdown"] a`]: {
    color: "var(--aui-live)",
  },
  [`${T} [data-aui="markdown"] code, ${T} [data-aui="markdown"] pre`]: {
    "background-color": inkFill(5),
  },
};

export function isDeclarationBlock(
  rule: CssDeclarationBlock | CssMediaBlock,
): rule is CssDeclarationBlock {
  return Object.values(rule).every((value) => typeof value === "string");
}

function formatDeclarationBlock(
  selector: string,
  declarations: CssDeclarationBlock,
): string {
  const body = Object.entries(declarations)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
}

function serializeRuleset(ruleset: CssRuleset): string {
  return Object.entries(ruleset)
    .map(([selector, rule]) =>
      isDeclarationBlock(rule)
        ? formatDeclarationBlock(selector, rule)
        : `${selector} {\n${indent(
            Object.entries(rule)
              .map(([nestedSelector, declarations]) =>
                formatDeclarationBlock(nestedSelector, declarations),
              )
              .join("\n\n"),
          )}\n}`,
    )
    .join("\n\n");
}

/** Serializes {@link generativeUiVocabularyCss} to plain CSS text, for a host that injects it directly (e.g. a `<style>` tag) instead of going through the shadcn registry's `css` pipeline. */
export function generativeUiCssText(): string {
  return serializeRuleset(generativeUiVocabularyCss);
}

/** Serializes {@link generativeUiElementsThemeCss}; inject after {@link generativeUiCssText} so the theme layer wins ties. */
export function generativeUiElementsThemeCssText(): string {
  return serializeRuleset(generativeUiElementsThemeCss);
}
