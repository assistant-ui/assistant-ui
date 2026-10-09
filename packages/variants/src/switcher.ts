import {
  DEFAULT_SHORTCUT,
  getConfig,
  matchesShortcut,
  onConfigChange,
  shortcutLabel,
} from "./config";
import { createAgentLink } from "./agent";
import { NAME } from "./name";
import { groupNodes, measureNodes } from "./nodes";
import { highlightGroup } from "./outline";
import { createNotes, describeTarget } from "./notes";
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
.row { display: flex; align-items: center; gap: 4px; }
.rail { position: relative; flex: 1 1 auto; min-width: 0; border-radius: 8px; background: var(--bg-subtle); }
.track {
  position: relative; display: flex; flex-wrap: nowrap; gap: 2px; height: 28px; padding: 2px;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none; overscroll-behavior-x: contain;
}
.track::-webkit-scrollbar { display: none; }
.rail[data-overflow-start] .track { mask-image: linear-gradient(to right, transparent 0, #000 28px); }
.rail[data-overflow-end] .track { mask-image: linear-gradient(to left, transparent 0, #000 28px); }
.rail[data-overflow-start][data-overflow-end] .track {
  mask-image: linear-gradient(to right, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%);
}
.nudge {
  position: absolute; top: 2px; bottom: 2px; width: 20px; display: none; place-items: center;
  border-radius: 6px; color: var(--fg-muted); background: var(--bg-subtle); z-index: 1; font-size: 13px; line-height: 1;
}
.nudge:hover { color: var(--fg); }
.nudge[data-side="start"] { left: 2px; }
.nudge[data-side="end"] { right: 2px; }
.rail[data-overflow-start] .nudge[data-side="start"], .rail[data-overflow-end] .nudge[data-side="end"] { display: grid; }
.note-count {
  flex: none; height: 18px; padding: 0 6px; border-radius: 4px; font-size: 11px; color: var(--fg-muted);
  background: var(--quiet);
}
.note-count:hover, .note-count[aria-expanded="true"] { color: var(--fg); }
.note-count[hidden], .notes[hidden], .editor[hidden] { display: none; }
.notes { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.note {
  display: grid; grid-template-columns: 1fr auto; gap: 2px 6px; align-items: start;
  padding: 6px 4px 6px 8px; border-radius: 6px; background: var(--bg-subtle); font-size: 11px;
}
.note-text { color: var(--fg); overflow-wrap: anywhere; }
.note-meta { grid-column: 1; color: var(--fg-muted); overflow-wrap: anywhere; }
.note .icon { grid-row: 1 / span 2; grid-column: 2; width: 24px; height: 24px; }
.editor {
  margin-top: 6px; display: flex; flex-direction: column; gap: 6px; padding: 8px;
  border-radius: 8px; box-shadow: inset 0 0 0 1px var(--border);
}
.editor-head { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--fg-muted); }
.editor-head label { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.editor-hint { font: 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--fg-muted); overflow-wrap: anywhere; }
.editor textarea {
  all: unset; box-sizing: border-box; display: block; width: 100%; min-height: 56px; padding: 6px 8px;
  border-radius: 6px; background: var(--bg-subtle); color: var(--fg); font: inherit; white-space: pre-wrap;
}
.editor textarea:focus-visible { outline: 1.5px solid var(--ring); outline-offset: 0; }
.editor-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; }
.editor-actions .where { flex: 1 1 auto; color: var(--fg-muted); font-size: 11px; }
.editor-error { color: #b91c1c; font-size: 11px; }
@media (prefers-color-scheme: dark) { .editor-error { color: #fca5a5; } }
.desc {
  height: 16px; margin-top: 4px; padding-left: 2px; font-size: 11px; line-height: 16px; color: var(--fg-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.thumb {
  position: absolute; top: 0; left: 0; width: 0; height: 0; border-radius: 6px; pointer-events: none;
  background: var(--quiet);
}
.slot[data-highlight] .thumb { box-shadow: inset 0 0 0 1px var(--border); }
.seg {
  position: relative; display: inline-flex; align-items: center; justify-content: center; flex: 1 0 auto;
  min-width: 32px; height: 24px; padding: 0 8px; border-radius: 6px; white-space: nowrap; color: var(--fg-segment);
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
footer .send:not([hidden]) + .text-btn { margin-left: 0; }
.agent { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--fg-muted); white-space: nowrap; }
.agent::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #16a34a; }
.agent[hidden], .send[hidden], .agent-status[hidden] { display: none; }
.agent-status { margin-top: 2px; padding-left: 2px; font-size: 11px; line-height: 16px; color: var(--fg-muted); overflow-wrap: anywhere; }
.agent-status[data-ok="false"] { color: #b91c1c; }
@media (prefers-color-scheme: dark) { .agent-status[data-ok="false"] { color: #fca5a5; } }
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
  const labelId = `group-label-${nextLabel}`;
  const descId = `group-desc-${nextLabel++}`;
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
        class: "note-count",
        "data-action": "toggle-notes",
        "data-group": meta.id,
        "aria-expanded": "false",
        hidden: "",
      }),
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
        { class: "rail", "data-rail": meta.id },
        h(
          "button",
          {
            type: "button",
            class: "nudge",
            "data-action": "nudge",
            "data-side": "start",
            "data-group": meta.id,
            tabindex: "-1",
            "aria-hidden": "true",
          },
          "‹",
        ),
        h(
          "div",
          {
            class: "track",
            role: "radiogroup",
            "aria-labelledby": labelId,
            "aria-describedby": descId,
            "data-track": meta.id,
          },
          h("span", { class: "thumb", "aria-hidden": "true" }),
          ...meta.variants.map((variant, index) =>
            h(
              "button",
              {
                type: "button",
                role: "radio",
                class: "seg",
                tabindex: "-1",
                "aria-label": `${index + 1}: ${variant.label}`,
                "data-action": "select",
                "data-group": meta.id,
                "data-value": variant.id,
                "data-label": variant.label,
                "data-key": `${meta.id}:${variant.id}`,
                title: `${variant.label} (?variant=${meta.id}:${variant.id})`,
              },
              h(
                "span",
                { class: "stack" },
                h("span", { "data-main": "" }, `${index + 1}`),
                h(
                  "span",
                  { "data-alt": "", "aria-hidden": "true" },
                  `${index + 1}`,
                ),
              ),
            ),
          ),
        ),
        h(
          "button",
          {
            type: "button",
            class: "nudge",
            "data-action": "nudge",
            "data-side": "end",
            "data-group": meta.id,
            tabindex: "-1",
            "aria-hidden": "true",
          },
          "›",
        ),
      ),
      iconButton(
        {
          "data-action": "note",
          "data-group": meta.id,
          "data-key": `${meta.id}:note`,
        },
        `Add a note to ${meta.label}`,
        "note",
        `Add a note for your coding agent (or Alt-click inside the region)`,
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
    h("div", { class: "desc", id: descId, "data-desc": meta.id }),
    h("div", {
      class: "agent-status",
      role: "status",
      "data-agent-status": meta.id,
      hidden: "",
    }),
    h("div", { class: "notes", "data-notes": meta.id, hidden: "" }),
    h("div", { class: "editor", "data-editor": meta.id, hidden: "" }),
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
      "span",
      {
        class: "agent",
        "data-agent-badge": "",
        title: "A coding agent is linked through .variants/",
        hidden: "",
      },
      "Agent connected",
    ),
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
    h(
      "button",
      {
        type: "button",
        class: "text-btn send",
        "data-action": "send",
        "data-key": "send",
        title: "Send /variants choose with the selected variants to the agent",
        hidden: "",
      },
      "Send to agent",
    ),
    copyButton({ "data-action": "copy", "data-key": "copy" }),
  );

  return h(
    "section",
    {
      class: "panel",
      "aria-label": "Design variants",
      ...(shortcut
        ? {
            "aria-keyshortcuts": shortcutLabel(shortcut, true),
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

  const rowPart = (group: string, selector: string) =>
    rows.get(group)?.element.querySelector<HTMLElement>(selector) ?? undefined;
  const shownActive = new Map<string, string | undefined>();
  const preview = new Map<string, HTMLElement>();

  const describe = (group: string) => {
    const desc = rowPart(group, "[data-desc]");
    if (!desc) return;
    const segment =
      preview.get(group) ?? rowPart(group, "[role=radio][aria-checked=true]");
    desc.textContent = segment?.dataset["label"] ?? "";
    desc.toggleAttribute("data-preview", preview.has(group));
  };

  const updateRail = (group: string) => {
    const rail = rowPart(group, "[data-rail]");
    const track = rowPart(group, "[data-track]");
    if (!rail || !track) return;
    const max = track.scrollWidth - track.clientWidth;
    rail.toggleAttribute(
      "data-overflow-start",
      max > 1 && track.scrollLeft > 1,
    );
    rail.toggleAttribute(
      "data-overflow-end",
      max > 1 && track.scrollLeft < max - 1,
    );
  };

  // Keeps the selected number visible inside a row that scrolls sideways;
  // only scrollLeft changes, so the row's vertical position is untouched.
  const revealSegment = (track: HTMLElement, segment: HTMLElement) => {
    const inset = 24;
    const start = segment.offsetLeft - inset;
    const end = segment.offsetLeft + segment.offsetWidth + inset;
    let left = track.scrollLeft;
    if (start < left) left = start;
    else if (end > left + track.clientWidth) left = end - track.clientWidth;
    left = Math.max(0, left);
    if (left === track.scrollLeft) return;
    if (typeof track.scrollTo === "function")
      track.scrollTo({
        left,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    else track.scrollLeft = left;
  };

  const notes = createNotes(store);
  const agent = createAgentLink(store);
  const expandedNotes = new Set<string>();
  const renderedNotes = new Map<string, string>();

  const variantName = (group: string, variant: string | undefined) => {
    if (variant === undefined) return "whole group";
    const meta = store.getSnapshot().groups.find((item) => item.id === group);
    const index = meta?.variants.findIndex((item) => item.id === variant) ?? -1;
    const label = index >= 0 ? meta!.variants[index]!.label : variant;
    return index >= 0 ? `${index + 1} · ${label}` : label;
  };

  const renderNotes = (group: string, snapshot: Snapshot) => {
    const count = rowPart(group, "[data-action=toggle-notes]");
    const list = rowPart(group, "[data-notes]");
    if (!count || !list) return;
    const items = snapshot.notes.filter((note) => note.group === group);
    const expanded = expandedNotes.has(group) && items.length > 0;
    count.hidden = items.length === 0;
    count.textContent = `${items.length} ${items.length === 1 ? "note" : "notes"}`;
    count.setAttribute("aria-expanded", expanded ? "true" : "false");
    list.hidden = !expanded;
    const key = JSON.stringify([expanded, items]);
    if (renderedNotes.get(group) === key) return;
    renderedNotes.set(group, key);
    list.replaceChildren(
      ...(expanded ? items : []).map((note) =>
        h(
          "div",
          { class: "note" },
          h("span", { class: "note-text" }, note.note),
          h(
            "span",
            { class: "note-meta" },
            [
              variantName(group, note.variant),
              note.hint ? `on ${note.hint}` : "",
              note.source === "file"
                ? `${note.file ?? "source"}${note.line ? `:${note.line}` : ""}`
                : "this tab",
            ]
              .filter(Boolean)
              .join(" · "),
          ),
          iconButton(
            {
              "data-action": "delete-note",
              "data-group": group,
              "data-note": note.id,
            },
            "Delete note",
            "trash",
          ),
        ),
      ),
    );
  };

  const closeEditor = (group: string) => {
    const editor = rowPart(group, "[data-editor]");
    if (!editor) return;
    editor.hidden = true;
    editor.replaceChildren();
  };

  const openEditor = (group: string, hint?: string) => {
    const editor = rowPart(group, "[data-editor]");
    const meta = store.getSnapshot().groups.find((item) => item.id === group);
    if (!editor || !meta) return;
    const variant = resolveActive(meta, store.getSnapshot().selections[group]);
    editor.dataset["variant"] = variant ?? "";
    editor.dataset["hint"] = hint ?? "";
    const whole = h("input", {
      type: "checkbox",
      "data-whole": "",
    }) as HTMLInputElement;
    const target = h("span", {}, `Note on ${variantName(group, variant)}`);
    whole.addEventListener("change", () => {
      target.textContent = `Note on ${variantName(group, whole.checked ? undefined : variant)}`;
    });
    const textarea = h("textarea", {
      "aria-label": `Note for ${meta.label}`,
      placeholder: "What should change?",
      rows: "3",
    }) as HTMLTextAreaElement;
    textarea.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        closeEditor(group);
        byKey(`${group}:note`)?.focus();
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void saveNote(group);
      }
    });
    editor.replaceChildren(
      h(
        "div",
        { class: "editor-head" },
        target,
        h("label", {}, whole, "Whole group"),
      ),
      ...(hint ? [h("div", { class: "editor-hint" }, `on ${hint}`)] : []),
      textarea,
      h("div", { class: "editor-error", role: "alert", hidden: "" }),
      h(
        "div",
        { class: "editor-actions" },
        h(
          "span",
          { class: "where" },
          notes.mode === "server"
            ? "Saved into the source"
            : "Kept in this tab and added to the copied command",
        ),
        h(
          "button",
          {
            type: "button",
            class: "text-btn",
            "data-action": "cancel-note",
            "data-group": group,
          },
          "Cancel",
        ),
        h(
          "button",
          {
            type: "button",
            class: "text-btn",
            "data-action": "save-note",
            "data-group": group,
          },
          "Save",
        ),
        ...(store.getSnapshot().agent.connected
          ? [
              h(
                "button",
                {
                  type: "button",
                  class: "text-btn",
                  "data-action": "save-send",
                  "data-group": group,
                  title: "Save, then ask the agent to apply this group's notes",
                },
                "Save & send",
              ),
            ]
          : []),
      ),
    );
    editor.hidden = false;
    textarea.focus();
  };

  const sendToAgent = async (kind: "choose" | "apply", group?: string) => {
    const failure = await agent.send(kind, group);
    live.textContent = failure ?? "Sent to the agent";
  };

  const saveNote = async (group: string, send = false) => {
    const editor = rowPart(group, "[data-editor]");
    const textarea = editor?.querySelector("textarea");
    const error = editor?.querySelector<HTMLElement>(".editor-error");
    if (!editor || !textarea) return;
    const text = textarea.value.trim();
    if (!text) {
      textarea.focus();
      return;
    }
    const whole =
      editor.querySelector<HTMLInputElement>("[data-whole]")?.checked;
    const failure = await notes.add({
      group,
      variant: whole ? undefined : editor.dataset["variant"] || undefined,
      note: text,
      hint: editor.dataset["hint"] || undefined,
    });
    if (failure) {
      if (error) {
        error.hidden = false;
        error.textContent = failure;
      }
      return;
    }
    closeEditor(group);
    expandedNotes.add(group);
    renderNotes(group, store.getSnapshot());
    live.textContent = "Note saved";
    byKey(`${group}:note`)?.focus();
    if (send) await sendToAgent("apply", group);
  };

  // Alt-click inside a variant opens a note for the innermost group there,
  // with a short description of what was clicked.
  const onPageClick = (event: MouseEvent) => {
    if (!event.altKey || event.button !== 0 || host.hidden) return;
    if (event.composedPath().includes(host)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const snapshot = store.getSnapshot();
    if (snapshot.clean || snapshot.canvas) return;
    let best:
      | { group: string; distance: number; depth: number; nodes: Node[] }
      | undefined;
    for (const meta of snapshot.groups) {
      const nodes = groupNodes(meta.id);
      const root = nodes.find(
        (node) => node === target || node.contains(target),
      );
      if (!root) continue;
      let distance = 0;
      for (
        let node: Node | null = target;
        node && node !== root;
        node = node.parentNode
      )
        distance++;
      const depth = depthOf(meta, snapshot.groups);
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && depth > best.depth)
      )
        best = { group: meta.id, distance, depth, nodes };
    }
    if (!best) return;
    event.preventDefault();
    event.stopPropagation();
    if (snapshot.collapsed) store.setCollapsed(false);
    openEditor(best.group, describeTarget(target, best.nodes));
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
      const checked = segments.find(
        (segment) => segment.dataset["value"] === activeId,
      );
      placeThumb(track, checked);
      const changed = shownActive.get(meta.id) !== activeId;
      shownActive.set(meta.id, activeId);
      if (changed && checked) revealSegment(track, checked);
      updateRail(meta.id);
      describe(meta.id);
      renderNotes(meta.id, snapshot);
      const status = rowPart(meta.id, "[data-agent-status]");
      const latest = snapshot.agent.status[meta.id];
      if (status) {
        status.hidden = !latest;
        status.textContent = latest ? `Agent: ${latest.text}` : "";
        if (latest?.ok === false) status.setAttribute("data-ok", "false");
        else status.removeAttribute("data-ok");
      }
    }
    for (const element of root.querySelectorAll<HTMLElement>(
      "[data-agent-badge], [data-action=send]",
    ))
      element.hidden = !snapshot.agent.connected;
    agent.setActive(
      !host.hidden && !snapshot.collapsed && snapshot.notesMode === "server",
    );
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
      shownActive.clear();
      renderedNotes.clear();
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
        void notes.refresh();
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
    } else if (action === "note" && group) {
      const editor = rowPart(group, "[data-editor]");
      if (editor && !editor.hidden) closeEditor(group);
      else openEditor(group);
    } else if (action === "save-note" && group) {
      void saveNote(group);
    } else if (action === "save-send" && group) {
      void saveNote(group, true);
    } else if (action === "send") {
      void sendToAgent("choose");
    } else if (action === "cancel-note" && group) {
      closeEditor(group);
      byKey(`${group}:note`)?.focus();
    } else if (action === "toggle-notes" && group) {
      if (expandedNotes.has(group)) expandedNotes.delete(group);
      else expandedNotes.add(group);
      renderNotes(group, snapshot);
    } else if (action === "delete-note" && group) {
      const note = snapshot.notes.find(
        (item) => item.id === button.dataset["note"],
      );
      if (note)
        void notes.remove(note).then((failure) => {
          live.textContent = failure ?? "Note deleted";
        });
    } else if (action === "nudge" && group) {
      const track = rowPart(group, "[data-track]");
      if (!track) return;
      const step =
        Math.max(track.clientWidth * 0.7, 40) *
        (button.dataset["side"] === "start" ? -1 : 1);
      if (typeof track.scrollBy === "function")
        track.scrollBy({
          left: step,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      else track.scrollLeft += step;
      updateRail(group);
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
    if (isEditable(event.composedPath()[0] ?? event.target) || host.hidden)
      return;
    event.preventDefault();
    const active = deepActiveElement();
    if (!active || !root.contains(active)) returnFocus = active;
    if (store.getSnapshot().collapsed) store.setCollapsed(false);
    focusRadio(byKey(rovingKey) ?? radios()[0]);
  };

  const segmentOf = (target: EventTarget | null) =>
    (target as Element | null)?.closest?.<HTMLElement>("[role=radio]") ??
    undefined;
  const onPointerOver = (event: Event) => {
    hoverGroup = panelGroup(event.target);
    updateLink();
    const segment = segmentOf(event.target);
    const group = segment?.dataset["group"];
    if (segment && group) {
      preview.set(group, segment);
      describe(group);
    }
  };
  const onPointerOut = (event: Event) => {
    const related = (event as PointerEvent).relatedTarget;
    hoverGroup = panelGroup(related);
    updateLink();
    const segment = segmentOf(event.target);
    const group = segment?.dataset["group"];
    if (segment && group && segmentOf(related) !== segment) {
      preview.delete(group);
      describe(group);
    }
  };
  const onScroll = (event: Event) => {
    const group = (event.target as HTMLElement | null)?.dataset?.["track"];
    if (group) updateRail(group);
  };
  const onResize = () => {
    for (const id of rows.keys()) updateRail(id);
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
  const onPageScroll = () => updateOffscreen(linked);

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("pointerout", onPointerOut);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("wheel", onWheel, { passive: true });
  root.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", onPageScroll, { passive: true });
  document.addEventListener("keydown", onGlobalKeyDown);
  document.addEventListener("click", onPageClick, true);
  const onSheetChange = () => render();
  sheet?.addEventListener?.("change", onSheetChange);
  document.body.append(host);
  const unsubscribe = store.subscribe(render);
  const unsubscribeConfig = onConfigChange(() => {
    shell = undefined;
    render();
  });
  render();
  void notes.probe();

  return () => {
    unsubscribe();
    agent.setActive(false);
    unsubscribeConfig();
    sheet?.removeEventListener?.("change", onSheetChange);
    highlightGroup(undefined);
    document.removeEventListener("keydown", onGlobalKeyDown);
    document.removeEventListener("click", onPageClick, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onPageScroll);
    pushPage(false);
    pageStyle.remove();
    host.remove();
  };
};
