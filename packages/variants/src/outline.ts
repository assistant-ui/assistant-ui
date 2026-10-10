import { NAME } from "./name";
import { measureNodes, type Rect } from "./nodes";

export type { Rect } from "./nodes";

export const OUTLINE_ATTRIBUTE = `data-${NAME}-outlines`;

export type RegionInfo = {
  /** Unique per mounted `<Variants>`; nested groups list their ancestors' keys. */
  key: string;
  ancestors: string[];
  /** The `<Variants>` id, used to link the region with its switcher row. */
  groupId: string;
  group: string;
  variant: string;
  position: string;
  /** `always` draws the outline and tab; `hover` reveals them only while the pointer is over the region. */
  mode: "always" | "hover";
  onActivate: () => void;
  /** Called when the pointer starts or stops hovering the region. */
  onHover?: ((hovered: boolean) => void) | undefined;
};

export type FrameInput = {
  key: string;
  content: Rect;
  /** Keys of frames that contain this frame (nested `<Variants>`). */
  ancestors: string[];
  tab: { width: number; height: number };
  /** A hover-only tab shows one at a time, so it reserves no space for others. */
  quiet?: boolean;
};

export type FrameLayout = {
  key: string;
  box: Rect;
  tab: { top: number; left: number };
};

const BASE_OUTSET = 3;
const NEST_STEP = 4;
const TAB_GAP = 3;
const TAB_INSET = 4;

const intersects = (a: Rect, b: Rect, margin = 0) =>
  a.left < b.right + margin &&
  b.left < a.right + margin &&
  a.top < b.bottom + margin &&
  b.top < a.bottom + margin;

const overlap = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0);

/**
 * Places every frame so outlines never cross: nested frames step outward per
 * nesting level, sibling sides shrink to half the gap between their contents,
 * and tabs are placed greedily in reading order, sliding along the frame edge
 * past tabs already placed.
 */
