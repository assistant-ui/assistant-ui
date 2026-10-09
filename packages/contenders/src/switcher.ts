import {
  DEFAULT_SHORTCUT,
  getConfig,
  matchesShortcut,
  onConfigChange,
  shortcutLabel,
} from "./config";
import { NAME } from "./name";
import { groupNodes, measureNodes } from "./nodes";
import { highlightGroup } from "./outline";
import { promptFor } from "./prompt";
import {
  depthOf,
  resolveActive,
  treeOrder,
  type GroupMeta,
  type Snapshot,
  type Store,
} from "./store";
import {
  BASE_CSS,
  copyButton,
  copyWithFeedback,
  h,
  icon,
  iconButton,
} from "./ui";

export const SWITCHER_ATTRIBUTE = `data-${NAME}-switcher`;

export const SIDEBAR_WIDTH = 300;
export const SIDEBAR_VARIABLE = `--${NAME}-sidebar-width`;
const SHEET_QUERY = "(max-width: 767px)";
const ROW_MS = 160;

const PAGE_CSS = `html[data-${NAME}-sidebar] { margin-right: var(${SIDEBAR_VARIABLE}) !important; }`;

const CSS = `
:host { all: initial; position: fixed; top: 0; right: 0; bottom: 0; width: ${SIDEBAR_WIDTH}px; z-index: 2147483647; }
:host([hidden]) { display: none; }
:host([data-collapsed]) { top: auto; bottom: 16px; width: auto; }
:host([data-mode="sheet"]:not([data-collapsed])) { top: auto; left: 0; width: auto; max-height: 60vh; }
${BASE_CSS}
.root { display: flex; flex-direction: column; align-items: flex-end; height: 100%; }

.panel {
  display: flex; flex-direction: column; width: 100%; height: 100%;
  background: var(--bg); border-left: 1px solid var(--border);
}
:host([data-mode="sheet"]) .panel {
  border-left: 0; border-top: 1px solid var(--border); border-radius: 10px 10px 0 0; box-shadow: var(--shadow);
}
.groups { flex: 1 1 auto; overflow: auto; overscroll-behavior: contain; }
header { flex: none; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 6px 0 12px; border-bottom: 1px solid var(--border); }
.title { font-weight: 600; }
.count { color: var(--fg-muted); }
.tools { margin-left: auto; display: flex; gap: 2px; }

.slot { display: grid; grid-template-rows: 1fr; opacity: 1; }
.slot[data-closed] { grid-template-rows: 0fr; opacity: 0; }
.clip { overflow: hidden; min-height: 0; }
.group { position: relative; padding: 10px 12px 12px; }
.slot + .slot:not([data-depth]) .group { border-top: 1px solid var(--border); }
.slot[data-depth] .group { padding-top: 2px; padding-left: calc(12px + var(--depth) * 14px); }
.slot[data-depth] .group::before {
  content: ""; position: absolute; top: 0; bottom: 10px;
  left: calc(16px + (var(--depth) - 1) * 14px); border-left: 1px solid var(--border);
}
.slot[data-highlight] .group { background: var(--bg-hover); }
.meta { display: flex; align-items: center; gap: 8px; height: 20px; margin-bottom: 4px; min-width: 0; }
.label { color: var(--fg-muted); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
code { margin-left: auto; font: 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--fg-muted); white-space: nowrap; }
.offscreen {
  flex: none; height: 18px; padding: 0 6px; border-radius: 4px; font-size: 11px; color: var(--fg-muted);
  box-shadow: inset 0 0 0 1px var(--border);
}
.offscreen:hover { color: var(--fg); background: var(--bg-hover); }
.offscreen[hidden] { display: none; }
.row { display: flex; align-items: flex-start; gap: 4px; }
.track {
  position: relative; flex: 1 1 auto; display: flex; flex-wrap: wrap; gap: 2px;
  min-height: 28px; padding: 2px; border-radius: 8px; background: var(--bg-subtle);
}
.thumb {
  position: absolute; top: 0; left: 0; width: 0; height: 0; border-radius: 6px; pointer-events: none;
  background: var(--quiet);
}
.slot[data-highlight] .thumb { box-shadow: inset 0 0 0 1px var(--border); }
.seg {
  position: relative; display: inline-flex; align-items: center; justify-content: center; flex: 1 0 auto;
  height: 24px; padding: 0 10px; border-radius: 6px; white-space: nowrap; color: var(--fg-segment);
}
.seg .stack > [data-main] { font-weight: 400; }
.seg .stack > [data-alt] { font-weight: 500; }
.seg:hover { color: var(--fg); }
.seg[aria-checked="true"] { color: var(--fg); }
.seg[aria-checked="true"] .stack > [data-main] { font-weight: 500; }
.seg:focus-visible { outline: 1.5px solid var(--ring); outline-offset: -1.5px; }

footer {
  flex: none; display: flex; align-items: center; gap: 6px; min-height: 48px; padding: 8px 8px 8px 12px;
  border-top: 1px solid var(--border); color: var(--fg-muted); font-size: 11px;
}
footer .text-btn { margin-left: auto; }
kbd {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px;
  border-radius: 4px; box-shadow: inset 0 0 0 1px var(--border); background: var(--bg-subtle);
  font: 500 10px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg);
}
.pill {
  display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px 0 12px;
  border-radius: 8px 0 0 8px; background: var(--bg); box-shadow: inset 0 0 0 1px var(--border), var(--shadow);
  font-weight: 500;
}
.pill svg { color: var(--fg-muted); }
.pill:hover svg { color: var(--fg); }

@media (prefers-reduced-motion: no-preference) {
  .track[data-ready] .thumb {
    transition: transform 150ms cubic-bezier(0.2, 0, 0, 1), width 150ms cubic-bezier(0.2, 0, 0, 1), height 150ms cubic-bezier(0.2, 0, 0, 1);
  }
  .slot[data-animate] { transition: grid-template-rows ${ROW_MS}ms ease-out, opacity ${ROW_MS}ms ease-out; }
  .seg, .pill svg, .group { transition: background-color 150ms ease, color 150ms ease; }
}
`;

