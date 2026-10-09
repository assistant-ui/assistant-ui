import { DEFAULT_CDN_ORIGINS } from "../csp";
import { THEME_TOKENS, type ThemeTokens } from "../theme";

export const WIDGET_MODULES = [
  "diagram",
  "chart",
  "data_viz",
  "interactive",
  "mockup",
  "elicitation",
  "art",
] as const;

export type WidgetModule = (typeof WIDGET_MODULES)[number];

export type Platform = "desktop" | "mobile";

export const MODULE_SUMMARIES: Record<WidgetModule, string> = {
  diagram:
    "SVG flowcharts, architecture and sequence diagrams, cycles, hierarchies",
  chart: "bar, line, area, scatter, and pie charts of a dataset",
  data_viz:
    "bespoke visualizations, D3, dashboards, stat tiles, tables, heatmaps",
  interactive:
    "calculators, simulations, explorable explanations, controls that update output",
  mockup: "UI mockups, wireframes, app and web screens",
  elicitation: "a form that collects several answers from the user at once",
  art: "illustrations, generative art, decorative or explanatory drawings",
};

export type HostApiOptions = {
  /** The host routes `sendPrompt` to the chat. Defaults to true. */
  prompt?: boolean;
  /** The host exposes tools through `genframe.callTool`. Defaults to false. */
  callTool?: boolean;
};

export type GuidanceOptions = {
  modules?: readonly WidgetModule[];
  platform?: Platform;
  /** The tokens the host sends; their names become the token reference. */
  tokens?: ThemeTokens;
  cdnOrigins?: readonly string[];
  connectOrigins?: readonly string[];
  allowEval?: boolean;
  /** Frame width in CSS pixels. Defaults to 680 on desktop and 360 on mobile. */
  width?: number;
  hostApi?: HostApiOptions;
};

type Context = {
  width: number;
  platform: Platform;
  cdn: readonly string[];
  connect: readonly string[];
  allowEval: boolean;
  hostApi: Required<HostApiOptions>;
  tokenNames: readonly string[];
  extraTokens: readonly string[];
  example: (path: string) => string;
};

const list = (items: readonly string[]) =>
  items.map((item) => `- ${item}`).join("\n");

const cdnExample = (cdn: readonly string[]) => (path: string) => {
  if (cdn.includes("https://cdn.jsdelivr.net"))
    return `https://cdn.jsdelivr.net/npm/${path}`;
  if (cdn.includes("https://unpkg.com")) return `https://unpkg.com/${path}`;
  const host = cdn[0];
  return host
    ? `${host}/…/${path}`
    : `(no script CDN is allowed: ${path} is unavailable)`;
};

