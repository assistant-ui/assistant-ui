import { NAME } from "./name";
import { resolveGroup, type Snapshot, type Store } from "./store";
import { ALL } from "./url";

export const SWITCHER_ATTRIBUTE = `data-${NAME}-switcher`;

const CSS = `
:host { all: initial; position: fixed; right: 12px; bottom: 12px; z-index: 2147483647; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
.panel {
  --fg: #171717; --muted: #737373; --bg: #ffffff; --line: #d4d4d4; --soft: #f5f5f5;
  font: 12px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--fg); background: var(--bg); border: 1px solid var(--line);
  border-radius: 8px; box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
  max-width: min(420px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto;
}
@media (prefers-color-scheme: dark) {
  .panel { --fg: #fafafa; --muted: #a3a3a3; --bg: #171717; --line: #404040; --soft: #262626; }
}
header { display: flex; align-items: center; gap: 6px; padding: 6px 8px; }
header .title { font-weight: 600; margin-right: auto; }
.group { padding: 6px 8px; border-top: 1px solid var(--line); }
.group:focus-visible, button:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px; }
.name { display: flex; gap: 6px; align-items: baseline; margin-bottom: 4px; }
.name code { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
.row { display: flex; flex-wrap: wrap; gap: 4px; }
.seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
button {
  font: inherit; color: inherit; background: transparent; border: 0; margin: 0;
  padding: 3px 8px; cursor: pointer; border-radius: 0;
}
.seg button + button { border-left: 1px solid var(--line); }
.chip { border: 1px solid var(--line); border-radius: 6px; }
button:hover { background: var(--soft); }
button[aria-pressed="true"] { background: var(--fg); color: var(--bg); }
@media (prefers-reduced-motion: no-preference) {
  button { transition: background-color 120ms ease, color 120ms ease; }
}
`;

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

const pressed = (value: boolean) => (value ? "true" : "false");

const renderPanel = (snapshot: Snapshot): HTMLElement => {
  const header = h(
    "header",
    {},
    h("span", { class: "title" }, "Variants"),
    ...(snapshot.collapsed
      ? []
      : [
          h(
            "button",
            {
              type: "button",
              class: "chip",
              "data-action": "global-all",
              "data-key": "global-all",
              "aria-pressed": pressed(snapshot.globalAll),
              title: "Show every variant of every group (?variants=all)",
            },
            "Show all",
          ),
          h(
            "button",
            {
              type: "button",
              class: "chip",
              "data-action": "outline",
              "data-key": "outline",
              "aria-pressed": pressed(snapshot.outline),
              title: "Outline undecided regions on the page",
            },
            "Outline",
          ),
        ]),
    h(
      "button",
      {
        type: "button",
        class: "chip",
        "data-action": "collapse",
        "data-key": "collapse",
        "aria-expanded": pressed(!snapshot.collapsed),
        "aria-label": snapshot.collapsed
          ? "Expand variant switcher"
          : "Collapse variant switcher",
      },
      snapshot.collapsed ? `${snapshot.groups.length}` : "–",
    ),
  );

  const groups = snapshot.collapsed
    ? []
    : snapshot.groups.map((meta) => {
        const selection = snapshot.selections[meta.id];
        const { showAll, activeId } = resolveGroup(
          meta,
          selection,
          snapshot.globalAll,
        );
        const buttons = meta.variants.map((variant) =>
          h(
            "button",
            {
              type: "button",
              "data-action": "select",
              "data-group": meta.id,
              "data-value": variant.id,
              "data-key": `${meta.id}:${variant.id}`,
              "aria-pressed": pressed(!showAll && variant.id === activeId),
              title: `?variant=${meta.id}:${variant.id}`,
            },
            variant.label,
          ),
        );
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
            { class: "name" },
            h("span", {}, meta.label),
            ...(meta.label === meta.id ? [] : [h("code", {}, meta.id)]),
          ),
          h(
            "div",
            { class: "row" },
            h("div", { class: "seg" }, ...buttons),
            h(
              "button",
              {
                type: "button",
                class: "chip",
                "data-action": "group-all",
                "data-group": meta.id,
                "data-key": `${meta.id}:${ALL}`,
                "aria-pressed": pressed(selection === ALL),
                title: `?variant=${meta.id}:${ALL}`,
              },
              "All",
            ),
          ),
        );
      });

  return h(
    "section",
    { class: "panel", "aria-label": "Design variants" },
    header,
    ...groups,
  );
};

export const mountSwitcher = (store: Store): (() => void) => {
  const host = document.createElement("div");
  host.setAttribute(SWITCHER_ATTRIBUTE, "");
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const container = document.createElement("div");
  root.append(style, container);

  const focusKey = (key: string | undefined) => {
    if (!key) return;
    const target = Array.from(
      root.querySelectorAll<HTMLElement>("[data-key]"),
    ).find((element) => element.dataset["key"] === key);
    target?.focus();
  };

  let focusSeq = store.getSnapshot().focus?.seq;

  const render = () => {
    const snapshot = store.getSnapshot();
    host.hidden =
      snapshot.hideUI || snapshot.clean || snapshot.groups.length === 0;
    const active = root.activeElement as HTMLElement | null;
    const key = active?.dataset["key"];
    container.replaceChildren(renderPanel(snapshot));
    if (snapshot.focus && snapshot.focus.seq !== focusSeq) {
      focusSeq = snapshot.focus.seq;
      focusKey(`group:${snapshot.focus.group}`);
    } else {
      focusKey(key);
    }
  };

  const onClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>(
      "button[data-action]",
    );
    if (!button) return;
    const { action, group, value } = button.dataset;
    if (action === "select" && group && value) store.select(group, value);
    else if (action === "group-all" && group) store.toggleGroupAll(group);
    else if (action === "global-all") store.toggleGlobalAll();
    else if (action === "outline")
      store.setOutline(!store.getSnapshot().outline);
    else if (action === "collapse")
      store.setCollapsed(!store.getSnapshot().collapsed);
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
  const unsubscribe = store.subscribe(render);
  render();
  document.body.append(host);

  return () => {
    unsubscribe();
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    host.remove();
  };
};
