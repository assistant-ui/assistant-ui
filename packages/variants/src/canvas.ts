import {
  cardScale,
  DEFAULT_WIDTH,
  fitView,
  navigate,
  zoomAt,
  type View,
} from "./canvas-math";
import { NAME } from "./name";
import { groupNodes } from "./nodes";
import { promptFor } from "./prompt";
import { depthOf, treeOrder, type Store } from "./store";
import { SIDEBAR_VARIABLE, SWITCHER_ATTRIBUTE } from "./switcher";
import { BASE_CSS, copyButton, copyWithFeedback, h, iconButton } from "./ui";

export const CANVAS_ATTRIBUTE = `data-${NAME}-canvas`;

const scope = `[${CANVAS_ATTRIBUTE}]`;

// Card content renders in the light DOM so the page's global CSS applies, so
// the canvas chrome around it is scoped by attribute instead of a shadow root.
const PAGE_CSS = `
${scope} {
  --cc-bg: #fafafa; --cc-dot: rgb(0 0 0 / 0.08); --cc-card: #ffffff; --cc-border: #e4e4e7;
  --cc-fg: #18181b; --cc-muted: #71717a; --cc-accent: #d97706; --cc-quiet: rgb(24 24 27 / 0.06);
  --cc-shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -10px rgb(0 0 0 / 0.18);
  position: fixed; inset: 0; right: var(${SIDEBAR_VARIABLE}, 0px); z-index: 2147483646; display: flex; flex-direction: column;
  background-color: var(--cc-bg);
  background-image: radial-gradient(var(--cc-dot) 1px, transparent 1px);
  background-size: 20px 20px;
  color: var(--cc-fg);
}
@media (prefers-color-scheme: dark) {
  ${scope} {
    --cc-bg: #0c0c0e; --cc-dot: rgb(255 255 255 / 0.07); --cc-card: #18181b; --cc-border: #2e2e33;
    --cc-fg: #fafafa; --cc-muted: #a1a1aa; --cc-accent: #fbbf24; --cc-quiet: rgb(250 250 250 / 0.08);
    --cc-shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 12px 32px -12px rgb(0 0 0 / 0.7);
  }
}
${scope} .cc-viewport { position: relative; flex: 1; overflow: hidden; cursor: grab; touch-action: none; overscroll-behavior: contain; }
${scope} .cc-viewport[data-dragging] { cursor: grabbing; }
${scope} .cc-world { position: absolute; top: 0; left: 0; transform-origin: 0 0; display: flex; flex-direction: column; gap: 56px; padding: 8px; width: max-content; }
${scope}[data-animate] .cc-world { transition: transform 150ms cubic-bezier(0.2, 0, 0, 1); }
@media (prefers-reduced-motion: reduce) { ${scope}[data-animate] .cc-world { transition: none; } }
${scope} .cc-row[data-depth] { margin-top: -32px; padding-left: calc(var(--depth) * 32px); border-left: 1px solid var(--cc-border); margin-left: 12px; }
${scope} .cc-row-head, ${scope} .cc-card-head {
  font: 12px/16px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-variant-numeric: tabular-nums; letter-spacing: 0; text-align: left; text-transform: none;
  white-space: nowrap; direction: ltr;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
${scope} .cc-row-head { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; color: var(--cc-fg); }
${scope} .cc-row-label { font-weight: 600; font-size: 13px; }
${scope} .cc-row-parent { color: var(--cc-muted); }
${scope} .cc-row-head code, ${scope} .cc-card-head code { font: 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--cc-muted); background: none; padding: 0; }
${scope} .cc-cards { display: flex; align-items: flex-start; gap: 32px; }
${scope} .cc-card {
  display: flex; flex-direction: column; min-width: 200px; border-radius: 0; outline: none;
  background: var(--cc-card); border: 1px solid var(--cc-border); box-shadow: var(--cc-shadow); cursor: pointer;
}
${scope} .cc-card:hover { border-color: var(--cc-muted); }
${scope} .cc-card[data-current] { box-shadow: inset 0 0 0 1px var(--cc-accent), var(--cc-shadow); border-color: var(--cc-accent); }
${scope} .cc-card:focus-visible { box-shadow: 0 0 0 2px var(--cc-bg), 0 0 0 3px var(--cc-muted), var(--cc-shadow); }
${scope} .cc-card-head { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 12px; border-bottom: 1px solid var(--cc-border); color: var(--cc-fg); }
${scope} .cc-card-label { font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
${scope} .cc-current { font-size: 11px; color: var(--cc-muted); background: var(--cc-quiet); border-radius: 4px; padding: 0 6px; line-height: 18px; }
${scope} .cc-use {
  all: unset; box-sizing: border-box; margin-left: auto; height: 24px; padding: 0 8px; border-radius: 4px; cursor: pointer;
  font: 500 11px/24px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--cc-muted); white-space: nowrap;
}
${scope} .cc-use:hover { color: var(--cc-fg); background: var(--cc-quiet); }
${scope} .cc-use:focus-visible { outline: 1px solid var(--cc-muted); outline-offset: 1px; }
${scope} .cc-card-frame { padding: 16px; }
${scope} .cc-card-body {
  box-sizing: content-box; width: var(--cw, ${DEFAULT_WIDTH}px); zoom: var(--cz, 1);
  display: var(--cd, block); flex-direction: var(--cfd, row); flex-wrap: var(--cfw, nowrap);
  align-items: var(--cai, normal); justify-content: var(--cjc, normal); gap: var(--cgap, normal);
}
${scope}[data-clean] .cc-toolbar, ${scope}[data-clean] .cc-current, ${scope}[data-clean] .cc-use, ${scope}[data-clean] .cc-card-head code { display: none; }
`;

