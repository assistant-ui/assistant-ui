import { NAME } from "./name";
import { resolveGroup, type Snapshot, type Store } from "./store";
import { ALL } from "./url";

export const SWITCHER_ATTRIBUTE = `data-${NAME}-switcher`;

const CSS = `
:host { all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; }
:host([data-dock="left"]) { right: auto; left: 16px; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
.root {
  --bg: #ffffff; --bg-subtle: #f4f4f5; --bg-hover: #f4f4f5;
  --fg: #18181b; --fg-muted: #71717a; --fg-segment: #52525b;
  --border: #e4e4e7; --thumb: #ffffff; --thumb-border: #e4e4e7;
  --accent: #d97706; --accent-soft: rgb(217 119 6 / 0.12);
  --shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -6px rgb(0 0 0 / 0.16);
  font: 12px/16px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-variant-numeric: tabular-nums; letter-spacing: 0;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  color: var(--fg);
  display: flex; flex-direction: column; align-items: flex-end;
}
:host([data-dock="left"]) .root { align-items: flex-start; }
@media (prefers-color-scheme: dark) {
  .root {
    --bg: #18181b; --bg-subtle: #09090b; --bg-hover: #27272a;
    --fg: #fafafa; --fg-muted: #a1a1aa; --fg-segment: #a1a1aa;
    --border: #2e2e33; --thumb: #3f3f46; --thumb-border: #52525b;
    --accent: #fbbf24; --accent-soft: rgb(251 191 36 / 0.14);
    --shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 12px 32px -8px rgb(0 0 0 / 0.7);
  }
}
button { all: unset; box-sizing: border-box; cursor: pointer; font: inherit; color: inherit; }
button:focus-visible, .group:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.group:focus-visible { outline-offset: -2px; border-radius: 8px; }
svg { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }

.panel {
  background: var(--bg); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow);
  min-width: 248px; max-width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto;
}
header { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px; border-bottom: 1px solid var(--border); }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
.title { font-weight: 600; }
.count { color: var(--fg-muted); }
.tools { margin-left: auto; display: flex; gap: 2px; }
.icon {
  display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none;
  border-radius: 6px; color: var(--fg-muted);
}
.icon:hover { background: var(--bg-hover); color: var(--fg); }
.icon[aria-pressed="true"] { color: var(--accent); background: var(--accent-soft); }

.group { padding: 10px 12px 12px; }
.group + .group { border-top: 1px solid var(--border); }
.meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; min-width: 0; }
.label { color: var(--fg-muted); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
code { margin-left: auto; font: 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--fg-muted); white-space: nowrap; }
.row { display: flex; align-items: flex-start; gap: 4px; }
.track {
  position: relative; flex: 1 1 auto; display: flex; flex-wrap: wrap; gap: 2px;
  min-height: 28px; padding: 2px; border-radius: 8px; background: var(--bg-subtle);
}
.thumb {
  position: absolute; top: 0; left: 0; width: 0; height: 0; border-radius: 6px; pointer-events: none;
  background: var(--thumb); box-shadow: 0 0 0 1px var(--thumb-border), 0 1px 2px rgb(0 0 0 / 0.06);
}
.seg {
  position: relative; display: inline-flex; align-items: center; justify-content: center; flex: 1 0 auto;
  height: 24px; padding: 0 10px; border-radius: 6px; white-space: nowrap; font-weight: 500; color: var(--fg-segment);
}
.seg:hover, .seg[aria-pressed="true"], .track[data-show-all] .seg { color: var(--fg); }

footer {
  display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border-top: 1px solid var(--border); color: var(--fg-muted); font-size: 11px;
}
kbd {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px;
  border: 1px solid var(--border); border-radius: 4px; background: var(--bg-subtle);
  font: 500 10px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg);
}
.pill {
  display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px 0 12px;
  border-radius: 999px; background: var(--bg); border: 1px solid var(--border); box-shadow: var(--shadow);
  font-weight: 500;
}
.pill svg { color: var(--fg-muted); }
.pill:hover svg { color: var(--fg); }

@media (prefers-reduced-motion: no-preference) {
  .track[data-ready] .thumb {
    transition: transform 150ms cubic-bezier(0.2, 0, 0, 1), width 150ms cubic-bezier(0.2, 0, 0, 1), height 150ms cubic-bezier(0.2, 0, 0, 1);
  }
  .icon, .seg, .pill svg { transition: background-color 150ms ease, color 150ms ease; }
}
`;

const ICONS = {
  layers:
    '<path d="M8 2 2 5l6 3 6-3-6-3Z"/><path d="m2 8 6 3 6-3"/><path d="m2 11 6 3 6-3"/>',
  outline:
    '<rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke-dasharray="2.5 2"/>',
  dock: '<path d="M5 5 2 8l3 3"/><path d="m11 5 3 3-3 3"/><path d="M2 8h12"/>',
  down: '<path d="m4 6 4 4 4-4"/>',
  up: '<path d="m4 10 4-4 4 4"/>',
};