export const layoutFrames = (
  frames: readonly FrameInput[],
  viewport: { width: number; height: number },
): FrameLayout[] => {
  const below = new Map<string, number>();
  const levelsBelow = (key: string): number => {
    const cached = below.get(key);
    if (cached !== undefined) return cached;
    below.set(key, 0);
    let levels = 0;
    for (const frame of frames) {
      if (frame.ancestors.includes(key))
        levels = Math.max(levels, 1 + levelsBelow(frame.key));
    }
    below.set(key, levels);
    return levels;
  };

  const outsets = new Map(
    frames.map((frame) => {
      const outset = BASE_OUTSET + NEST_STEP * levelsBelow(frame.key);
      return [
        frame.key,
        { top: outset, right: outset, bottom: outset, left: outset },
      ];
    }),
  );

  const related = (a: FrameInput, b: FrameInput) =>
    a.ancestors.includes(b.key) || b.ancestors.includes(a.key);

  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const a = frames[i]!;
      const b = frames[j]!;
      if (related(a, b)) continue;
      const ca = a.content;
      const cb = b.content;
      const horizontal = overlap(ca.left, ca.right, cb.left, cb.right);
      const vertical = overlap(ca.top, ca.bottom, cb.top, cb.bottom);
      if (horizontal > 0 && vertical <= 0) {
        const [upper, lower] = ca.top <= cb.top ? [a, b] : [b, a];
        const limit = Math.floor(-vertical / 2) - 1;
        const up = outsets.get(upper.key)!;
        const low = outsets.get(lower.key)!;
        up.bottom = Math.min(up.bottom, limit);
        low.top = Math.min(low.top, limit);
      } else if (vertical > 0 && horizontal <= 0) {
        const [first, second] = ca.left <= cb.left ? [a, b] : [b, a];
        const limit = Math.floor(-horizontal / 2) - 1;
        const left = outsets.get(first.key)!;
        const right = outsets.get(second.key)!;
        left.right = Math.min(left.right, limit);
        right.left = Math.min(right.left, limit);
      }
    }
  }

  const boxes = new Map(
    frames.map((frame) => {
      const outset = outsets.get(frame.key)!;
      const { content } = frame;
      return [
        frame.key,
        {
          top: content.top - outset.top,
          left: content.left - outset.left,
          right: content.right + outset.right,
          bottom: content.bottom + outset.bottom,
        },
      ];
    }),
  );

  const placed: Rect[] = [];
  const order = [...frames].sort((a, b) => {
    const ba = boxes.get(a.key)!;
    const bb = boxes.get(b.key)!;
    return ba.top - bb.top || ba.left - bb.left;
  });
  const tabs = new Map<string, { top: number; left: number }>();
  for (const frame of order) {
    const box = boxes.get(frame.key)!;
    const { width, height } = frame.tab;
    const rectOf = (spot: { left: number; top: number }): Rect => ({
      top: spot.top,
      left: spot.left,
      right: spot.left + width,
      bottom: spot.top + height,
    });
    const offscreen = (rect: Rect) =>
      rect.top < 0 || (viewport.height > 0 && rect.top > viewport.height);
    // A tab outside the frame may slide past the frame's right edge up to the
    // viewport; one inside it stays within the frame.
    const within = Math.max(box.right, box.left + TAB_INSET + width) + 0.5;
    const outside = Math.max(within, viewport.width > 0 ? viewport.width : 0);
    const neighbours = frames
      .filter((other) => other !== frame && !related(frame, other))
      .map((other) => other.content);
    const slide = (
      top: number,
      start: number,
      limit: number,
      avoidContent: boolean,
    ) => {
      let left = start;
      for (let tries = 0; tries < 50; tries++) {
        const rect = rectOf({ left, top });
        if (offscreen(rect) || rect.right > limit) return undefined;
        const tabHit = placed.find((other) => intersects(rect, other, 2));
        const contentHit = avoidContent
          ? neighbours.find((other) => intersects(rect, other))
          : undefined;
        if (!tabHit && !contentHit) return { left, top };
        left =
          Math.max(tabHit?.right ?? -Infinity, contentHit?.right ?? -Infinity) +
          6;
        // Sliding past content keeps the tab over its own frame.
        if (contentHit && left + width > within) return undefined;
      }
      return undefined;
    };
    const inside = { left: box.left + TAB_INSET, top: box.top + TAB_INSET };
    const above = box.top - height - TAB_GAP;
    const below = box.bottom + TAB_GAP;
    // A tab never covers another group's content when it can avoid it: above,
    // then below, then inside its own frame, and only then over a neighbour.
    let spot =
      slide(above, box.left, outside, true) ??
      slide(below, box.left, outside, true) ??
      slide(inside.top, inside.left, within, false) ??
      slide(above, box.left, outside, false);
    if (!spot) {
      const fallback = { ...inside };
      for (
        let tries = 0;
        tries < 20 &&
        placed.some((other) => intersects(rectOf(fallback), other, 2));
        tries++
      ) {
        fallback.top += height + 2;
      }
      spot = fallback;
    }
    if (!frame.quiet) placed.push(rectOf(spot));
    tabs.set(frame.key, spot);
  }

  return frames.map((frame) => ({
    key: frame.key,
    box: boxes.get(frame.key)!,
    tab: tabs.get(frame.key)!,
  }));
};

const CSS = `
:host {
  all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483646;
  --stroke: rgb(217 119 6 / 0.7); --stroke-strong: #d97706;
  --tab-bg: #ffffff; --tab-border: #e4e4e7; --fg: #18181b; --fg-muted: #71717a; --accent: #d97706;
}
@media (prefers-color-scheme: dark) {
  :host {
    --stroke: rgb(251 191 36 / 0.6); --stroke-strong: #fbbf24;
    --tab-bg: #18181b; --tab-border: #3f3f46; --fg: #fafafa; --fg-muted: #a1a1aa; --accent: #fbbf24;
  }
}
.box {
  position: absolute; box-sizing: border-box; pointer-events: none;
  border: 1px dashed var(--stroke); border-radius: 0;
}
.box[data-nested] { border-style: dotted; }
.box[data-hover] { border-color: var(--stroke-strong); }
[data-empty] { display: none; }
button {
  all: unset; box-sizing: border-box; position: absolute; top: 0; left: 0;
  display: inline-flex; align-items: center; gap: 6px; height: 20px; padding: 0 7px 0 6px;
  max-width: 320px; overflow: hidden; white-space: nowrap;
  pointer-events: auto; cursor: pointer;
  font: 500 11px/20px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-variant-numeric: tabular-nums; letter-spacing: 0;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  color: var(--fg); background: var(--tab-bg);
  border: 1px solid var(--tab-border); border-radius: 4px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 2px 8px -2px rgb(0 0 0 / 0.08);
}
button::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.muted { color: var(--fg-muted); }
.name { overflow: hidden; text-overflow: ellipsis; }
[data-mode="hover"]:not([data-hover]) { opacity: 0; visibility: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .box { transition: border-color 150ms ease, opacity 150ms ease, visibility 150ms; }
  button { transition: opacity 150ms ease, visibility 150ms; }
}
`;