const baseSection = (ctx: Context) => `# Widgets

A widget is a visual you place in the conversation by calling \`show_widget\`. Its \`widget_code\` streams into a sandboxed frame and renders element by element while you write it. Use widgets when a picture, chart, diagram, or control explains something better than prose; keep explanations, caveats, and conclusions in your chat reply, not inside the widget.

## Format

- Write an HTML fragment: no \`<!doctype>\`, \`<html>\`, \`<head>\`, or \`<body>\`. Code that starts with \`<svg\` is treated as a standalone SVG; give it a \`viewBox\` and no fixed \`height\`.
- The frame is about ${ctx.width}px wide and grows to the height of your content. Never set a fixed height or \`100vh\` on the outermost element, and do not use \`position: fixed\` or \`sticky\` at the top level.
- The background is transparent and the host already pads the frame. Do not add an outer background, border, margin, or padding around the whole widget; cards and panels inside it are fine.
- Keep headings inside the widget short (a few words). One widget answers one question; make a second widget rather than a tabbed super-widget.

## Streaming order

- Write one short \`<style>\` block first, then markup from top to bottom, then all \`<script>\` elements last.
- Scripts are held until the whole widget has arrived, then run once in document order. The markup must already make sense before any script runs: headings, labels, and containers first, with explicit heights for anything a script fills in (a chart canvas wrapper, a D3 mount point) so the layout does not jump.
- Prefer inline \`style\` attributes or simple class rules; avoid content that only appears after JavaScript runs, such as hidden tabs, carousels, or \`display: none\` sections that a script reveals.
- Avoid large shadows, blurs, \`backdrop-filter\`, and big gradients. They repaint on every streamed chunk and look unstable; use flat fills and 1px borders.
- Scripts can run directly at the end of the widget; waiting for \`DOMContentLoaded\` also works but is unnecessary.

## Theme

Style everything with these CSS variables. The host keeps them in sync with its own theme and switches light and dark live, so a widget that only uses tokens always matches.

${themeTable(ctx)}

- Plain elements are already styled to match the host: headings, paragraphs, links, tables, \`button\`, \`input\`, \`select\`, \`textarea\`, checkboxes, and ranges. Only add CSS for layout and for what you change.
- Hardcode a color only for data encodings the tokens cannot express, and check that it reads on both light and dark backgrounds.
- Canvas-based libraries cannot read CSS variables. Resolve them with \`getComputedStyle(document.documentElement).getPropertyValue("--chart-1").trim()\`, and redraw when the window fires \`themechange\`.
- Use \`--font-sans\` for all text; never load a font just for decoration.

## Libraries and network

- Scripts, stylesheets, images, and fonts load only from: ${ctx.cdn.length > 0 ? ctx.cdn.join(", ") : "nowhere (inline everything)"}. Anything else is blocked by the frame's Content Security Policy and fails silently.
- ${
  ctx.connect.length > 0
    ? `\`fetch\`, XHR, and WebSocket may reach only: ${ctx.connect.join(", ")}.`
    : "There is no network access: `fetch`, XHR, and WebSocket are blocked. Embed the data in the script as literals."
}
- Pin exact versions in library URLs, for example \`${ctx.example("chart.js@4.4.1/dist/chart.umd.min.js")}\`. Prefer UMD builds loaded with \`<script src>\`; use \`<script type="module">\` with ES module URLs only when no UMD build exists.
- ${ctx.allowEval ? "`eval` and `new Function` are allowed." : "`eval` and `new Function` are blocked; avoid libraries that compile templates or expressions at runtime."}
- Form submissions cannot navigate. Handle \`submit\` in JavaScript and call \`preventDefault()\`.
- \`localStorage\` can keep small UI state (the open tab, a toggle) between visits when the host gives the widget a stable id; otherwise it starts empty. Read it defensively, and expect the browser to evict it. Do not use cookies: browsers block them in third-party frames. State that must last goes through \`genframe.setState\`.

## Host API

${hostApiSection(ctx)}

## Accessibility

- HTML widgets begin with a visually hidden heading that names the widget: \`<h2 class="sr-only">Monthly revenue by region</h2>\`.
- SVG widgets use \`role="img"\` on the root with \`<title>\` and \`<desc>\` as its first children.
- Never encode meaning with color alone; pair it with a label, sign, icon, or pattern. Keep text at 12px or larger and at readable contrast.
- Interactive parts are real \`<button>\`, \`<input>\`, \`<select>\`, or \`<a>\` elements with visible labels, reachable by keyboard.
- Motion is optional decoration. Keep it short, and skip it when \`prefers-reduced-motion\` is set.

## Editing and errors

- To change a widget you already showed, call \`edit_widget\` with exact \`old_string\` → \`new_string\` replacements copied from its latest code. Each \`old_string\` must occur exactly once; include neighboring text to make it unique. Re-send the whole widget with \`show_widget\` under the same title only for broad rewrites.
- When a render reports errors, fix their cause rather than wrapping code in \`try\`/\`catch\`.

${platformSection(ctx)}

## Before sending

${list([
  "Fragment or single `<svg>`, with style, then markup, then scripts.",
  "Every color, font, and radius comes from a token, or is a deliberate data color that works in both themes.",
  "Nothing loads from outside the allowed origins, and nothing depends on the network.",
  "Fixed-height containers for script-drawn content; no fixed height on the outer element.",
  "An accessible name: hidden `<h2>` for HTML, `<title>` and `<desc>` for SVG.",
])}`;