type Child = Node | string;

const h = (
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

const icon = (name: keyof typeof ICONS): Element => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ICONS[name];
  return svg;
};

const iconButton = (
  attrs: Record<string, string | undefined>,
  label: string,
  name: keyof typeof ICONS,
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

const pressed = (value: boolean) => (value ? "true" : "false");

const structureKey = (snapshot: Snapshot) =>
  JSON.stringify([
    snapshot.collapsed,
    snapshot.groups.map((meta) => [meta.id, meta.label, meta.variants]),
  ]);

const renderCollapsed = (snapshot: Snapshot): HTMLElement =>
  h(
    "button",
    {
      type: "button",
      class: "pill",
      "data-action": "collapse",
      "data-key": "collapse",
      "aria-expanded": "false",
      "aria-label": "Expand variant switcher",
      title: "Expand variant switcher",
    },
    h("span", { class: "dot", "aria-hidden": "true" }),
    h("span", {}, "Variants"),
    h("span", { class: "count" }, `${snapshot.groups.length}`),
    icon("up"),
  );

const renderPanel = (snapshot: Snapshot): HTMLElement => {
  const header = h(
    "header",
    {},
    h("span", { class: "dot", "aria-hidden": "true" }),
    h("span", { class: "title" }, "Variants"),
    h("span", { class: "count" }, `${snapshot.groups.length}`),
    h(
      "div",
      { class: "tools" },
      iconButton(
        { "data-action": "global-all", "data-key": "global-all" },
        "Show all",
        "layers",
        "Show every variant of every group (?variants=all)",
      ),
      iconButton(
        { "data-action": "outline", "data-key": "outline" },
        "Outline",
        "outline",
        "Outline undecided regions on the page",
      ),
      iconButton(
        { "data-action": "dock", "data-key": "dock" },
        "Move to the other corner",
        "dock",
      ),
      iconButton(
        {
          "data-action": "collapse",
          "data-key": "collapse",
          "aria-expanded": "true",
        },
        "Collapse variant switcher",
        "down",
      ),
    ),
  );

  const groups = snapshot.groups.map((meta) => {
    const labelText =
      meta.label === meta.id ? meta.id : `${meta.label} (${meta.id})`;
    return h(
      "div",
      {
        class: "group",
        role: "group",
        tabindex: "0",
        "aria-label": `${labelText}. Left and right arrows cycle variants, A toggles show all.`,
        "data-group-panel": meta.id,
        "data-key": `group:${meta.id}`,
      },
      h(
        "div",
        { class: "meta" },
        h("span", { class: "label" }, meta.label),
        ...(meta.label === meta.id ? [] : [h("code", {}, meta.id)]),
      ),
      h(
        "div",
        { class: "row" },
        h(
          "div",
          { class: "track", "data-track": meta.id },
          h("span", { class: "thumb", "aria-hidden": "true" }),
          ...meta.variants.map((variant) =>
            h(
              "button",
              {
                type: "button",
                class: "seg",
                "data-action": "select",
                "data-group": meta.id,
                "data-value": variant.id,
                "data-key": `${meta.id}:${variant.id}`,
                title: `?variant=${meta.id}:${variant.id}`,
              },
              variant.label,
            ),
          ),
        ),
        iconButton(
          {
            "data-action": "group-all",
            "data-group": meta.id,
            "data-key": `${meta.id}:${ALL}`,
          },
          "Show all variants",
          "layers",
          `Show all variants (A, ?variant=${meta.id}:${ALL})`,
        ),
      ),
    );
  });

  const footer = h(
    "footer",
    { "aria-hidden": "true" },
    h("kbd", {}, "←"),
    h("kbd", {}, "→"),
    "switch",
    h("span", {}, "·"),
    h("kbd", {}, "A"),
    "show all",
  );

  return h(
    "section",
    { class: "panel", "aria-label": "Design variants" },
    header,
    ...groups,
    footer,
  );
};

const placeThumb = (track: HTMLElement, targets: HTMLElement[]) => {
  const thumb = track.querySelector<HTMLElement>(".thumb");
  if (!thumb) return;
  if (targets.length === 0) {
    thumb.style.width = "0px";
    return;
  }
  const left = Math.min(...targets.map((target) => target.offsetLeft));
  const top = Math.min(...targets.map((target) => target.offsetTop));
  const right = Math.max(
    ...targets.map((target) => target.offsetLeft + target.offsetWidth),
  );
  const bottom = Math.max(
    ...targets.map((target) => target.offsetTop + target.offsetHeight),
  );
  thumb.style.transform = `translate(${left}px, ${top}px)`;
  thumb.style.width = `${right - left}px`;
  thumb.style.height = `${bottom - top}px`;
};

const nextFrame = (callback: () => void) => {
  if (typeof requestAnimationFrame === "function")
    requestAnimationFrame(callback);
  else setTimeout(callback, 16);
};

export const mountSwitcher = (store: Store): (() => void) => {
  const host = document.createElement("div");
  host.setAttribute(SWITCHER_ATTRIBUTE, "");
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const container = document.createElement("div");
  container.className = "root";
  root.append(style, container);

  const focusKey = (key: string | undefined) => {
    if (!key) return;
    const target = Array.from(
      root.querySelectorAll<HTMLElement>("[data-key]"),
    ).find((element) => element.dataset["key"] === key);
    target?.focus();
  };

  const sync = (snapshot: Snapshot) => {
    host.hidden =
      snapshot.hideUI || snapshot.clean || snapshot.groups.length === 0;
    host.dataset["dock"] = snapshot.dock;
    for (const button of root.querySelectorAll<HTMLElement>("[data-action]")) {
      const { action, group } = button.dataset;
      if (action === "global-all")
        button.setAttribute("aria-pressed", pressed(snapshot.globalAll));
      else if (action === "outline")
        button.setAttribute("aria-pressed", pressed(snapshot.outline));
      else if (action === "group-all" && group)
        button.setAttribute(
          "aria-pressed",
          pressed(snapshot.selections[group] === ALL),
        );
      else if (action === "dock") {
        const label =
          snapshot.dock === "right"
            ? "Move to the bottom-left corner"
            : "Move to the bottom-right corner";
        button.setAttribute("aria-label", label);
        button.title = label;
      }
    }
    for (const meta of snapshot.groups) {
      const track = Array.from(
        root.querySelectorAll<HTMLElement>("[data-track]"),
      ).find((element) => element.dataset["track"] === meta.id);
      if (!track) continue;
      const { showAll, activeId } = resolveGroup(
        meta,
        snapshot.selections[meta.id],
        snapshot.globalAll,
      );
      track.toggleAttribute("data-show-all", showAll);
      const segments = Array.from(
        track.querySelectorAll<HTMLElement>("[data-action=select]"),
      );
      for (const segment of segments) {
        segment.setAttribute(
          "aria-pressed",
          pressed(!showAll && segment.dataset["value"] === activeId),
        );
      }
      placeThumb(
        track,
        showAll
          ? segments
          : segments.filter((segment) => segment.dataset["value"] === activeId),
      );
    }
  };

  let structure: string | undefined;
  let focusSeq = store.getSnapshot().focus?.seq;

  const render = () => {
    const snapshot = store.getSnapshot();
    const key = structureKey(snapshot);
    if (key !== structure) {
      structure = key;
      const active = root.activeElement as HTMLElement | null;
      const activeKey = active?.dataset["key"];
      container.replaceChildren(
        snapshot.collapsed ? renderCollapsed(snapshot) : renderPanel(snapshot),
      );
      sync(snapshot);
      focusKey(activeKey);
      nextFrame(() => {
        for (const track of root.querySelectorAll("[data-track]"))
          track.setAttribute("data-ready", "");
      });
    } else {
      sync(snapshot);
    }
    if (snapshot.focus && snapshot.focus.seq !== focusSeq) {
      focusSeq = snapshot.focus.seq;
      focusKey(`group:${snapshot.focus.group}`);
    }
  };

  const onClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>(
      "button[data-action]",
    );
    if (!button) return;
    const { action, group, value } = button.dataset;
    const snapshot = store.getSnapshot();
    if (action === "select" && group && value) store.select(group, value);
    else if (action === "group-all" && group) store.toggleGroupAll(group);
    else if (action === "global-all") store.toggleGlobalAll();
    else if (action === "outline") store.setOutline(!snapshot.outline);
    else if (action === "dock")
      store.setDock(snapshot.dock === "right" ? "left" : "right");
    else if (action === "collapse") store.setCollapsed(!snapshot.collapsed);
  };

  const onKeyDown = (event: Event) => {
    const { key, altKey, ctrlKey, metaKey } = event as KeyboardEvent;
    if (altKey || ctrlKey || metaKey) return;
    const panel = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-group-panel]",
    );
    const group = panel?.dataset["groupPanel"];
    if (!group) return;
    if (key === "ArrowRight" || key === "ArrowLeft") {
      event.preventDefault();
      const next = store.cycle(group, key === "ArrowRight" ? 1 : -1);
      if (next !== undefined) focusKey(`${group}:${next}`);
    } else if (key === "a" || key === "A") {
      event.preventDefault();
      store.toggleGroupAll(group);
    }
  };

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  document.body.append(host);
  const unsubscribe = store.subscribe(render);
  render();

  return () => {
    unsubscribe();
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    host.remove();
  };
};