type Region = {
  getNodes: () => Node[];
  info: RegionInfo;
  rect: Rect | undefined;
  observed: Element[];
  parents: Node[];
  resize: ResizeObserver | undefined;
  mutation: MutationObserver | undefined;
  box: HTMLElement;
  /** The frame and its tab together, so the pointer can cross from one to the other. */
  reach?: Rect | undefined;
  tab: HTMLButtonElement;
};

type Layer = {
  host: HTMLElement;
  root: ShadowRoot;
  regions: Set<Region>;
  signature: string;
  hovered: Region | undefined;
  pointer: { x: number; y: number } | undefined;
  frame: number | undefined;
  hoverFrame: number | undefined;
  schedule: () => void;
  dispose: () => void;
};

let layer: Layer | undefined;
let forcedGroup: string | undefined;

const requestFrame = (callback: () => void): number =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(callback)
    : (setTimeout(callback, 16) as unknown as number);

const cancelFrame = (frame: number | undefined) => {
  if (frame === undefined) return;
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
  clearTimeout(frame);
};

const makeTab = (info: RegionInfo): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab";
  button.tabIndex = -1;
  const parts: [string, string][] = [
    [info.group, "muted"],
    [" · ", "muted"],
    [info.variant, "name"],
    [" · ", "muted"],
    [info.position, "muted"],
  ];
  for (const [text, name] of parts) {
    const span = document.createElement("span");
    span.className = name;
    span.textContent = text;
    button.append(span);
  }
  const label = parts.map(([text]) => text).join("");
  button.setAttribute("aria-label", `${label}: show in the variant switcher`);
  button.title = "Show in the variant switcher";
  button.addEventListener("click", () => info.onActivate());
  return button;
};

const sameList = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const measure = (region: Region) => {
  const nodes = region.getNodes();
  const observed: Element[] = [];
  region.rect = measureNodes(nodes, observed);
  if (!sameList(observed, region.observed)) {
    region.observed = observed;
    region.resize?.disconnect();
    for (const element of observed) region.resize?.observe(element);
  }
  const parents = [
    ...new Set(nodes.map((node) => node.parentNode).filter(Boolean)),
  ] as Node[];
  if (!sameList(parents, region.parents)) {
    region.parents = parents;
    region.mutation?.disconnect();
    for (const parent of parents) {
      region.mutation?.observe(parent, {
        childList: true,
        subtree: true,
        characterData: true,
        attributeFilter: ["class", "style", "hidden"],
      });
    }
  }
};

const layoutLayer = (current: Layer) => {
  const regions = [...current.regions];
  for (const region of regions) measure(region);
  const measured = new Set(
    regions.filter((region) => region.rect).map((region) => region.info.key),
  );
  const inputs: FrameInput[] = [];
  for (const region of regions) {
    region.box.toggleAttribute("data-empty", !region.rect);
    region.tab.toggleAttribute("data-empty", !region.rect);
    if (!region.rect) continue;
    inputs.push({
      key: region.info.key,
      content: region.rect,
      ancestors: region.info.ancestors.filter((key) => measured.has(key)),
      tab: {
        width: region.tab.offsetWidth,
        height: region.tab.offsetHeight || 20,
      },
      quiet: region.info.mode === "hover",
    });
  }
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const signature = JSON.stringify([inputs, viewport]);
  if (signature === current.signature) return;
  current.signature = signature;

  const byKey = new Map(regions.map((region) => [region.info.key, region]));
  for (const placed of layoutFrames(inputs, viewport)) {
    const region = byKey.get(placed.key)!;
    const { box } = placed;
    const size = inputs.find((input) => input.key === placed.key)!.tab;
    region.reach = {
      top: Math.min(box.top, placed.tab.top),
      left: Math.min(box.left, placed.tab.left),
      right: Math.max(box.right, placed.tab.left + size.width),
      bottom: Math.max(box.bottom, placed.tab.top + size.height),
    };
    region.box.style.top = `${box.top}px`;
    region.box.style.left = `${box.left}px`;
    region.box.style.width = `${box.right - box.left}px`;
    region.box.style.height = `${box.bottom - box.top}px`;
    region.tab.style.transform = `translate(${placed.tab.left}px, ${placed.tab.top}px)`;
  }
};

