import { NAME } from "./name";

export const OUTLINE_ATTRIBUTE = `data-${NAME}-outlines`;

export type RegionInfo = {
  label: string;
  onActivate: () => void;
};

type Rect = { top: number; left: number; right: number; bottom: number };

const INSET = 4;

const CSS = `
:host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; }
.box {
  --tape: #b45309; --tape-fg: #ffffff;
  position: absolute; box-sizing: border-box; pointer-events: none;
  border: 1.5px dashed var(--tape); border-radius: 4px;
}
.box[data-empty] { visibility: hidden; }
@media (prefers-color-scheme: dark) {
  .box { --tape: #f59e0b; --tape-fg: #1c1917; }
}
button {
  all: unset; position: absolute; left: -1.5px; bottom: 100%; pointer-events: auto; cursor: pointer;
  max-width: max(120px, 100%); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0;
  padding: 3px 6px; border-radius: 4px 4px 0 0;
  background: var(--tape); color: var(--tape-fg);
}
.box[data-label-inside] button { bottom: auto; top: 0; border-radius: 0 0 4px 0; }
button:focus-visible { outline: 2px solid var(--tape); outline-offset: 2px; }
`;

const textRect = (node: Text): Rect | undefined => {
  if (!node.textContent?.trim()) return undefined;
  const range = document.createRange();
  if (typeof range.getBoundingClientRect !== "function") return undefined;
  range.selectNodeContents(node);
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : undefined;
};

export const measureRegion = (
  wrapper: Element,
  observed: Element[] = [],
): Rect | undefined => {
  let union: Rect | undefined;
  const add = (rect: Rect) => {
    union = union
      ? {
          top: Math.min(union.top, rect.top),
          left: Math.min(union.left, rect.left),
          right: Math.max(union.right, rect.right),
          bottom: Math.max(union.bottom, rect.bottom),
        }
      : {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
        };
  };
  const visit = (parent: Node) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const rect = textRect(node as Text);
        if (rect) add(rect);
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
      if (rect.width || rect.height) add(rect);
    }
  };
  visit(wrapper);
  return union;
};

type Region = {
  wrapper: Element;
  box: HTMLElement;
  resize: ResizeObserver | undefined;
  observed: Element[];
  mutation: MutationObserver | undefined;
};

type Layer = {
  host: HTMLElement;
  root: ShadowRoot;
  regions: Set<Region>;
  frame: number | undefined;
  schedule: () => void;
  dispose: () => void;
};

let layer: Layer | undefined;

const place = (region: Region) => {
  const observed: Element[] = [];
  const rect = measureRegion(region.wrapper, observed);
  const changed =
    observed.length !== region.observed.length ||
    observed.some((element, index) => element !== region.observed[index]);
  if (changed) {
    region.observed = observed;
    region.resize?.disconnect();
    for (const element of observed) region.resize?.observe(element);
  }
  const { box } = region;
  if (!rect) {
    box.setAttribute("data-empty", "");
    return;
  }
  box.removeAttribute("data-empty");
  box.style.top = `${rect.top - INSET}px`;
  box.style.left = `${rect.left - INSET}px`;
  box.style.width = `${rect.right - rect.left + INSET * 2}px`;
  box.style.height = `${rect.bottom - rect.top + INSET * 2}px`;
  box.toggleAttribute("data-label-inside", rect.top - INSET < 16);
};

const getLayer = (): Layer => {
  if (layer) return layer;
  const host = document.createElement("div");
  host.setAttribute(OUTLINE_ATTRIBUTE, "");
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  root.append(style);

  const update = () => {
    created.frame = undefined;
    for (const region of created.regions) place(region);
  };
  const schedule = () => {
    if (created.frame !== undefined) return;
    created.frame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(update)
        : (setTimeout(update, 16) as unknown as number);
  };
  const created: Layer = {
    host,
    root,
    regions: new Set(),
    frame: undefined,
    schedule,
    dispose() {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (created.frame !== undefined) {
        if (typeof cancelAnimationFrame === "function")
          cancelAnimationFrame(created.frame);
        clearTimeout(created.frame);
      }
      host.remove();
      layer = undefined;
    },
  };
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  document.body.append(host);
  layer = created;
  return created;
};

export const trackRegion = (
  wrapper: Element,
  info: RegionInfo,
): (() => void) => {
  const current = getLayer();
  const box = document.createElement("div");
  box.className = "box";
  const button = document.createElement("button");
  button.type = "button";
  button.tabIndex = -1;
  button.textContent = info.label;
  button.title = `${info.label}: show in the variant switcher`;
  button.addEventListener("click", () => info.onActivate());
  box.append(button);
  current.root.append(box);

  const region: Region = {
    wrapper,
    box,
    resize:
      typeof ResizeObserver === "function"
        ? new ResizeObserver(current.schedule)
        : undefined,
    observed: [],
    mutation:
      typeof MutationObserver === "function"
        ? new MutationObserver(current.schedule)
        : undefined,
  };
  region.mutation?.observe(wrapper, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  current.regions.add(region);
  place(region);

  return () => {
    region.resize?.disconnect();
    region.mutation?.disconnect();
    box.remove();
    current.regions.delete(region);
    if (current.regions.size === 0) current.dispose();
  };
};
