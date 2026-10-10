import { Component, type ReactNode } from "react";

export type Rect = { top: number; left: number; right: number; bottom: number };

type Fiber = {
  tag: number;
  stateNode: unknown;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
};

const HOST_PORTAL = 4;

const collect = (fiber: Fiber | null, out: Set<Node>) => {
  for (let current = fiber; current; current = current.sibling) {
    if (current.tag === HOST_PORTAL) continue;
    if (current.stateNode instanceof Node) out.add(current.stateNode);
    else collect(current.child, out);
  }
};

const byDocumentOrder = (a: Node, b: Node) =>
  a === b
    ? 0
    : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;

/**
 * Renders its children with no DOM of its own and reports the top-level DOM
 * nodes they produced, so a variant can be measured without a wrapper element.
 */
export class NodeRange extends Component<{ children?: ReactNode }> {
  nodes(): Node[] {
    // React keeps the committed tree on one of a fiber pair; reading both and
    // keeping connected nodes avoids depending on which one is current.
    const fiber = (this as unknown as { _reactInternals?: Fiber })
      ._reactInternals;
    if (!fiber) return [];
    const found = new Set<Node>();
    collect(fiber.child, found);
    if (fiber.alternate) collect(fiber.alternate.child, found);
    return [...found].filter((node) => node.isConnected).sort(byDocumentOrder);
  }

  override render() {
    return this.props.children;
  }
}

const union = (a: Rect | undefined, b: Rect): Rect =>
  a
    ? {
        top: Math.min(a.top, b.top),
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
        bottom: Math.max(a.bottom, b.bottom),
      }
    : { top: b.top, left: b.left, right: b.right, bottom: b.bottom };

const addRects = (result: Rect | undefined, rects: Iterable<DOMRect>) => {
  let next = result;
  for (const rect of rects) {
    if (rect.width > 0 || rect.height > 0) next = union(next, rect);
  }
  return next;
};

const textRects = (node: Text): DOMRect[] => {
  if (!node.textContent?.trim()) return [];
  const range = document.createRange();
  if (typeof range.getClientRects !== "function") return [];
  range.selectNodeContents(node);
  return Array.from(range.getClientRects());
};

const REPLACED =
  /^(img|svg|video|canvas|iframe|embed|object|picture|input|button|select|textarea|hr|progress|meter)$/i;

const transparent = (color: string) =>
  color === "transparent" ||
  /^rgba\([^)]*,\s*0(?:\.0*)?\)$|\/\s*0(?:\.0*)?\)$/.test(color);

/** Whether an element paints a box of its own, so its border box is visible. */
const paintsBox = (element: Element, style: CSSStyleDeclaration) =>
  REPLACED.test(element.tagName) ||
  !transparent(style.backgroundColor || "transparent") ||
  (style.backgroundImage !== "" && style.backgroundImage !== "none") ||
  (style.boxShadow !== "" && style.boxShadow !== "none") ||
  ["Top", "Right", "Bottom", "Left"].some(
    (side) =>
      (Number.parseFloat(
        style.getPropertyValue(`border-${side.toLowerCase()}-width`),
      ) || 0) > 0 &&
      style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none",
  );

/**
 * Unions what the given nodes visibly paint: border boxes of elements that
 * draw a box, line boxes of text, and the contents of transparent wrappers
 * (including `display: contents`), so a frame hugs a button or a short line
 * rather than the full-width block around it.
 */
export const measureNodes = (
  nodes: readonly Node[],
  observed: Element[] = [],
): Rect | undefined => {
  // Counts content left out because it is hidden, so a transparent wrapper
  // around only hidden content doesn't fall back to its full layout box.
  let omitted = 0;
  const visit = (node: Node, hidden: boolean): Rect | undefined => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!hidden) return addRects(undefined, textRects(node as Text));
      if (node.textContent?.trim()) omitted++;
      return undefined;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return undefined;
    const element = node as Element;
    const style = getComputedStyle(element);
    if (style.display === "none") return undefined;
    if (style.display !== "contents") observed.push(element);
    const invisible =
      style.visibility === "hidden" || style.visibility === "collapse";
    if (!invisible && style.display !== "contents" && paintsBox(element, style))
      return addRects(undefined, element.getClientRects());
    const before = omitted;
    let inner: Rect | undefined;
    for (const child of Array.from(element.childNodes)) {
      const rect = visit(child, invisible);
      if (rect) inner = union(inner, rect);
    }
    if (inner || style.display === "contents" || omitted > before) return inner;
    if (invisible) {
      omitted++;
      return undefined;
    }
    return addRects(undefined, element.getClientRects());
  };
  let result: Rect | undefined;
  for (const node of nodes) {
    const rect = visit(node, false);
    if (rect) result = union(result, rect);
  }
  return result;
};

const pageGroups = new Map<string, () => Node[]>();

/** Records where a mounted group's nodes are on the page. */
export const registerGroupNodes = (group: string, nodes: () => Node[]) => {
  if (!pageGroups.has(group)) pageGroups.set(group, nodes);
  return () => {
    if (pageGroups.get(group) === nodes) pageGroups.delete(group);
  };
};

export const groupNodes = (group: string): Node[] =>
  pageGroups.get(group)?.() ?? [];