const contains = (rect: Rect | DOMRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const updateHover = (current: Layer) => {
  const pointer = current.pointer;
  let hovered: Region | undefined;
  if (pointer) {
    const kept = current.hovered;
    if (
      kept &&
      current.regions.has(kept) &&
      contains(kept.tab.getBoundingClientRect(), pointer.x, pointer.y)
    ) {
      hovered = kept;
    } else {
      let smallest = Infinity;
      for (const region of current.regions) {
        const { rect } = region;
        if (!rect || !contains(rect, pointer.x, pointer.y)) continue;
        const area = (rect.right - rect.left) * (rect.bottom - rect.top);
        if (
          area < smallest ||
          (area === smallest &&
            region.info.ancestors.length >
              (hovered?.info.ancestors.length ?? -1))
        ) {
          smallest = area;
          hovered = region;
        }
      }
      if (
        !hovered &&
        kept &&
        current.regions.has(kept) &&
        kept.reach &&
        contains(kept.reach, pointer.x, pointer.y)
      )
        hovered = kept;
    }
  }
  const previous = current.hovered;
  current.hovered = hovered;
  if (previous !== hovered) {
    previous?.info.onHover?.(false);
    hovered?.info.onHover?.(true);
  }
  for (const region of current.regions) {
    const on =
      region === hovered ||
      (forcedGroup !== undefined && region.info.groupId === forcedGroup);
    region.box.toggleAttribute("data-hover", on);
    region.tab.toggleAttribute("data-hover", on);
  }
};

/** Highlights every outline of a group, even in hover-only mode, until cleared. */
export const highlightGroup = (group: string | undefined) => {
  if (forcedGroup === group) return;
  forcedGroup = group;
  if (layer) updateHover(layer);
};

const refresh = (current: Layer) => {
  layoutLayer(current);
  updateHover(current);
};

const getLayer = (): Layer => {
  if (layer) return layer;
  const host = document.createElement("div");
  host.setAttribute(OUTLINE_ATTRIBUTE, "");
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  root.append(style);

  const schedule = () => {
    created.frame ??= requestFrame(() => {
      created.frame = undefined;
      refresh(created);
    });
  };
  const onPointerMove = (event: PointerEvent) => {
    created.pointer = { x: event.clientX, y: event.clientY };
    created.hoverFrame ??= requestFrame(() => {
      created.hoverFrame = undefined;
      updateHover(created);
    });
  };
  const onPointerLeave = () => {
    created.pointer = undefined;
    updateHover(created);
  };
  const created: Layer = {
    host,
    root,
    regions: new Set(),
    signature: "",
    hovered: undefined,
    pointer: undefined,
    frame: undefined,
    hoverFrame: undefined,
    schedule,
    dispose() {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
      cancelFrame(created.frame);
      cancelFrame(created.hoverFrame);
      host.remove();
      layer = undefined;
    },
  };
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  document.body.append(host);
  layer = created;
  return created;
};

/** Lays the overlay out now instead of on the next animation frame. */
export const flushOutlines = () => {
  if (!layer) return;
  cancelFrame(layer.frame);
  layer.frame = undefined;
  refresh(layer);
};

export const trackRegion = (
  getNodes: () => Node[],
  info: RegionInfo,
): (() => void) => {
  const current = getLayer();
  const box = document.createElement("div");
  box.className = "box";
  box.dataset["mode"] = info.mode;
  box.toggleAttribute("data-nested", info.ancestors.length > 0);
  const tab = makeTab(info);
  tab.dataset["mode"] = info.mode;
  current.root.append(box, tab);
  const region: Region = {
    getNodes,
    info,
    rect: undefined,
    observed: [],
    parents: [],
    resize:
      typeof ResizeObserver === "function"
        ? new ResizeObserver(current.schedule)
        : undefined,
    mutation:
      typeof MutationObserver === "function"
        ? new MutationObserver(current.schedule)
        : undefined,
    box,
    tab,
  };
  current.regions.add(region);
  current.signature = "";
  refresh(current);

  return () => {
    region.resize?.disconnect();
    region.mutation?.disconnect();
    box.remove();
    tab.remove();
    current.regions.delete(region);
    current.signature = "";
    if (current.hovered === region) {
      current.hovered = undefined;
      region.info.onHover?.(false);
    }
    if (current.regions.size === 0) {
      // Switching variants unmounts the old region and mounts the new one in
      // the same commit, so the layer is only torn down if it stays empty.
      requestFrame(() => {
        if (layer === current && current.regions.size === 0) current.dispose();
      });
      return;
    }
    current.schedule();
  };
};
