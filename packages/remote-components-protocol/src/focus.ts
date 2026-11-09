/**
 * Sequential focus order, shared by host and remote so both sides agree on
 * where Tab goes when it crosses a frame boundary.
 *
 * Order: elements with a positive `tabindex` first (ascending, document
 * order for ties), then `tabindex=0` elements in document order. Open
 * shadow roots are walked in place of their host's children, and slots in
 * place of what is assigned to them (closed roots are invisible). A radio
 * group is one stop, as in browsers: its checked radio, or its first radio
 * when none is checked.
 */
const TABBABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, summary, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';

function visible(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false;
  const check = (
    el as HTMLElement & { checkVisibility?: (o: object) => boolean }
  ).checkVisibility;
  if (check !== undefined) return check.call(el, { visibilityProperty: true });
  return (
    el.ownerDocument.defaultView?.getComputedStyle(el).visibility !== "hidden"
  );
}

/** The focused element, followed into open shadow roots. */
export function deepActiveElement(doc: Document): Element | null {
  let a = doc.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

/** Tabbable candidates under `root` in flat tree order (see `tabbables`). */
function collect(root: ParentNode, out: HTMLElement[]): void {
  for (let el = root.firstElementChild; el !== null; el = el.nextElementSibling)
    visit(el, out);
}

function visit(el: Element, out: HTMLElement[]): void {
  if (el.matches(TABBABLE)) out.push(el as HTMLElement);
  if (el.tagName === "SLOT") {
    const assigned = (el as HTMLSlotElement).assignedElements();
    if (assigned.length > 0) {
      for (const a of assigned) visit(a, out);
      return;
    }
  }
  const shadow = el.shadowRoot;
  // Light children of a shadow host appear only through its slots.
  if (shadow !== null) collect(shadow, out);
  else collect(el, out);
}

/** `inert` on the element or an ancestor, across shadow boundaries. */
function inert(el: Element): boolean {
  for (let n: Element | null = el; n !== null;) {
    const hit = n.closest("[inert]");
    if (hit !== null) return true;
    // A shadow root (checked by shape: it may belong to another realm).
    const root = n.getRootNode() as Node & { host?: Element };
    n = root.nodeType === 11 && root.host !== undefined ? root.host : null;
  }
  return false;
}

/** Key of the radio group `el` belongs to, or null if it is not a named radio. */
function radioGroup(el: Element): string | null {
  if (el.tagName !== "INPUT") return null;
  const input = el as HTMLInputElement;
  if (input.type !== "radio" || input.name === "") return null;
  return `${input.form === null ? "" : formId(input.form)}\u0000${input.name}`;
}

const formIds = new WeakMap<HTMLFormElement, number>();
let nextFormId = 1;
function formId(form: HTMLFormElement): number {
  let id = formIds.get(form);
  if (id === undefined) formIds.set(form, (id = nextFormId++));
  return id;
}

/** True when `a` and `b` are the same tab stop (the same element, or radios of one group). */
export function sameTabStop(
  a: Element | null,
  b: Element | null | undefined,
): boolean {
  if (a === null || b === null || b === undefined) return false;
  if (a === b) return true;
  const g = radioGroup(a);
  return g !== null && g === radioGroup(b);
}

/** Tabbable elements of `root` in sequential focus order. */
export function tabbables(root: Document | Element): HTMLElement[] {
  const found: HTMLElement[] = [];
  collect(root, found);
  const candidates = found.filter(
    (el) =>
      el.tabIndex >= 0 &&
      !inert(el) &&
      !(el as HTMLElement & { disabled?: boolean }).disabled &&
      visible(el),
  );
  // One stop per radio group: the checked radio, else the first one.
  const groupStop = new Map<string, HTMLElement>();
  for (const el of candidates) {
    const g = radioGroup(el);
    if (g === null) continue;
    const cur = groupStop.get(g);
    if (
      cur === undefined ||
      (!(cur as HTMLInputElement).checked && (el as HTMLInputElement).checked)
    )
      groupStop.set(g, el);
  }
  const all =
    groupStop.size === 0
      ? candidates
      : candidates.filter((el) => {
          const g = radioGroup(el);
          return g === null || groupStop.get(g) === el;
        });
  const positive = all
    .filter((el) => el.tabIndex > 0)
    .sort((a, b) => a.tabIndex - b.tabIndex);
  return positive.length === 0
    ? all
    : [...positive, ...all.filter((el) => el.tabIndex === 0)];
}

/** The tab stop after (`next`) or before (`previous`) `from` in `list`, or null at the ends. */
export function adjacentTabStop(
  list: readonly HTMLElement[],
  from: Element,
  direction: "next" | "previous",
): HTMLElement | null {
  let i = list.findIndex((el) => sameTabStop(from, el));
  if (i === -1) {
    // `from` is not itself a stop (hidden, or a container): place it by document order.
    i = list.findIndex(
      (el) =>
        (from.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0 && !from.contains(el),
    );
    if (i === -1) i = list.length;
    return direction === "next" ? (list[i] ?? null) : (list[i - 1] ?? null);
  }
  return list[direction === "next" ? i + 1 : i - 1] ?? null;
}

/** Internal DOM event: a nested host dispatches it on its window when Tab leaves its last remote with nowhere to go in its document. Not public API. */
export const FOCUS_EXIT_EVENT = "rc/focus-exit";

/**
 * Internal DOM event, dispatched on a remote's iframe element to enter it at its first/last
 * stop (`detail.target`). The host that owns the iframe handles it; a
 * runtime uses it when its own first/last stop is a nested remote.
 */
export const FOCUS_ENTER_EVENT = "rc/focus-enter";