const TOOLBAR_CSS = `
:host { all: initial; display: block; }
${BASE_CSS}
.root {
  display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 8px 0 16px;
  background: var(--bg); border-bottom: 1px solid var(--border);
}
.title { font-weight: 600; }
.hint { color: var(--fg-muted); margin-left: 4px; }
.tools { margin-left: auto; display: flex; align-items: center; gap: 2px; }
.zoom { min-width: 44px; text-align: center; color: var(--fg-muted); }
.sep { width: 1px; height: 20px; background: var(--border); margin: 0 6px; }
`;

const INHERITED = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "color",
  "text-align",
  "text-transform",
  "white-space",
  "word-break",
  "direction",
  "color-scheme",
];

const LAYOUT: [string, string][] = [
  ["flex-direction", "--cfd"],
  ["flex-wrap", "--cfw"],
  ["align-items", "--cai"],
  ["justify-content", "--cjc"],
  ["gap", "--cgap"],
];

// Computed grid tracks resolve to pixel sizes fitted to the variant that is
// on the page, which would squeeze the others; grid containers lay cards out
// as a block of the container's width so each variant keeps its natural size.
const containerDisplay = (display: string) =>
  display.includes("grid")
    ? "block"
    : display.includes("flex")
      ? "flex"
      : "block";

/** The element whose content box a group's variants are laid out in. */
export const containerOf = (nodes: readonly Node[]): Element | undefined => {
  let parent = nodes[0]?.parentElement ?? undefined;
  while (parent && getComputedStyle(parent).display === "contents")
    parent = parent.parentElement ?? undefined;
  return parent;
};

const sameList = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * Copies what a variant's real container gives it onto the card slot: the
 * content-box width, the formatting context, inherited text styles, custom
 * properties, and the classes of every ancestor from `parent` (the nodes'
 * direct parent, which may be a `display: contents` wrapper) for descendant
 * selectors.
 */
export const replicateContainer = (
  slot: HTMLElement,
  container: Element | undefined,
  parent: Element | undefined = container,
) => {
  if (!container) {
    const { width, scale } = cardScale(0);
    slot.style.setProperty("--cw", `${width}px`);
    slot.style.setProperty("--cz", `${scale}`);
    slot.dataset["ancestors"] = "[]";
    return;
  }
  const style = getComputedStyle(container);
  const contentWidth =
    container.clientWidth -
    (Number.parseFloat(style.paddingLeft) || 0) -
    (Number.parseFloat(style.paddingRight) || 0);
  const { width, scale } = cardScale(contentWidth);
  slot.style.setProperty("--cw", `${width}px`);
  slot.style.setProperty("--cz", `${scale}`);
  slot.style.setProperty("--cd", containerDisplay(style.display));
  for (const [property, variable] of LAYOUT) {
    const value = style.getPropertyValue(property);
    if (value) slot.style.setProperty(variable, value);
    else slot.style.removeProperty(variable);
  }
  for (const property of INHERITED) {
    const value = style.getPropertyValue(property);
    if (value) slot.style.setProperty(property, value);
  }
  for (let index = 0; index < style.length; index++) {
    const name = style.item(index);
    if (name.startsWith("--"))
      slot.style.setProperty(name, style.getPropertyValue(name));
  }
  const ancestors: string[] = [];
  for (
    let element: Element | null = parent ?? container;
    element &&
    element !== document.body &&
    element !== document.documentElement;
    element = element.parentElement
  ) {
    const className = element.getAttribute("class");
    if (className) ancestors.unshift(className);
  }
  slot.dataset["ancestors"] = JSON.stringify(ancestors);
};