const themeTable = (ctx: Context) => {
  const rows = THEME_TOKENS.filter((token) =>
    ctx.tokenNames.includes(token.name),
  ).map((token) => `| \`${token.name}\` | ${token.usage} |`);
  const table = ["| Token | Use for |", "| --- | --- |", ...rows].join("\n");
  if (ctx.extraTokens.length === 0) return table;
  return `${table}\n\nThe host also defines: ${ctx.extraTokens.map((name) => `\`${name}\``).join(", ")}.`;
};

const hostApiSection = (ctx: Context) => {
  const items: string[] = [];
  if (ctx.hostApi.prompt) {
    items.push(
      '`sendPrompt(text)` sends `text` as the user\'s next chat message. Use it for drill-downs and follow-ups behind an explicit button ("Explain this spike"), with a short, self-contained message. Never call it without a user action.',
    );
  }
  items.push(
    "`openLink(url)` opens an http(s) URL in a new tab after the host's checks. Clicks on ordinary `<a href>` links are routed through it automatically.",
  );
  if (ctx.hostApi.callTool) {
    items.push(
      "`await genframe.callTool(name, args)` calls one of the host's tools and resolves with its result. Call it only from a user action, and show a pending state while it runs.",
    );
  }
  items.push(
    "`genframe.setState(value)` reports a small JSON-serializable state (a selection, the current step) to the host; `genframe.state` reads it back.",
    '`genframe.theme` is `"light"` or `"dark"`; the window fires `themechange` when it changes.',
    "Do not request fullscreen or other display modes unless the user asks for it.",
  );
  return list(items);
};

const platformSection = (ctx: Context) =>
  ctx.platform === "mobile"
    ? `## Platform: mobile

${list([
  `The frame is about ${ctx.width}px wide. Use a single column and stack anything that would sit side by side.`,
  "Make every tap target at least 44px tall, and never hide an action behind hover.",
  "Use 16px text in inputs so the browser does not zoom on focus.",
  "Turn wide tables into stacked cards, or put them in a horizontally scrolling container.",
  "Keep charts at most 240px tall and limit them to the few series that matter.",
])}`
    : `## Platform: desktop

${list([
  `The frame is about ${ctx.width}px wide. Up to three columns fit; collapse to one column below 480px with a media query.`,
  "Hover can add detail (tooltips, highlights) but must never be the only way to reach information.",
  "Charts read well between 240px and 360px tall.",
])}`;

const MODULES: Record<WidgetModule, (ctx: Context) => string> = {
  diagram: () => `## Module: diagram

Diagrams are standalone SVG. Lay them out on paper first, then write coordinates.

${list([
  'Root: `<svg viewBox="0 0 680 H" width="100%" role="img">`, then `<title>`, `<desc>`, and `<defs>`. Compute `H` from the last row plus a 16px margin; leave 16px clear on every side.',
  "Put nodes on a grid: equal widths per row, equal heights (about 44px for one line, 60px for two), and at least 32px between nodes. Center rows on the canvas.",
  'SVG text does not wrap. At 13px, budget about 7px per character and break long labels into `<tspan x="…" dy="1.2em">` lines; widen the box rather than shrinking text below 12px.',
  'Center labels with `text-anchor="middle"` and `dominant-baseline="central"`.',
  "Color through CSS, not presentation attributes: define classes in a `<style>` inside the SVG, such as `.node{fill:var(--color-surface);stroke:var(--color-border-strong)}` and `.label{fill:var(--color-text);font:13px var(--font-sans)}`.",
  "Draw in this order so the stream builds up sensibly and lines tuck under boxes: grouping zones, then edges, then nodes, then edge labels.",
  'Route edges with straight or orthogonal paths (`M`, `H`, `V`) that end at box edges, not centers. Define one arrowhead `<marker>` with `orient="auto-start-reverse"` and reuse it.',
  'Give edge labels a knockout so lines do not cross the text: `paint-order="stroke"` with a 4px stroke in `--color-background`.',
  "Highlight at most one path or node with `--color-accent`; everything else stays neutral. Use dashed outlines and `--color-surface-muted` fills for groupings.",
  "Prefer left-to-right for processes and top-to-bottom for hierarchies; keep crossings to zero where you can by reordering nodes.",
])}`,

  chart: (ctx) => `## Module: chart

