import { copyText } from "./prompt";

/** Theme tokens and control styles shared by the switcher and the canvas toolbar. */
export const BASE_CSS = `
* { box-sizing: border-box; }
.root {
  --bg: #fffcf8; --bg-subtle: #f5f0e9; --bg-hover: rgb(24 24 27 / 0.05);
  --fg: #18181b; --fg-muted: #71717a; --fg-segment: #52525b;
  --border: #ebe3d8; --quiet: rgb(24 24 27 / 0.07); --ring: rgb(24 24 27 / 0.45);
  --accent: #ea580c; --highlight: rgb(234 88 12 / 0.07);
  --shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -6px rgb(0 0 0 / 0.16);
  font: 12px/16px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-variant-numeric: tabular-nums; letter-spacing: 0;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  color: var(--fg);
}
@media (prefers-color-scheme: dark) {
  .root {
    --bg: #161210; --bg-subtle: #0b0908; --bg-hover: rgb(250 250 250 / 0.06);
    --fg: #fafafa; --fg-muted: #a1a1aa; --fg-segment: #a1a1aa;
    --border: #2f2822; --quiet: rgb(250 250 250 / 0.08); --ring: rgb(250 250 250 / 0.5);
    --accent: #fb923c; --highlight: rgb(251 146 60 / 0.08);
    --shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 12px 32px -8px rgb(0 0 0 / 0.7);
  }
}
button { all: unset; box-sizing: border-box; cursor: pointer; font: inherit; color: inherit; }
button:focus-visible { outline: 1.5px solid var(--ring); outline-offset: 1px; }
svg { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.icon {
  display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none;
  border-radius: 6px; color: var(--fg-muted);
}
.icon:hover { background: var(--bg-hover); color: var(--fg); }
.icon[aria-pressed="true"], .icon[data-copied] { color: var(--fg); background: var(--quiet); }
.text-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 8px;
  border-radius: 6px; box-shadow: inset 0 0 0 1px var(--border); background: var(--bg);
  font-weight: 500; color: var(--fg); white-space: nowrap;
}
.text-btn svg { color: var(--fg-muted); }
.text-btn:hover { background: var(--bg-hover); }
.stack { display: inline-grid; }
.stack > * { grid-area: 1 / 1; }
.stack > [data-alt] { visibility: hidden; }
[data-copied] .stack > [data-main] { visibility: hidden; }
[data-copied] .stack > [data-alt] { visibility: visible; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: no-preference) {
  .icon, .text-btn { transition: background-color 150ms ease, color 150ms ease; }
}
`;

export const ICONS = {
  outline:
    '<rect x="2.5" y="2.5" width="11" height="11" stroke-dasharray="2.5 2"/>',
  canvas:
    '<rect x="2" y="2.5" width="5" height="4.5" rx="1"/><rect x="9" y="2.5" width="5" height="4.5" rx="1"/><rect x="2" y="9" width="5" height="4.5" rx="1"/><rect x="9" y="9" width="5" height="4.5" rx="1"/>',
  note: '<path d="M3 3.5h10v7H8.5L5.5 13v-2.5H3z"/><path d="M5.5 6.5h5"/><path d="M5.5 8.5h3"/>',
  trash:
    '<path d="M3.5 4.5h9"/><path d="M6.5 4.5V3h3v1.5"/><path d="M4.5 4.5l.5 8.5h6l.5-8.5"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/>',
  check: '<path d="m3.5 8.5 3 3 6-7"/>',
  close: '<path d="m4 4 8 8"/><path d="m12 4-8 8"/>',
  plus: '<path d="M8 3.5v9"/><path d="M3.5 8h9"/>',
  minus: '<path d="M3.5 8h9"/>',
  fit: '<path d="M2.5 6V3.5a1 1 0 0 1 1-1H6"/><path d="M10 2.5h2.5a1 1 0 0 1 1 1V6"/><path d="M13.5 10v2.5a1 1 0 0 1-1 1H10"/><path d="M6 13.5H3.5a1 1 0 0 1-1-1V10"/>',
  down: '<path d="m4 6 4 4 4-4"/>',
  up: '<path d="m4 10 4-4 4 4"/>',
};

export type IconName = keyof typeof ICONS;

type Child = Node | string;

export const h = (
  tag: string,
  attrs: Record<string, string | undefined>,
  ...children: Child[]
): HTMLElement => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) element.setAttribute(key, value);
  }
  element.append(...children);
  return element;
};

const SVG = "http://www.w3.org/2000/svg";

/** Builds the icon with DOM calls, never an HTML sink, so Trusted Types pages accept it. */
export const icon = (name: IconName): Element => {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  for (const [, tag, attrs] of ICONS[name].matchAll(/<(\w+)([^>]*)\/>/g)) {
    const child = document.createElementNS(SVG, tag!);
    for (const [, key, value] of attrs!.matchAll(/([\w-]+)="([^"]*)"/g))
      child.setAttribute(key!, value!);
    svg.append(child);
  }
  return svg;
};

export const iconButton = (
  attrs: Record<string, string | undefined>,
  label: string,
  name: IconName,
  hint = label,
) =>
  h(
    "button",
    {
      type: "button",
      class: "icon",
      "aria-label": label,
      title: hint,
      ...attrs,
    },
    icon(name),
  );

/** Overlays both labels in one grid cell so swapping them never changes the width. */
export const stableLabel = (main: string, alt: string) =>
  h(
    "span",
    { class: "stack" },
    h("span", { "data-main": "" }, main),
    h("span", { "data-alt": "", "aria-hidden": "true" }, alt),
  );

export const copyButton = (attrs: Record<string, string | undefined>) =>
  h(
    "button",
    {
      type: "button",
      class: "text-btn",
      "aria-label": "Copy prompt",
      title: "Copy /variants choose … with the selected variants",
      ...attrs,
    },
    icon("copy"),
    stableLabel("Copy prompt", "Copied"),
  );

const COPIED_MS = 1500;
const copiedTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Copies text, flips the button to a check for a moment, and announces the result. */
export const copyWithFeedback = async (
  button: HTMLElement,
  text: string,
  live: HTMLElement,
): Promise<boolean> => {
  const copied = await copyText(text, button);
  live.textContent = copied
    ? "Prompt copied to clipboard"
    : "Could not copy the prompt";
  if (!copied) return false;
  button.setAttribute("data-copied", "");
  button.querySelector("svg")?.replaceWith(icon("check"));
  clearTimeout(copiedTimers.get(button));
  copiedTimers.set(
    button,
    setTimeout(() => {
      copiedTimers.delete(button);
      button.removeAttribute("data-copied");
      button.querySelector("svg")?.replaceWith(icon("copy"));
    }, COPIED_MS),
  );
  return true;
};
