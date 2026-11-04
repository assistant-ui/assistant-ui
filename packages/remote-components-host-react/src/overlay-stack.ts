import { createContext } from "react";
import type {
  DismissReason,
  OverlayKind,
} from "@assistant-ui/remote-components-protocol";

/**
 * Page-wide stack of open overlays, across all remote component instances.
 * Used for:
 *   - Escape: closes the topmost overlay (or the frame's own topmost one);
 *   - outside interaction: a pointer-down anywhere closes every popover
 *     that does not contain it (directly or through nested overlays);
 *   - modality: while a dialog is open, the rest of the page is `inert`.
 */
export interface OverlayEntry {
  id: string;
  kind: OverlayKind;
  /** The overlay this one was opened from (its owner frame lives inside it), if any. */
  parent: OverlayEntry | null;
  /** Token of the frame that opened this overlay. */
  owner: object;
  /** Token of the frame rendering this overlay's content. */
  content: object;
  /** Host container element (for host-document pointer events). */
  container: () => HTMLElement | null;
  dismiss(reason: DismissReason): void;
}

/** The overlay the current subtree is rendered in (null in the base layer). */
export const OverlayContext = createContext<OverlayEntry | null>(null);

const stack: OverlayEntry[] = [];
let listenersInstalled = false;

export function pushOverlay(entry: OverlayEntry): () => void {
  stack.push(entry);
  installListeners();
  if (entry.kind === "dialog") updateInert();
  return () => {
    const i = stack.indexOf(entry);
    if (i !== -1) stack.splice(i, 1);
    if (entry.kind === "dialog") updateInert();
  };
}

export function topOverlay(): OverlayEntry | null {
  return stack[stack.length - 1] ?? null;
}

function isAncestorOrSelf(
  candidate: OverlayEntry,
  of: OverlayEntry | null,
): boolean {
  for (let e = of; e !== null; e = e.parent) if (e === candidate) return true;
  return false;
}

/**
 * A pointer went down inside `within` (null = base layer / host page).
 * Dismisses every popover that is not `within` or one of its ancestors.
 * `keepIds`: popovers whose anchor was the target (the owner toggles them).
 */
export function interactionInside(
  within: OverlayEntry | null,
  keepIds: readonly string[] = [],
  owner: object | null = null,
): void {
  for (const e of [...stack].reverse()) {
    if (e.kind !== "popover") continue;
    if (isAncestorOrSelf(e, within)) continue;
    if (owner !== null && e.owner === owner && keepIds.includes(e.id)) continue;
    e.dismiss("outside");
  }
}

/** Escape pressed in the frame `frame` (rendered inside overlay `within`). */
export function escapeInFrame(
  frame: object,
  within: OverlayEntry | null,
): void {
  for (let i = stack.length - 1; i >= 0; i--) {
    const e = stack[i]!;
    if (e.owner === frame) {
      e.dismiss("escape");
      return;
    }
  }
  if (within !== null && within.content === frame) within.dismiss("escape");
}

function installListeners(): void {
  if (listenersInstalled || typeof document === "undefined") return;
  listenersInstalled = true;
  document.addEventListener(
    "pointerdown",
    (ev) => {
      if (stack.length === 0) return;
      const target = ev.target instanceof Element ? ev.target : null;
      const container =
        target?.closest<HTMLElement>("[data-rc-overlay]") ?? null;
      const entry =
        container === null
          ? null
          : (stack.find((e) => e.container() === container) ?? null);
      if (
        entry !== null &&
        entry.kind === "dialog" &&
        target?.hasAttribute("data-rc-backdrop") === true
      ) {
        // Backdrop click: outside the dialog.
        interactionInside(entry.parent);
        entry.dismiss("outside");
        return;
      }
      interactionInside(entry);
    },
    true,
  );
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || ev.defaultPrevented) return;
    const top = topOverlay();
    if (top === null) return;
    ev.preventDefault();
    top.dismiss("escape");
  });
}

const inertByUs = new Set<Element>();

/** Makes everything except the topmost dialog's subtree inert. */
function updateInert(): void {
  if (typeof document === "undefined") return;
  for (const el of inertByUs) el.removeAttribute("inert");
  inertByUs.clear();
  const dialogs = stack.filter((e) => e.kind === "dialog");
  const top = dialogs[dialogs.length - 1];
  if (top === undefined) return;
  const keep = top.container();
  if (keep === null) return;
  // Overlays above the top dialog (its popovers) stay interactive too.
  const keepSet = new Set<Element>([keep]);
  for (const e of stack.slice(stack.indexOf(top) + 1)) {
    const c = e.container();
    if (c !== null) keepSet.add(c);
  }
  for (const child of document.body.children) {
    if ([...keepSet].some((k) => child === k || child.contains(k))) continue;
    if (child.hasAttribute("inert")) continue;
    child.setAttribute("inert", "");
    inertByUs.add(child);
  }
}

/** Re-applies inertness after containers mount (called by dialog views). */
export function refreshInert(): void {
  updateInert();
}