/** Class lists of a group's page ancestors, outermost first. */
export const readSlotAncestors = (slot: HTMLElement): string[] => {
  try {
    const value = JSON.parse(slot.dataset["ancestors"] ?? "[]") as unknown;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

type Shell = { slots: Map<string, HTMLElement> };

let shell: Shell | undefined;

/** The element a group portals its canvas cards into, when the canvas is open. */
export const canvasSlot = (group: string): HTMLElement | undefined =>
  shell?.slots.get(group);

const deepActiveElement = (): HTMLElement | undefined => {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : undefined;
};

export const mountCanvas = (store: Store): (() => void) => {
  const previousFocus = deepActiveElement();

  const style = document.createElement("style");
  style.setAttribute(`${CANVAS_ATTRIBUTE}-style`, "");
  style.textContent = PAGE_CSS;
  document.head.append(style);

  const host = h("div", {
    [CANVAS_ATTRIBUTE]: "",
    role: "dialog",
    "aria-modal": "false",
    "aria-label": "Variants canvas",
    tabindex: "-1",
  });

  const toolbarHost = h("div", { class: "cc-toolbar" });
  const toolbar = toolbarHost.attachShadow({ mode: "open" });
  const toolbarStyle = document.createElement("style");
  toolbarStyle.textContent = TOOLBAR_CSS;
  const zoomLabel = h("span", { class: "zoom" }, "100%");
  const live = h("div", {
    class: "sr-only",
    role: "status",
    "aria-live": "polite",
  });
  const bar = h(
    "div",
    { class: "root" },
    h("span", { class: "dot", "aria-hidden": "true" }),
    h("span", { class: "title" }, "Canvas"),
    h(
      "span",
      { class: "hint" },
      "Click a card to select it, double-click to use it",
    ),
    h(
      "div",
      { class: "tools" },
      iconButton(
        { "data-action": "zoom-out" },
        "Zoom out",
        "minus",
        "Zoom out (−)",
      ),
      zoomLabel,
      iconButton(
        { "data-action": "zoom-in" },
        "Zoom in",
        "plus",
        "Zoom in (+)",
      ),
      iconButton(
        { "data-action": "fit" },
        "Fit to screen",
        "fit",
        "Fit to screen (0)",
      ),
      h("span", { class: "sep", "aria-hidden": "true" }),
      copyButton({ "data-action": "copy" }),
      iconButton(
        { "data-action": "close" },
        "Close canvas",
        "close",
        "Close (Esc)",
      ),
    ),
    live,
  );
  toolbar.append(toolbarStyle, bar);

  const viewport = h("div", { class: "cc-viewport" });
  const world = h("div", { class: "cc-world" });
  viewport.append(world);
  host.append(toolbarHost, viewport);
  document.body.append(host);

  const current: Shell = { slots: new Map() };
  shell = current;
  const rows = new Map<string, HTMLElement>();

  let view: View = { x: 0, y: 0, zoom: 1 };
  let autoFit = true;
  const apply = () => {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
    zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
  };
  const viewportSize = () => ({
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  });
  const fit = () => {
    view = fitView(
      { width: world.offsetWidth, height: world.offsetHeight },
      viewportSize(),
    );
    apply();
  };
  const animate = (change: () => void) => {
    host.setAttribute("data-animate", "");
    change();
    setTimeout(() => host.removeAttribute("data-animate"), 160);
  };
  const zoomBy = (factor: number) => {
    autoFit = false;
    const size = viewportSize();
    animate(() => {
      view = zoomAt(view, factor, { x: size.width / 2, y: size.height / 2 });
      apply();
    });
  };

  let pendingSync: ReturnType<typeof setTimeout> | undefined;
  const scheduleSync = () => {
    if (pendingSync !== undefined) return;
    pendingSync = setTimeout(() => {
      pendingSync = undefined;
      syncRows();
    }, 50);
  };
  // Source containers resize with the page or the sidebar, and groups can
  // move on the page without remounting, so both refresh the rows.
  const containerResize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(scheduleSync)
      : undefined;
  let observedContainers: Element[] = [];
  const pageMutation =
    typeof MutationObserver === "function"
      ? new MutationObserver((records) => {
          if (records.some((record) => !host.contains(record.target)))
            scheduleSync();
        })
      : undefined;

  const syncRows = () => {
    const snapshot = store.getSnapshot();
    host.toggleAttribute("data-clean", snapshot.clean);
    const containers: Element[] = [];
    const nodes = new Map(
      snapshot.groups.map((meta) => [meta.id, groupNodes(meta.id)]),
    );
    const byPage = [...snapshot.groups].sort((a, b) => {
      const first = nodes.get(a.id)![0];
      const second = nodes.get(b.id)![0];
      if (!first || !second) return first ? -1 : second ? 1 : 0;
      if (first === second) return 0;
      return first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
    // A nested group can share its first node with its parent, so page order
    // only orders siblings; the tree puts every parent before its children.
    const groups = treeOrder(byPage).map((meta) => ({
      meta,
      nodes: nodes.get(meta.id)!,
    }));
    const ids = groups.map(({ meta }) => meta.id);
    for (const [id, row] of rows) {
      if (ids.includes(id)) continue;
      row.remove();
      rows.delete(id);
      current.slots.delete(id);
    }
    for (const { meta, nodes } of groups) {
      let row = rows.get(meta.id);
      if (!row) {
        const slot = h("div", {
          class: "cc-cards",
          "data-canvas-slot": meta.id,
        });
        const parent = meta.parent
          ? snapshot.groups.find((group) => group.id === meta.parent!.group)
          : undefined;
        const parentLabel = parent
          ? `${parent.label} › ${
              parent.variants.find(
                (variant) => variant.id === meta.parent!.variant,
              )?.label ?? meta.parent!.variant
            } › `
          : "";
        row = h(
          "section",
          {
            class: "cc-row",
            "data-canvas-row": meta.id,
            "aria-label": `${parentLabel}${meta.label}`,
          },
          h(
            "div",
            { class: "cc-row-head" },
            ...(parentLabel
              ? [h("span", { class: "cc-row-parent" }, parentLabel)]
              : []),
            h("span", { class: "cc-row-label" }, meta.label),
            ...(meta.label === meta.id ? [] : [h("code", {}, meta.id)]),
          ),
          slot,
        );
        rows.set(meta.id, row);
        current.slots.set(meta.id, slot);
      }
      const depth = depthOf(meta, snapshot.groups);
      if (depth > 0) {
        row.setAttribute("data-depth", `${depth}`);
        row.style.setProperty("--depth", `${depth}`);
      }
      const container = containerOf(nodes);
      if (container) containers.push(container);
      replicateContainer(
        current.slots.get(meta.id)!,
        container,
        nodes[0]?.parentElement ?? undefined,
      );
    }
    const ordered = ids.map((id) => rows.get(id)!);
    if (!ordered.every((row, index) => world.children[index] === row))
      world.append(...ordered);
    if (!sameList(containers, observedContainers)) {
      observedContainers = containers;
      containerResize?.disconnect();
      for (const container of containers) containerResize?.observe(container);
    }
    store.setCanvasRows(ids);
  };

  const ids = () => store.getSnapshot().canvasRows;
  const cards = () =>
    ids().map((id) =>
      Array.from(
        current.slots
          .get(id)
          ?.querySelectorAll<HTMLElement>("[data-canvas-card]") ?? [],
      ),
    );

  const close = () => store.setCanvas(false);
  const choose = (card: HTMLElement, andClose: boolean) => {
    const group = card.dataset["canvasGroup"];
    const variant = card.dataset["canvasVariant"];
    if (!group || !variant) return;
    store.select(group, variant);
    if (andClose) close();
  };

  const onToolbarClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>(
      "button[data-action]",
    );
    const action = button?.dataset["action"];
    if (!button || !action) return;
    if (action === "zoom-in") zoomBy(1.25);
    else if (action === "zoom-out") zoomBy(0.8);
    else if (action === "fit") {
      autoFit = true;
      animate(fit);
    } else if (action === "close") close();
    else if (action === "copy") {
      void copyWithFeedback(
        button,
        promptFor(store.getSnapshot(), window.location),
        live,
      );
    }
  };

  const cardOf = (target: EventTarget | null) =>
    (target as Element | null)?.closest?.<HTMLElement>("[data-canvas-card]") ??
    undefined;

  const onClick = (event: MouseEvent) => {
    const card = cardOf(event.target);
    if (!card) return;
    const use = (event.target as Element).closest("[data-canvas-use]");
    choose(card, Boolean(use));
  };
  const onDoubleClick = (event: MouseEvent) => {
    const card = cardOf(event.target);
    if (card) choose(card, true);
  };

  const onPageEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (event.composedPath().includes(host)) return;
    event.preventDefault();
    close();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const card = cardOf(event.target);
    if (card && (event.key === "Enter" || event.key === " ")) {
      if ((event.target as Element).closest("[data-canvas-use]")) return;
      event.preventDefault();
      choose(card, false);
      return;
    }
    if (
      card &&
      (event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault();
      const grid = cards();
      const row = grid.findIndex((list) => list.includes(card));
      const col = grid[row]!.indexOf(card);
      const centers = grid.map((list) =>
        list.map((item) => {
          const rect = item.getBoundingClientRect();
          return rect.left + rect.width / 2;
        }),
      );
      const next = navigate(centers, { row, col }, event.key);
      grid[next.row]?.[next.col]?.focus();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(1.25);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(0.8);
    } else if (event.key === "0") {
      event.preventDefault();
      autoFit = true;
      animate(fit);
    }
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    autoFit = false;
    if (event.ctrlKey || event.metaKey) {
      const bounds = viewport.getBoundingClientRect();
      view = zoomAt(view, Math.exp(-event.deltaY * 0.01), {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    } else {
      view = { ...view, x: view.x - event.deltaX, y: view.y - event.deltaY };
    }
    apply();
  };

  let drag: { id: number; x: number; y: number } | undefined;
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || cardOf(event.target)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    viewport.setAttribute("data-dragging", "");
    viewport.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    autoFit = false;
    view = {
      ...view,
      x: view.x + event.clientX - drag.x,
      y: view.y + event.clientY - drag.y,
    };
    drag = { ...drag, x: event.clientX, y: event.clientY };
    apply();
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = undefined;
    viewport.removeAttribute("data-dragging");
  };

  const onFocusIn = (event: FocusEvent) => {
    const path = event.composedPath();
    if (
      path.includes(host) ||
      path.some(
        (target) =>
          target instanceof Element && target.hasAttribute(SWITCHER_ATTRIBUTE),
      )
    )
      return;
    const first = cards().flat()[0];
    (first ?? host).focus();
  };

  const refit = () => {
    if (autoFit) fit();
  };
  const resize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(refit)
      : undefined;
  resize?.observe(world);
  resize?.observe(viewport);
  pageMutation?.observe(document.body, { childList: true, subtree: true });

  toolbar.addEventListener("click", onToolbarClick);
  host.addEventListener("click", onClick);
  host.addEventListener("dblclick", onDoubleClick);
  host.addEventListener("keydown", onKeyDown);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("keydown", onPageEscape);
  window.addEventListener("resize", refit);
  const unsubscribe = store.subscribe(() => {
    const snapshot = store.getSnapshot();
    host.toggleAttribute("data-clean", snapshot.clean);
    const changed =
      rows.size !== snapshot.groups.length ||
      snapshot.groups.some((meta) => !rows.has(meta.id));
    if (changed) syncRows();
  });

  syncRows();
  apply();
  host.focus();
  const settle = () => {
    refit();
    const selected =
      host.querySelector<HTMLElement>("[data-canvas-card][data-current]") ??
      host.querySelector<HTMLElement>("[data-canvas-card]");
    selected?.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === "function")
    requestAnimationFrame(settle);
  else setTimeout(settle, 16);

  return () => {
    unsubscribe();
    resize?.disconnect();
    containerResize?.disconnect();
    pageMutation?.disconnect();
    clearTimeout(pendingSync);
    toolbar.removeEventListener("click", onToolbarClick);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("keydown", onPageEscape);
    window.removeEventListener("resize", refit);
    if (shell === current) shell = undefined;
    host.remove();
    style.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  };
};