const currentShortcut = () => {
  const { shortcut } = getConfig();
  return shortcut === false ? undefined : (shortcut ?? DEFAULT_SHORTCUT);
};

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

const rowSignature = (meta: GroupMeta, groups: readonly GroupMeta[]) =>
  JSON.stringify([meta.label, meta.variants, depthOf(meta, groups)]);

let nextLabel = 0;

const renderRow = (meta: GroupMeta, groups: readonly GroupMeta[]) => {
  const labelId = `group-label-${nextLabel++}`;
  const depth = depthOf(meta, groups);
  const group = h(
    "div",
    { class: "group" },
    h(
      "div",
      { class: "meta" },
      h("span", { class: "label", id: labelId }, meta.label),
      h("button", {
        type: "button",
        class: "offscreen",
        "data-action": "reveal",
        "data-group": meta.id,
        hidden: "",
      }),
      ...(meta.label === meta.id ? [] : [h("code", {}, meta.id)]),
    ),
    h(
      "div",
      { class: "row" },
      h(
        "div",
        {
          class: "track",
          role: "radiogroup",
          "aria-labelledby": labelId,
          "data-track": meta.id,
        },
        h("span", { class: "thumb", "aria-hidden": "true" }),
        ...meta.variants.map((variant) =>
          h(
            "button",
            {
              type: "button",
              role: "radio",
              class: "seg",
              tabindex: "-1",
              "data-action": "select",
              "data-group": meta.id,
              "data-value": variant.id,
              "data-key": `${meta.id}:${variant.id}`,
              title: `?variant=${meta.id}:${variant.id}`,
            },
            h(
              "span",
              { class: "stack" },
              h("span", { "data-main": "" }, variant.label),
              h(
                "span",
                { "data-alt": "", "aria-hidden": "true" },
                variant.label,
              ),
            ),
          ),
        ),
      ),
      iconButton(
        {
          "data-action": "copy-group",
          "data-group": meta.id,
          "data-key": `${meta.id}:copy`,
        },
        `Copy prompt for ${meta.label}`,
        "copy",
        `Copy /variants choose for ${meta.label} only`,
      ),
    ),
  );
  return h(
    "div",
    {
      class: "slot",
      "data-group-panel": meta.id,
      "data-key": `group:${meta.id}`,
      ...(depth > 0
        ? { "data-depth": `${depth}`, style: `--depth: ${depth}` }
        : {}),
    },
    h("div", { class: "clip" }, group),
  );
};

