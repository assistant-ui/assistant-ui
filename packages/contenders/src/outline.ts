import { NAME } from "./name";

export const OUTLINE_ATTRIBUTE = `data-${NAME}-outlines`;

export type RegionInfo = {
  /** Stable id of the `<Variants>` instance that rendered this region. */
  instance: string;
  group: string;
  variant: string;
  position: string;
  count: number;
  /** In show-all mode a group's regions share one frame. */
  showAll: boolean;
  /** `always` draws the outline and tab; `hover` reveals them only while the pointer is over the region. */
  mode: "always" | "hover";
  onActivate: () => void;
};

export type Rect = { top: number; left: number; right: number; bottom: number };

export type FrameInput = {
  key: string;
  content: Rect;
  /** Keys of frames whose content contains this frame (nested `<Variants>`). */
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
 * past other tabs and obstacles such as in-page captions.
 */
export const layoutFrames = (
  frames: readonly FrameInput[],
  viewport: { width: number; height: number },
  obstacles: readonly Rect[] = [],
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
    const limit = Math.max(box.right, box.left + width) + 0.5;
    const slide = (top: number, start: number) => {
      let left = start;
      for (let tries = 0; tries < 50; tries++) {
        const rect = rectOf({ left, top });
        if (offscreen(rect) || rect.right > limit) return undefined;
        const hit = [...placed, ...obstacles].find((other) =>
          intersects(rect, other, 2),
        );
        if (!hit) return { left, top };
        left = hit.right + 6;
      }
      return undefined;
    };
    const inside = { left: box.left + TAB_INSET, top: box.top + TAB_INSET };
    let spot =
      slide(box.top - height - TAB_GAP, box.left) ??
      slide(inside.top, inside.left) ??
      slide(box.bottom + TAB_GAP, box.left);
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
  --stroke: rgb(217 119 6 / 0.7); --stroke-strong: #d97706; --stroke-soft: rgb(217 119 6 / 0.4);
  --tab-bg: #ffffff; --tab-border: #e4e4e7; --fg: #18181b; --fg-muted: #71717a; --accent: #d97706;
}
@media (prefers-color-scheme: dark) {
  :host {
    --stroke: rgb(251 191 36 / 0.6); --stroke-strong: #fbbf24; --stroke-soft: rgb(251 191 36 / 0.35);
    --tab-bg: #18181b; --tab-border: #3f3f46; --fg: #fafafa; --fg-muted: #a1a1aa; --accent: #fbbf24;
  }
}
.box {
  position: absolute; box-sizing: border-box; pointer-events: none;
  border: 1px dashed var(--stroke); border-radius: 8px;
}
.box[data-hover] { border-color: var(--stroke-strong); }
.sep { position: absolute; height: 0; border-top: 1px dashed var(--stroke-soft); pointer-events: none; }
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
  border: 1px solid var(--tab-border); border-radius: 6px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 2px 8px -2px rgb(0 0 0 / 0.08);
}
.tab::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
.chip { height: 18px; line-height: 18px; padding: 0 6px; gap: 4px; box-shadow: none; }
.chip[data-active] { border-color: var(--stroke-strong); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.muted { color: var(--fg-muted); }
.name { overflow: hidden; text-overflow: ellipsis; }
[data-mode="hover"]:not([data-hover]) { opacity: 0; visibility: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .box, .chip { transition: border-color 150ms ease, opacity 150ms ease, visibility 150ms; }
  .tab, .sep { transition: opacity 150ms ease, visibility 150ms; }
}
`;

const textRect = (node: Text): Rect | undefined => {
  if (!node.textContent?.trim()) return undefined;
  const range = document.createRange();
  if (typeof range.getBoundingClientRect !== "function") return undefined;
  range.selectNodeContents(node);
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : undefined;
};

const union = (a: Rect | undefined, b: Rect): Rect =>
  a
    ? {
        top: Math.min(a.top, b.top),
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
        bottom: Math.max(a.bottom, b.bottom),
      }
    : { top: b.top, left: b.left, right: b.right, bottom: b.bottom };

export const measureRegion = (
  wrapper: Element,
  observed: Element[] = [],
): Rect | undefined => {
  let result: Rect | undefined;
  const visit = (parent: Node) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const rect = textRect(node as Text);
        if (rect) result = union(result, rect);
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const element = node as Element;
      if (getComputedStyle(element).display === "contents") {
        visit(element);
        continue;
      }
      observed.push(element);
      const rect = element.getBoundingClientRect();
      if (rect.width || rect.height) result = union(result, rect);
    }
  };
  visit(wrapper);
  return result;
};

type Region = {
  wrapper: Element;
  info: RegionInfo;
  rect: Rect | undefined;
  observed: Element[];
  resize: ResizeObserver | undefined;
  mutation: MutationObserver | undefined;
  chip: HTMLButtonElement | undefined;
  sep: HTMLElement | undefined;
};

type Frame = {
  key: string;
  regions: Region[];
  box: HTMLElement;
  tab: HTMLButtonElement;
};

type Layer = {
  host: HTMLElement;
  root: ShadowRoot;
  regions: Set<Region>;
  frames: Map<string, Frame>;
  signature: string;
  hovered: Region | undefined;
  pointer: { x: number; y: number } | undefined;
  frame: number | undefined;
  hoverFrame: number | undefined;
  schedule: () => void;
  dispose: () => void;
};

let layer: Layer | undefined;

const requestFrame = (callback: () => void): number =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(callback)
    : (setTimeout(callback, 16) as unknown as number);

const cancelFrame = (frame: number | undefined) => {
  if (frame === undefined) return;
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
  clearTimeout(frame);
};

const makeButton = (
  className: string,
  parts: [string, string][],
  onActivate: () => void,
): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.tabIndex = -1;
  for (const [text, name] of parts) {
    const span = document.createElement("span");
    span.className = name;
    span.textContent = text;
    button.append(span);
  }
  const label = parts.map(([text]) => text).join("");
  button.setAttribute("aria-label", `${label}: show in the variant switcher`);
  button.title = "Show in the variant switcher";
  button.addEventListener("click", onActivate);
  return button;
};

const frameKey = (region: Region) =>
  region.info.showAll
    ? `group:${region.info.instance}`
    : `variant:${region.info.instance}:${region.info.position}`;

const setMode = (elements: (HTMLElement | undefined)[], mode: string) => {
  for (const element of elements) if (element) element.dataset["mode"] = mode;
};

const byPosition = (a: Region, b: Region) =>
  Number.parseInt(a.info.position, 10) - Number.parseInt(b.info.position, 10);

const syncFrames = (current: Layer) => {
  const grouped = new Map<string, Region[]>();
  for (const region of current.regions) {
    const key = frameKey(region);
    grouped.set(key, [...(grouped.get(key) ?? []), region]);
  }
  for (const [key, frame] of current.frames) {
    if (grouped.has(key)) continue;
    frame.box.remove();
    frame.tab.remove();
    current.frames.delete(key);
  }
  for (const [key, regions] of grouped) {
    regions.sort(byPosition);
    const first = regions[0]!;
    const label: [string, string][] = first.info.showAll
      ? [
          [first.info.group, "muted"],
          [" · ", "muted"],
          [`all ${first.info.count}`, "name"],
        ]
      : [
          [first.info.group, "muted"],
          [" · ", "muted"],
          [first.info.variant, "name"],
          [" · ", "muted"],
          [first.info.position, "muted"],
        ];
    const text = label.map(([value]) => value).join("");
    let frame = current.frames.get(key);
    if (!frame || frame.tab.textContent !== text) {
      frame?.tab.remove();
      const box = frame?.box ?? document.createElement("div");
      box.className = "box";
      const tab = makeButton("tab", label, () =>
        current.frames.get(key)?.regions[0]?.info.onActivate(),
      );
      if (!frame) current.root.append(box);
      current.root.append(tab);
      frame = { key, regions, box, tab };
      current.frames.set(key, frame);
    }
    frame.regions = regions;
    setMode([frame.box, frame.tab], first.info.mode);
    for (const region of regions) {
      if (!region.info.showAll) continue;
      if (!region.chip) {
        region.chip = makeButton(
          "chip",
          [
            [region.info.variant, "name"],
            [" · ", "muted"],
            [region.info.position, "muted"],
          ],
          () => region.info.onActivate(),
        );
        current.root.append(region.chip);
      }
      if (region !== first && !region.sep) {
        region.sep = document.createElement("div");
        region.sep.className = "sep";
        current.root.append(region.sep);
      }
      if (region === first && region.sep) {
        region.sep.remove();
        region.sep = undefined;
      }
      setMode([region.chip, region.sep], region.info.mode);
    }
  }
};

const measure = (region: Region) => {
  const observed: Element[] = [];
  region.rect = measureRegion(region.wrapper, observed);
  const changed =
    observed.length !== region.observed.length ||
    observed.some((element, index) => element !== region.observed[index]);
  if (changed) {
    region.observed = observed;
    region.resize?.disconnect();
    for (const element of observed) region.resize?.observe(element);
  }
};

const layoutLayer = (current: Layer) => {
  for (const region of current.regions) measure(region);
  const frames = [...current.frames.values()];
  const contents = new Map<string, Rect | undefined>();
  for (const frame of frames) {
    let rect: Rect | undefined;
    for (const region of frame.regions)
      if (region.rect) rect = union(rect, region.rect);
    contents.set(frame.key, rect);
  }
  const inputs: FrameInput[] = [];
  for (const frame of frames) {
    const content = contents.get(frame.key);
    frame.box.toggleAttribute("data-empty", !content);
    frame.tab.toggleAttribute("data-empty", !content);
    for (const region of frame.regions) {
      region.chip?.toggleAttribute("data-empty", !region.rect);
      region.sep?.toggleAttribute("data-empty", !region.rect);
    }
    if (!content) continue;
    const wrapper = frame.regions[0]!.wrapper;
    inputs.push({
      key: frame.key,
      content,
      ancestors: frames
        .filter(
          (other) =>
            other !== frame &&
            contents.get(other.key) !== undefined &&
            other.regions.some(
              (region) =>
                region.wrapper !== wrapper && region.wrapper.contains(wrapper),
            ),
        )
        .map((other) => other.key),
      tab: {
        width: frame.tab.offsetWidth,
        height: frame.tab.offsetHeight || 20,
      },
      quiet: frame.regions[0]!.info.mode === "hover",
    });
  }
  const obstacles: Rect[] = [];
  for (const frame of frames) {
    const content = contents.get(frame.key);
    if (!content) continue;
    const regions = frame.regions.filter((region) => region.rect);
    regions.forEach((region, index) => {
      for (const caption of region.wrapper.querySelectorAll(
        "[data-variant-caption]",
      ))
        obstacles.push(caption.getBoundingClientRect());
      if (!region.chip) return;
      const height = region.chip.offsetHeight || 18;
      const line =
        index === 0
          ? content.top
          : (regions[index - 1]!.rect!.bottom + region.rect!.top) / 2;
      obstacles.push({
        top: line - height,
        bottom: line + height,
        left: content.right - region.chip.offsetWidth - 16,
        right: content.right + 8,
      });
    });
  }
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const signature = JSON.stringify([
    inputs,
    viewport,
    obstacles,
    frames.map((frame) =>
      frame.regions.map((region) => [region.rect, region.chip?.offsetWidth]),
    ),
  ]);
  if (signature === current.signature) return;
  current.signature = signature;

  for (const placed of layoutFrames(inputs, viewport, obstacles)) {
    const frame = current.frames.get(placed.key)!;
    const { box } = placed;
    frame.box.style.top = `${box.top}px`;
    frame.box.style.left = `${box.left}px`;
    frame.box.style.width = `${box.right - box.left}px`;
    frame.box.style.height = `${box.bottom - box.top}px`;
    frame.tab.style.transform = `translate(${placed.tab.left}px, ${placed.tab.top}px)`;
    const regions = frame.regions.filter((region) => region.rect);
    regions.forEach((region, index) => {
      if (!region.chip) return;
      const height = region.chip.offsetHeight || 18;
      const line =
        index === 0
          ? box.top
          : (regions[index - 1]!.rect!.bottom + region.rect!.top) / 2;
      if (region.sep) {
        region.sep.style.top = `${line}px`;
        region.sep.style.left = `${box.left}px`;
        region.sep.style.width = `${box.right - box.left}px`;
      }
      const top = index === 0 ? box.top + TAB_INSET : line - height / 2;
      const left = box.right - region.chip.offsetWidth - 8;
      region.chip.style.transform = `translate(${left}px, ${top}px)`;
    });
  }
};

const contains = (rect: Rect | DOMRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const frameOf = (current: Layer, region: Region | undefined) =>
  region ? current.frames.get(frameKey(region)) : undefined;

const updateHover = (current: Layer) => {
  const pointer = current.pointer;
  let hovered: Region | undefined;
  if (pointer) {
    const kept = frameOf(current, current.hovered);
    const overControl =
      kept !== undefined &&
      [kept.tab, ...kept.regions.map((region) => region.chip)].some(
        (element) =>
          element !== undefined &&
          contains(element.getBoundingClientRect(), pointer.x, pointer.y),
      );
    if (overControl) hovered = current.hovered;
    else {
      let smallest = Infinity;
      for (const region of current.regions) {
        const { rect } = region;
        if (!rect || !contains(rect, pointer.x, pointer.y)) continue;
        const area = (rect.right - rect.left) * (rect.bottom - rect.top);
        if (area < smallest) {
          smallest = area;
          hovered = region;
        }
      }
    }
  }
  current.hovered = hovered;
  const active = frameOf(current, hovered);
  for (const frame of current.frames.values()) {
    const on = frame === active;
    frame.box.toggleAttribute("data-hover", on);
    frame.tab.toggleAttribute("data-hover", on);
    for (const region of frame.regions) {
      region.chip?.toggleAttribute("data-hover", on);
      region.sep?.toggleAttribute("data-hover", on);
      region.chip?.toggleAttribute("data-active", region === hovered);
    }
  }
};

const refresh = (current: Layer) => {
  syncFrames(current);
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
    frames: new Map(),
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
  wrapper: Element,
  info: RegionInfo,
): (() => void) => {
  const current = getLayer();
  const region: Region = {
    wrapper,
    info,
    rect: undefined,
    observed: [],
    resize:
      typeof ResizeObserver === "function"
        ? new ResizeObserver(current.schedule)
        : undefined,
    mutation:
      typeof MutationObserver === "function"
        ? new MutationObserver(current.schedule)
        : undefined,
    chip: undefined,
    sep: undefined,
  };
  region.mutation?.observe(wrapper, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  current.regions.add(region);
  current.signature = "";
  refresh(current);

  return () => {
    region.resize?.disconnect();
    region.mutation?.disconnect();
    region.chip?.remove();
    region.sep?.remove();
    current.regions.delete(region);
    current.signature = "";
    if (current.hovered === region) current.hovered = undefined;
    if (current.regions.size === 0) {
      current.dispose();
      return;
    }
    current.schedule();
  };
};
