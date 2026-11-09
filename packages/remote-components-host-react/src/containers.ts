import type { ContainerInfo } from "@assistant-ui/remote-components-protocol";

/**
 * The slot's nearest query containers (the slot itself counts, as in the
 * reference model the component's content is inside it), nearest first, at
 * most two. Sizes are content-box sizes, as container queries see them.
 * `found` collects the container elements.
 */
export function readContainers(
  slot: Element,
  found?: Element[],
): ContainerInfo[] {
  const win = slot.ownerDocument.defaultView;
  const out: ContainerInfo[] = [];
  if (win === null) return out;
  for (
    let el: Element | null = slot;
    el !== null && out.length < 2;
    el = el.parentElement
  ) {
    const cs = win.getComputedStyle(el);
    const tokens = (cs.containerType || "normal").split(/\s+/);
    const type = tokens.includes("size")
      ? "size"
      : tokens.includes("inline-size")
        ? "inline-size"
        : null;
    if (type === null) continue;
    const px = (v: string): number => parseFloat(v) || 0;
    const r = el.getBoundingClientRect();
    const bx = px(cs.borderLeftWidth) + px(cs.borderRightWidth);
    const by = px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const he = el as HTMLElement;
    // Scrollbars take room from the content box.
    const sbx = Math.max(0, he.offsetWidth - he.clientWidth - bx);
    const sby = Math.max(0, he.offsetHeight - he.clientHeight - by);
    const width = Math.max(
      0,
      r.width - bx - px(cs.paddingLeft) - px(cs.paddingRight) - sbx,
    );
    const height = Math.max(
      0,
      r.height - by - px(cs.paddingTop) - px(cs.paddingBottom) - sby,
    );
    const name = cs.containerName === "none" ? "" : cs.containerName;
    out.push({ width, height: type === "size" ? height : null, name, type });
    found?.push(el);
  }
  return out;
}