${list([
  "Pick the form from the question: compare categories with bars (horizontal when labels are long), show change over time with lines, show composition with stacked bars (a pie only for 2–4 parts), show distribution with a histogram, show relationship with a scatter.",
  "Small, simple charts (up to about a dozen bars, a sparkline, a single line) are best as hand-written SVG: they render while streaming and need no library.",
  `For anything richer use Chart.js 4: \`<script src="${ctx.example("chart.js@4.4.1/dist/chart.umd.min.js")}"></script>\`.`,
  'Wrap the canvas in a fixed-height box so space is reserved before the script runs: `<div style="position:relative;height:280px"><canvas id="c" aria-label="…" role="img"></canvas></div>`, and set `responsive: true, maintainAspectRatio: false`.',
  "Put the title and a one-line subtitle in HTML above the chart, not in the Chart.js title plugin, so they show while streaming.",
  "Read colors from tokens in the script and apply them to `Chart.defaults` (`color`, `borderColor`, `font.family`) and to each dataset (`--chart-1`, `--chart-2`, …). On `themechange`, re-read them, update the chart's options and datasets, and call `chart.update()`.",
  "Label axes with units, format ticks with `Intl.NumberFormat` (compact notation for large numbers), and start bar axes at zero.",
  "Sort categorical bars by value unless the categories have a natural order. Use a legend only for two or more series; direct labels are better when there is room.",
  "Keep animation short (`animation: { duration: 300 }`) or off; never loop it.",
  "Embed the data as a literal array in the script; nothing can be fetched.",
])}`,

  data_viz: (ctx) => `## Module: data_viz

${list([
  `For custom visualizations use D3 v7 (\`${ctx.example("d3@7.9.0/dist/d3.min.js")}\`). Size from the container's \`clientWidth\` and draw into an SVG with a \`viewBox\` so it scales.`,
  "Stat tiles: a grid of cards (`--color-surface` fill, 1px `--color-border`, `--radius-md`), each with a muted 13px label, a large value in `font-variant-numeric: tabular-nums`, and a delta that carries its sign and an arrow, colored with `--color-success` or `--color-danger`.",
  "Tables: right-align numbers with tabular figures, keep headers muted, show about a dozen rows, and put longer tables in a scroll container with a max height.",
  'Categorical color uses `--chart-1` to `--chart-6` in order; fold anything beyond six categories into "Other".',
  "Sequential color uses one hue at varying strength, for example `color-mix(in srgb, var(--chart-1) 30%, transparent)` up to 100%. Diverging color runs from `--color-danger` through `--color-surface-muted` to `--color-success`.",
  "Every color scale gets a legend with its minimum and maximum, and every encoded value is also available as text (labels, a tooltip, or a table).",
  "Tooltips are an absolutely positioned element inside a `position: relative` wrapper, updated on pointer events; keep them inside the frame's bounds.",
  "Geographic data cannot be fetched. Draw a map only from shapes you embed, or show the data another way.",
  "Dashboards: lead with three or four headline numbers, then one primary chart, then supporting detail.",
])}`,

  interactive: () => `## Module: interactive

${list([
  "Lay out controls first and output after them, so the widget explains itself before any script runs.",
  'Use native controls with visible labels: `<input type="range">` with an `<output>` showing its value, `<select>`, checkboxes, and buttons. Keep it to about five controls.',
  "Hold state in one object and write a single `render()` that updates the DOM from it. Call `render()` once at the end of the script so the initial state paints, then on every `input` event.",
  "Start from defaults that already show something meaningful; the first paint should answer the question before anyone touches a control.",
  "Animate with `requestAnimationFrame`, pause when the widget is off screen (`IntersectionObserver`), and offer a pause button for anything that moves continuously.",
  "Use a seeded random generator when results should be reproducible.",
  "Offer follow-up questions through buttons that call `sendPrompt` with the current state described in words.",
])}`,

  mockup: () => `## Module: mockup