const renderPanel = (snapshot: Snapshot): HTMLElement => {
  const shortcut = currentShortcut();
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
        { "data-action": "canvas", "data-key": "canvas" },
        "Canvas",
        "canvas",
        "Compare every variant side by side (?variants=canvas)",
      ),
      iconButton(
        { "data-action": "outline", "data-key": "outline" },
        "Outline",
        "outline",
        "Outline undecided regions on the page",
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

  const footer = h(
    "footer",
    {},
    h("kbd", { "aria-hidden": "true" }, "↑↓←→"),
    ...(shortcut
      ? [
          h("span", { "aria-hidden": "true" }, "·"),
          h("kbd", { "aria-hidden": "true" }, shortcutLabel(shortcut)),
        ]
      : []),
    copyButton({ "data-action": "copy", "data-key": "copy" }),
  );

  return h(
    "section",
    {
      class: "panel",
      "aria-label": "Design variants",
      ...(shortcut
        ? {
            "aria-keyshortcuts": shortcutLabel(shortcut).replace("Cmd", "Meta"),
          }
        : {}),
    },
    header,
    h(
      "div",
      { class: "groups" },
      h("div", {
        class: "list",
        role: "group",
        "aria-label":
          "Variant groups. Arrow keys move and select, Escape leaves.",
      }),
    ),
    footer,
  );
};

const placeThumb = (track: HTMLElement, target: HTMLElement | undefined) => {
  const thumb = track.querySelector<HTMLElement>(".thumb");
  if (!thumb) return;
  if (!target) {
    thumb.style.width = "0px";
    return;
  }
  thumb.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
  thumb.style.width = `${target.offsetWidth}px`;
  thumb.style.height = `${target.offsetHeight}px`;
};

const nextFrame = (callback: () => void) => {
  if (typeof requestAnimationFrame === "function")
    requestAnimationFrame(callback);
  else setTimeout(callback, 16);
};

const isEditable = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element || !(element instanceof Element)) return false;
  return (
    element.isContentEditable ||
    /^(input|textarea|select)$/i.test(element.tagName)
  );
};

const deepActiveElement = (): HTMLElement | undefined => {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : undefined;
};

const prefersReducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How long an anchor holds while nested groups mount and unmount after a selection. */
const ANCHOR_MS = 1000;

