import {
  adjacentTabStop,
  deepActiveElement,
  FOCUS_ENTER_EVENT,
  FOCUS_EXIT_EVENT,
  tabbables,
} from "@assistant-ui/remote-components-protocol";

/**
 * Tab across remote boundaries.
 *
 * Remotes report Tab past their first/last stop (`rc/notifications/focus-exit`); the host
 * moves focus to its adjacent stop. If that stop is another remote's
 * iframe, the host enters it at its first/last stop directly, so Tab order
 * is the same in every engine and nothing stops on frame elements.
 */
/** Enters a remote at a stop. Tab moved focus here, so the ring shows (`focusVisible`). */
type Enter = (target: "first" | "last", focusVisible?: boolean) => void;

const frames = new WeakMap<HTMLIFrameElement, Enter>();
let lastTab: { shift: boolean; at: number } | null = null;
/** Iframes the host is focusing itself (ref.focus, focus restore): when. */
const programmatic = new WeakMap<HTMLIFrameElement, number>();
const recorded = new WeakSet<Document>();

/** Registers a remote's iframe so focus can enter it at a stop. */
export function registerFocusTarget(
  iframe: HTMLIFrameElement,
  enter: Enter,
): () => void {
  frames.set(iframe, enter);
  // A runtime in this document (we are nested in a remote) entering us.
  const onEnter = (ev: Event): void => {
    const detail = (
      ev as CustomEvent<{ target?: unknown; focusVisible?: unknown }>
    ).detail;
    const target = detail?.target;
    const visible =
      typeof detail?.focusVisible === "boolean"
        ? detail.focusVisible
        : undefined;
    if (target === "first" || target === "last") enter(target, visible);
  };
  iframe.addEventListener(FOCUS_ENTER_EVENT, onEnter);
  const doc = iframe.ownerDocument;
  if (!recorded.has(doc)) {
    recorded.add(doc);
    doc.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key === "Tab")
          lastTab = { shift: ev.shiftKey, at: performance.now() };
      },
      true,
    );
    // A click ends the Tab that came before it.
    doc.addEventListener("pointerdown", () => (lastTab = null), true);
    // Tab onto a remote: enter it at its first/last stop. Bubble phase on the
    // window, so the page's own key handlers (focus traps) go first.
    doc.defaultView?.addEventListener("keydown", (ev) => {
      if (
        ev.key !== "Tab" ||
        ev.defaultPrevented ||
        ev.altKey ||
        ev.ctrlKey ||
        ev.metaKey
      )
        return;
      const from = deepActiveElement(doc);
      if (from === null || from instanceof HTMLIFrameElement) return;
      const list = tabbables(doc);
      const atBody = from === doc.body || from === doc.documentElement;
      const stop = atBody
        ? ev.shiftKey
          ? list[list.length - 1]
          : list[0]
        : adjacentTabStop(list, from, ev.shiftKey ? "previous" : "next");
      if (!(stop instanceof HTMLIFrameElement) || !frames.has(stop)) return;
      ev.preventDefault();
      focusStop(stop, ev.shiftKey ? "last" : "first");
    });
  }
  return () => {
    iframe.removeEventListener(FOCUS_ENTER_EVENT, onEnter);
    if (frames.get(iframe) === enter) frames.delete(iframe);
  };
}

/** Moves focus from a remote's iframe to the adjacent tab stop of its document. */
export function moveFocusFrom(
  iframe: HTMLIFrameElement,
  direction: "next" | "previous",
): void {
  const doc = iframe.ownerDocument;
  const stop = adjacentTabStop(tabbables(doc), iframe, direction);
  if (stop === null) {
    const win = doc.defaultView;
    if (win !== null && win.parent !== win) {
      // This document is itself a remote: let its runtime continue outward.
      win.dispatchEvent(
        new CustomEvent(FOCUS_EXIT_EVENT, { detail: { direction } }),
      );
    } else {
      // End of the page: leave focus to the browser.
      iframe.blur();
    }
    return;
  }
  // Firefox ignores focus() from the parent while a child frame holds focus,
  // unless the frame is blurred first.
  if (deepActiveElement(doc) === iframe) iframe.blur();
  focusStop(stop, direction === "next" ? "first" : "last");
}

function focusStop(el: HTMLElement, target: "first" | "last"): void {
  const enter = el instanceof HTMLIFrameElement ? frames.get(el) : undefined;
  // Only keyboard navigation (Tab) gets here.
  el.focus({ focusVisible: true } as FocusOptions);
  enter?.(target, true);
}

/**
 * A remote's document gained focus with nothing focused in it (Firefox
 * stops on the frame itself when tabbing in). If a Tab just happened in
 * this document, enter the remote at the matching end.
 */
export function focusEntered(iframe: HTMLIFrameElement): void {
  // The host focused the frame itself and already told the remote where to go.
  const own = programmatic.get(iframe);
  if (own !== undefined && performance.now() - own < 1000) return;
  if (lastTab === null || performance.now() - lastTab.at > 1000) return;
  frames.get(iframe)?.(lastTab.shift ? "last" : "first", true);
}

/**
 * Marks a focus of `iframe` that the host makes itself (it also sends the
 * remote a focus target), so the remote's report that its document got
 * focus is not taken for a Tab.
 */
export function expectFocus(iframe: HTMLIFrameElement): void {
  programmatic.set(iframe, performance.now());
}

/**
 * Scrolls the host's scrollers (and the page) the least amount that makes
 * `rect` (in the frame's viewport coordinates) visible. A no-op when it
 * already is.
 */
export function revealRect(
  iframe: HTMLIFrameElement,
  rect: { x: number; y: number; width: number; height: number },
): void {
  const parent = iframe.offsetParent ?? iframe.parentElement;
  if (parent === null) return;
  const doc = iframe.ownerDocument;
  const probe = doc.createElement("div");
  // iframe coordinates relative to its offset parent (the sizer).
  probe.style.cssText = `position:absolute;pointer-events:none;visibility:hidden;left:${iframe.offsetLeft + rect.x}px;top:${iframe.offsetTop + rect.y}px;width:${Math.max(1, rect.width)}px;height:${Math.max(1, rect.height)}px`;
  parent.appendChild(probe);
  probe.scrollIntoView({ block: "nearest", inline: "nearest" });
  probe.remove();
}