${list([
  "Show the interface faithfully but neutrally: tokens for color and type, unless the user asked for a specific brand.",
  "Use realistic content (names, numbers, dates) rather than placeholder text.",
  "Frame phone screens as a 360px column with `--radius-lg` corners and a 1px border, centered; desktop screens can get a thin window bar.",
  "Build layout with flexbox and grid. Draw icons as small inline SVGs with 1.5px strokes in `currentColor`; do not rely on icon fonts.",
  "Light interactivity is welcome (tabs switch, toggles toggle), but the first paint shows the primary state without scripts.",
  "When explaining a design, add small numbered callouts and describe them in your reply.",
])}`,

  elicitation: () => `## Module: elicitation

Use a form widget when you need several pieces of information from the user at once and asking in prose would take many turns.

${list([
  "One `<form>` with grouped `<fieldset>`s and a `<legend>` each. Every control has a `<label>`. Use radio buttons or a segmented row of buttons for up to five options and a `<select>` beyond that.",
  "Pre-fill sensible defaults and mark optional fields; keep it to about seven fields.",
  "On submit: `preventDefault()`, validate and show messages next to the fields, then call `sendPrompt` once with a single readable line, for example `Trip preferences — Dates: 12–19 May · Budget: mid-range · Pace: relaxed`.",
  "After sending, disable the form and show a short confirmation in place of the submit button.",
  "Never ask for passwords, payment details, government identifiers, or other secrets.",
])}`,

  art: () => `## Module: art

${list([
  "Illustrations are SVG with a `viewBox`, built in layers (background, midground, foreground) as `<g>` groups so the stream paints back to front.",
  "Use a small palette: tokens, or a deliberate palette that reads on both light and dark. If the piece needs its own backdrop, draw it as a rounded `<rect>` instead of relying on the page.",
  "Generative pieces use a canvas sized by `devicePixelRatio` and a seeded random generator; draw once, or animate with `requestAnimationFrame` and stop under `prefers-reduced-motion`.",
  "Keep SVG under roughly 2,000 elements; use canvas for particle-heavy work, since every SVG node has to stream.",
  "Explanatory drawings (anatomy, mechanisms, scenes) label their parts with leader lines and text, not a separate legend.",
])}`,
};

/** Normalizes a module list: known modules only, deduplicated, in canonical order. */
export function normalizeModules(
  modules: readonly string[] = [],
): WidgetModule[] {
  return WIDGET_MODULES.filter((module) => modules.includes(module));
}

const createContext = (options: GuidanceOptions): Context => {
  const platform = options.platform ?? "desktop";
  const cdn = options.cdnOrigins ?? DEFAULT_CDN_ORIGINS;
  const names = options.tokens
    ? Object.keys(options.tokens.variables)
    : THEME_TOKENS.map((token) => token.name);
  const canonical = new Set<string>(THEME_TOKENS.map((token) => token.name));
  return {
    platform,
    width: options.width ?? (platform === "mobile" ? 360 : 680),
    cdn,
    connect: options.connectOrigins ?? [],
    allowEval: options.allowEval ?? false,
    hostApi: {
      prompt: options.hostApi?.prompt ?? true,
      callTool: options.hostApi?.callTool ?? false,
    },
    tokenNames: names,
    extraTokens: names.filter((name) => !canonical.has(name)).sort(),
    example: cdnExample(cdn),
  };
};

/**
 * Builds the model-facing widget guidance: base rules, the theme token
 * reference, platform notes, and the requested modules. The output depends
 * only on the options, so it can be cached and diffed.
 */
export function buildWidgetGuidance(options: GuidanceOptions = {}): string {
  const ctx = createContext(options);
  const modules = normalizeModules(options.modules);
  const index = `## Modules

Call \`read_me\` with the modules you need before your first widget of that kind. Available: ${WIDGET_MODULES.map(
    (module) => `\`${module}\` (${MODULE_SUMMARIES[module]})`,
  ).join("; ")}.`;
  return [
    baseSection(ctx),
    index,
    ...modules.map((module) => MODULES[module](ctx)),
  ].join("\n\n");
}