export const mountSwitcher = (store: Store): (() => void) => {
  const host = document.createElement("div");
  host.setAttribute(SWITCHER_ATTRIBUTE, "");
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const container = document.createElement("div");
  container.className = "root";
  const live = h("div", {
    class: "sr-only",
    role: "status",
    "aria-live": "polite",
  });
  root.append(style, container, live);

  const sheet =
    typeof matchMedia === "function" ? matchMedia(SHEET_QUERY) : undefined;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = PAGE_CSS;
  document.head.append(pageStyle);
  const html = document.documentElement;
  // The page is pushed aside instead of covered; fixed and sticky elements can
  // read the same variable to stay clear of the sidebar.
  const pushPage = (push: boolean) => {
    if (push) {
      html.style.setProperty(SIDEBAR_VARIABLE, `${SIDEBAR_WIDTH}px`);
      html.setAttribute(`data-${NAME}-sidebar`, "");
    } else {
      html.style.removeProperty(SIDEBAR_VARIABLE);
      html.removeAttribute(`data-${NAME}-sidebar`);
      if (html.getAttribute("style") === "") html.removeAttribute("style");
    }
  };

  const byKey = (key: string | undefined) =>
    key === undefined
      ? undefined
      : Array.from(root.querySelectorAll<HTMLElement>("[data-key]")).find(
          (element) =>
            element.dataset["key"] === key &&
            !element.closest("[data-leaving]"),
        );
  const radios = () =>
    Array.from(
      root.querySelectorAll<HTMLElement>(
        ".slot:not([data-leaving]) [role=radio]",
      ),
    );
  const checkedRadio = (group: string) =>
    radios().find(
      (radio) =>
        radio.dataset["group"] === group &&
        radio.getAttribute("aria-checked") === "true",
    );

  let rovingKey: string | undefined;
  const setRoving = (radio: HTMLElement | undefined) => {
    rovingKey = radio?.dataset["key"];
    for (const item of radios()) item.tabIndex = item === radio ? 0 : -1;
  };
  const focusRadio = (radio: HTMLElement | undefined) => {
    if (!radio) return;
    setRoving(radio);
    radio.focus();
  };
  const focusGroupRow = (group: string) =>
    focusRadio(
      checkedRadio(group) ??
        radios().find((radio) => radio.dataset["group"] === group),
    );

  const scroller = () => root.querySelector<HTMLElement>(".groups");
  const list = () => root.querySelector<HTMLElement>(".list");

  // The control the user just used stays at the same screen position while
  // rows appear and disappear around it.
  let anchor: { key: string; top: number; until: number } | undefined;
  let shift = 0;
  const setAnchor = (element: HTMLElement) => {
    anchor = {
      key: element.dataset["key"]!,
      top: element.getBoundingClientRect().top,
      until: Date.now() + ANCHOR_MS,
    };
    keepAnchored();
  };
  const applyShift = () => {
    const target = list();
    if (target) target.style.transform = shift ? `translateY(${shift}px)` : "";
  };
  const holdAnchor = () => {
    if (!anchor || Date.now() > anchor.until) return;
    const element = byKey(anchor.key);
    const scroll = scroller();
    if (!element || !scroll) return;
    const delta = element.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) < 0.5) return;
    const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    const wanted = scroll.scrollTop + delta;
    const reachable = Math.min(max, Math.max(0, wanted));
    scroll.scrollTop = reachable;
    shift -= wanted - reachable;
    applyShift();
  };
  const settle = () => {
    if (!shift) return;
    shift = 0;
    applyShift();
  };
  // Rows that are still growing or shrinking from an earlier change move the
  // anchor too, so it is held every frame until those animations end.
  let loopUntil = 0;
  let looping = false;
  const keepAnchored = () => {
    loopUntil = Date.now() + ROW_MS + 120;
    if (looping) return;
    looping = true;
    const tick = () => {
      holdAnchor();
      if (Date.now() < loopUntil) nextFrame(tick);
      else looping = false;
    };
    nextFrame(tick);
  };

  const rows = new Map<string, { element: HTMLElement; signature: string }>();
  const before = (a: Node, b: Node) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  const animateRow = (element: HTMLElement, entering: boolean) => {
    if (prefersReducedMotion()) {
      if (!entering) element.remove();
      return;
    }
    element.setAttribute("data-animate", "");
    if (entering) {
      element.setAttribute("data-closed", "");
      nextFrame(() => element.removeAttribute("data-closed"));
      setTimeout(() => element.removeAttribute("data-animate"), ROW_MS + 40);
    } else {
      element.setAttribute("data-leaving", "");
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("inert", "");
      nextFrame(() => element.setAttribute("data-closed", ""));
      setTimeout(() => element.remove(), ROW_MS + 40);
    }
  };

  const reconcile = (snapshot: Snapshot, animate: boolean) => {
    const target = list();
    if (!target) return;
    const anchorElement = anchor ? byKey(anchor.key) : undefined;
    const isAbove = (element: Node) =>
      anchorElement !== undefined &&
      element !== anchorElement &&
      !element.contains(anchorElement) &&
      before(element, anchorElement);
    const ordered = treeOrder(snapshot.groups);
    const wanted = new Set(ordered.map((meta) => meta.id));
    for (const [id, row] of rows) {
      if (wanted.has(id)) continue;
      rows.delete(id);
      if (animate && !isAbove(row.element)) animateRow(row.element, false);
      else row.element.remove();
    }
    let previous: HTMLElement | undefined;
    const reference = () => {
      let node: ChildNode | null = previous
        ? previous.nextSibling
        : target.firstChild;
      while (node instanceof HTMLElement && node.hasAttribute("data-leaving"))
        node = node.nextSibling;
      return node;
    };
    for (const meta of ordered) {
      const signature = rowSignature(meta, snapshot.groups);
      let row = rows.get(meta.id);
      let created = false;
      if (!row || row.signature !== signature) {
        const element = renderRow(meta, snapshot.groups);
        if (row) row.element.replaceWith(element);
        else created = true;
        row = { element, signature };
        rows.set(meta.id, row);
      }
      const next = reference();
      if (next !== row.element) target.insertBefore(row.element, next);
      previous = row.element;
      if (created && animate && !isAbove(row.element))
        animateRow(row.element, true);
    }
  };

  const sync = (snapshot: Snapshot) => {
    host.hidden =
      snapshot.hideUI || snapshot.clean || snapshot.groups.length === 0;
    host.toggleAttribute("data-collapsed", snapshot.collapsed);
    host.dataset["mode"] = sheet?.matches ? "sheet" : "sidebar";
    pushPage(!host.hidden && !snapshot.collapsed && !sheet?.matches);
    for (const count of root.querySelectorAll(".count"))
      count.textContent = `${snapshot.groups.length}`;
    for (const button of root.querySelectorAll<HTMLElement>(
      "[data-action=outline]",
    )) {
      button.setAttribute("aria-pressed", snapshot.outline ? "true" : "false");
    }
    for (const meta of snapshot.groups) {
      const track = rows
        .get(meta.id)
        ?.element.querySelector<HTMLElement>("[data-track]");
      if (!track) continue;
      const activeId = resolveActive(meta, snapshot.selections[meta.id]);
      const segments = Array.from(
        track.querySelectorAll<HTMLElement>("[role=radio]"),
      );
      for (const segment of segments) {
        segment.setAttribute(
          "aria-checked",
          segment.dataset["value"] === activeId ? "true" : "false",
        );
      }
      placeThumb(
        track,
        segments.find((segment) => segment.dataset["value"] === activeId),
      );
    }
    for (const [id, row] of rows) {
      row.element.toggleAttribute(
        "data-highlight",
        snapshot.highlight?.source === "page" &&
          snapshot.highlight.group === id,
      );
    }
    const roving = byKey(rovingKey);
    const fallback =
      roving?.getAttribute("role") === "radio" && roving.isConnected
        ? roving
        : (root.querySelector<HTMLElement>(
            ".slot:not([data-leaving]) [role=radio][aria-checked=true]",
          ) ?? radios()[0]);
    if (root.activeElement?.getAttribute("role") !== "radio")
      setRoving(fallback);
  };

  let shell: string | undefined;
  let structure: string | undefined;
  let focusSeq = store.getSnapshot().focus?.seq;

  const render = () => {
    const snapshot = store.getSnapshot();
    const nextShell = JSON.stringify([snapshot.collapsed, currentShortcut()]);
    const nextStructure = JSON.stringify(
      treeOrder(snapshot.groups).map((meta) => [
        meta.id,
        rowSignature(meta, snapshot.groups),
      ]),
    );
    if (nextShell !== shell) {
      shell = nextShell;
      structure = nextStructure;
      const activeKey = (root.activeElement as HTMLElement | null)?.dataset[
        "key"
      ];
      rows.clear();
      shift = 0;
      container.replaceChildren(
        snapshot.collapsed ? renderCollapsed(snapshot) : renderPanel(snapshot),
      );
      reconcile(snapshot, false);
      sync(snapshot);
      byKey(activeKey)?.focus();
      nextFrame(() => {
        for (const track of root.querySelectorAll("[data-track]"))
          track.setAttribute("data-ready", "");
      });
    } else {
      if (nextStructure !== structure) {
        structure = nextStructure;
        reconcile(snapshot, true);
        if (anchor) keepAnchored();
        nextFrame(() => {
          for (const track of root.querySelectorAll("[data-track]"))
            track.setAttribute("data-ready", "");
        });
      }
      sync(snapshot);
    }
    holdAnchor();
    if (snapshot.focus && snapshot.focus.seq !== focusSeq) {
      focusSeq = snapshot.focus.seq;
      focusGroupRow(snapshot.focus.group);
    }
  };

  const updateOffscreen = (group: string | undefined) => {
    for (const hint of root.querySelectorAll<HTMLElement>(
      "[data-action=reveal]",
    )) {
      const rect =
        group !== undefined && hint.dataset["group"] === group
          ? measureNodes(groupNodes(group))
          : undefined;
      const direction = !rect
        ? undefined
        : rect.bottom < 0
          ? "up"
          : rect.top > window.innerHeight
            ? "down"
            : undefined;
      hint.hidden = direction === undefined;
      if (direction) {
        hint.textContent = direction === "up" ? "↑ Off-screen" : "↓ Off-screen";
        hint.setAttribute(
          "aria-label",
          `Scroll ${direction} to ${hint.dataset["group"]}`,
        );
      }
    }
  };

  let hoverGroup: string | undefined;
  let focusGroup: string | undefined;
  let linked: string | undefined;
  const updateLink = () => {
    const next = hoverGroup ?? focusGroup;
    if (next === linked) return;
    linked = next;
    highlightGroup(next);
    store.setHighlight(next, "switcher");
    updateOffscreen(next);
  };
  const panelGroup = (target: EventTarget | null) =>
    (target as Element | null)?.closest?.<HTMLElement>("[data-group-panel]")
      ?.dataset["groupPanel"];

  let returnFocus: HTMLElement | undefined;

  const select = (radio: HTMLElement, group: string, value: string) => {
    setAnchor(radio);
    store.select(group, value);
  };

  const onClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>(
      "button[data-action]",
    );
    if (!button) return;
    const { action, group, value } = button.dataset;
    const snapshot = store.getSnapshot();
    if (action === "select" && group && value) {
      setRoving(button);
      select(button, group, value);
    } else if (action === "outline") store.setOutline(!snapshot.outline);
    else if (action === "canvas") store.setCanvas(true);
    else if (action === "collapse") store.setCollapsed(!snapshot.collapsed);
    else if (action === "reveal" && group) {
      const target = groupNodes(group).find(
        (node): node is Element => node instanceof Element,
      );
      target?.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      button.hidden = true;
    } else if (action === "copy" || (action === "copy-group" && group)) {
      void copyWithFeedback(
        button,
        promptFor(
          snapshot,
          window.location,
          action === "copy" ? undefined : group,
        ),
        live,
      );
    }
  };

  const onKeyDown = (event: Event) => {
    const keyboard = event as KeyboardEvent;
    const { key, altKey, ctrlKey, metaKey } = keyboard;
    if (key === "Escape") {
      if (returnFocus?.isConnected) {
        event.preventDefault();
        returnFocus.focus();
      } else (root.activeElement as HTMLElement | null)?.blur();
      returnFocus = undefined;
      return;
    }
    if (altKey || ctrlKey || metaKey) return;
    const radio = (event.target as Element | null)?.closest<HTMLElement>(
      "[role=radio]",
    );
    if (!radio) return;
    const group = radio.dataset["group"]!;
    const row = radios().filter((item) => item.dataset["group"] === group);
    if (key === "ArrowRight" || key === "ArrowLeft") {
      event.preventDefault();
      const index = row.indexOf(radio);
      const next =
        row[
          (index + (key === "ArrowRight" ? 1 : -1) + row.length) % row.length
        ];
      const value = next?.dataset["value"];
      if (!next || value === undefined) return;
      select(next, group, value);
      focusRadio(next);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      const target = key === "Home" ? row[0] : row[row.length - 1];
      const value = target?.dataset["value"];
      if (!target || value === undefined) return;
      select(target, group, value);
      focusRadio(target);
    } else if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      const groups = Array.from(
        root.querySelectorAll<HTMLElement>(
          ".slot:not([data-leaving])[data-group-panel]",
        ),
      ).map((panel) => panel.dataset["groupPanel"]!);
      const position = groups.indexOf(group) + (key === "ArrowDown" ? 1 : -1);
      const target = groups[position];
      if (target !== undefined) focusGroupRow(target);
    } else if (key === " " || key === "Enter") {
      event.preventDefault();
      const value = radio.dataset["value"];
      if (value !== undefined) select(radio, group, value);
    }
  };

  const onGlobalKeyDown = (event: KeyboardEvent) => {
    const shortcut = currentShortcut();
    if (!shortcut || !matchesShortcut(event, shortcut)) return;
    if (isEditable(event.target) || host.hidden) return;
    event.preventDefault();
    const active = deepActiveElement();
    if (!active || !host.contains(active)) returnFocus = active;
    if (store.getSnapshot().collapsed) store.setCollapsed(false);
    focusRadio(byKey(rovingKey) ?? radios()[0]);
  };

  const onPointerOver = (event: Event) => {
    hoverGroup = panelGroup(event.target);
    updateLink();
  };
  const onPointerOut = (event: Event) => {
    hoverGroup = panelGroup((event as PointerEvent).relatedTarget);
    updateLink();
  };
  const onFocusIn = (event: Event) => {
    focusGroup = panelGroup(event.target);
    updateLink();
  };
  const onFocusOut = (event: Event) => {
    focusGroup = panelGroup((event as FocusEvent).relatedTarget);
    updateLink();
  };
  const onWheel = () => settle();

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("pointerout", onPointerOut);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("wheel", onWheel, { passive: true });
  document.addEventListener("keydown", onGlobalKeyDown);
  const onSheetChange = () => render();
  sheet?.addEventListener?.("change", onSheetChange);
  document.body.append(host);
  const unsubscribe = store.subscribe(render);
  const unsubscribeConfig = onConfigChange(() => {
    shell = undefined;
    render();
  });
  render();

  return () => {
    unsubscribe();
    unsubscribeConfig();
    sheet?.removeEventListener?.("change", onSheetChange);
    highlightGroup(undefined);
    document.removeEventListener("keydown", onGlobalKeyDown);
    pushPage(false);
    pageStyle.remove();
    host.remove();
  };
};
