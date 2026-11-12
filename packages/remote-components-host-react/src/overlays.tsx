import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type {
  DismissReason,
  OverlayOpenParams,
  OverlayUpdateParams,
  Rect,
  SizeReport,
} from "@assistant-ui/remote-components-protocol";
import {
  OverlayContext,
  pushOverlay,
  refreshInert,
  type OverlayEntry,
} from "./overlay-stack.js";
import { computePosition } from "./position.js";
import { RemoteFrame, type RemoteComponentHandle } from "./RemoteComponent.js";
import type { NetworkPolicy } from "./document.js";

export interface OpenOverlay {
  params: OverlayOpenParams;
  /** Decoded props (functions are proxies back to the owner remote). */
  props: Record<string, unknown>;
  /** Latest anchor rect in the owner remote's viewport coordinates. */
  anchor: Rect | null;
}

/**
 * Open params with the options an `overlay.update` changed. Kind, content
 * and id stay. Returns `params` itself when nothing changed, so the
 * position effect does not run again.
 */
export function overlayParamsWith(
  params: OverlayOpenParams,
  update: OverlayUpdateParams,
): OverlayOpenParams {
  const next: OverlayOpenParams = { ...params };
  let changed = false;
  if (
    update.placement !== undefined &&
    (update.placement.side !== params.placement?.side ||
      update.placement.align !== params.placement?.align)
  ) {
    next.placement = {
      side: update.placement.side,
      align: update.placement.align,
    };
    changed = true;
  }
  if (update.offset !== undefined && update.offset !== params.offset) {
    next.offset = update.offset;
    changed = true;
  }
  if (update.label !== undefined && update.label !== params.label) {
    next.label = update.label;
    changed = true;
  }
  if (
    update.matchAnchorWidth !== undefined &&
    update.matchAnchorWidth !== params.matchAnchorWidth
  ) {
    next.matchAnchorWidth = update.matchAnchorWidth;
    changed = true;
  }
  return changed ? next : params;
}

interface OverlayViewProps {
  overlay: OpenOverlay;
  /** The owner's isolation; overlay content gets the same. */
  isolation: "url" | "scf";
  /** The owner's network policy; HTML content gets the same. */
  network: NetworkPolicy | undefined;
  owner: object;
  ownerIframe: RefObject<HTMLIFrameElement | null>;
  parent: OverlayEntry | null;
  zIndex: number;
  onDismiss: (id: string, reason: DismissReason) => void;
  /** `focusVisible`: true after a keyboard dismissal (Escape), false after a pointer one. */
  onRestoreFocus: (focusVisible?: boolean) => void;
}

const VIEWPORT_PADDING = 8;
const DIALOG_MARGIN = 16;

/**
 * Renders one overlay requested by a remote: a popover anchored to a rect
 * inside the owner's iframe, or a modal dialog. The content is another
 * remote component. Portaled into `document.body`.
 */
export function OverlayView({
  overlay,
  isolation,
  network,
  owner,
  ownerIframe,
  parent,
  zIndex,
  onDismiss,
  onRestoreFocus,
}: OverlayViewProps): ReactNode {
  const { params } = overlay;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentToken = useMemo(() => ({}), []);
  const [settled, setSettled] = useState(false);
  const [pos, setPos] = useState<{
    x: number;
    y: number;
    maxHeight: number;
    scroll: boolean;
  } | null>(null);
  const [dialogScroll, setDialogScroll] = useState(false);
  /** Bumped on every content size report, so a capped popover re-checks its fit. */
  const [contentVersion, setContentVersion] = useState(0);
  const contentSize = useRef<SizeReport | null>(null);
  const focusInsideRef = useRef(false);

  const dismissRef = useRef<(reason: DismissReason) => void>(() => {});
  const reasonRef = useRef<DismissReason | null>(null);
  dismissRef.current = (reason) => {
    reasonRef.current = reason;
    onDismiss(params.id, reason);
  };

  // Focus restore on removal, however the overlay closed (host dismissal or
  // the remote closing it): if focus was inside the overlay, or it was a
  // dialog, focus goes back to the owner remote's previously focused element.
  const restoreRef = useRef(onRestoreFocus);
  restoreRef.current = onRestoreFocus;
  useLayoutEffect(() => {
    const container = containerRef.current;
    const kind = params.kind;
    return () => {
      const active = document.activeElement;
      const inOverlay =
        active !== null && container !== null && container.contains(active);
      const lost = active === null || active === document.body;
      // An outside interaction moved focus (or the user clicked the page):
      // leave focus where the user put it, unless it is a dialog.
      const outside = reasonRef.current === "outside";
      // Escape is a keyboard dismissal: show the ring on the restored
      // element, as the browser would inline. A click outside hides it.
      const reason = reasonRef.current;
      const visible =
        reason === "escape" ? true : reason === "outside" ? false : undefined;
      if (inOverlay || kind === "dialog" || (lost && !outside))
        queueMicrotask(() => restoreRef.current(visible));
    };
  }, [params.kind]);

  const entry = useMemo<OverlayEntry>(
    () => ({
      id: params.id,
      kind: params.kind,
      parent,
      owner,
      content: contentToken,
      container: () => containerRef.current,
      dismiss: (reason) => dismissRef.current(reason),
    }),
    [params.id, params.kind, parent, owner, contentToken],
  );

  useLayoutEffect(() => pushOverlay(entry), [entry]);
  useLayoutEffect(() => {
    if (params.kind === "dialog") refreshInert();
  }, [params.kind]);

  // ---- popover positioning ----
  const reposition = useCallback(() => {
    if (params.kind !== "popover") return;
    const container = containerRef.current;
    const frame = ownerIframe.current;
    const a = overlay.anchor;
    if (container === null || frame === null || a === null) return;
    const fr = frame.getBoundingClientRect();
    const anchor = {
      x: fr.x + a.x,
      y: fr.y + a.y,
      width: a.width,
      height: a.height,
    };
    const cr = container.getBoundingClientRect();
    const result = computePosition({
      anchor,
      floating: {
        width: cr.width,
        height: contentSize.current?.height ?? cr.height,
      },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      placement: params.placement ?? { side: "bottom", align: "start" },
      offset: params.offset ?? 4,
      padding: VIEWPORT_PADDING,
    });
    // Scroll only when the content is really taller than the room: the iframe
    // is 1px larger than its slot, which would otherwise show scrollbars.
    const scroll = (contentSize.current?.height ?? 0) > result.maxHeight + 0.5;
    setPos((p) =>
      p !== null &&
      p.x === result.x &&
      p.y === result.y &&
      p.maxHeight === result.maxHeight &&
      p.scroll === scroll
        ? p
        : { x: result.x, y: result.y, maxHeight: result.maxHeight, scroll },
    );
  }, [
    params.kind,
    params.placement,
    params.offset,
    overlay.anchor,
    ownerIframe,
  ]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition, settled, contentVersion]);

  useEffect(() => {
    if (params.kind !== "popover") return;
    let frame = 0;
    const onChange = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        reposition();
      });
    };
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    const ro = new ResizeObserver(onChange);
    if (containerRef.current) ro.observe(containerRef.current);
    if (ownerIframe.current) ro.observe(ownerIframe.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
      ro.disconnect();
    };
  }, [params.kind, reposition, ownerIframe]);

  // ---- focus ----
  const contentRef = useRef<RemoteComponentHandle | null>(null);
  useEffect(() => {
    if (!settled || params.kind !== "dialog" || focusInsideRef.current) return;
    focusInsideRef.current = true;
    contentRef.current?.focus("first");
  }, [settled, params.kind]);

  const onSettled = useCallback(() => setSettled(true), []);
  const onSize = useCallback((s: SizeReport) => {
    contentSize.current = s;
    setContentVersion((v) => v + 1);
    setDialogScroll(
      s.height >
        document.documentElement.clientHeight - DIALOG_MARGIN * 2 + 0.5,
    );
  }, []);

  const internal = useMemo(
    () => ({ overlay: { kind: params.kind, entry }, onSettled, onSize }),
    [params.kind, entry, onSettled, onSize],
  );

  const frame = (
    <RemoteFrame
      // The remote chooses only its content's props, never host props
      // (sandbox, allow, instanceId, style …).
      remoteProps={overlay.props}
      ref={contentRef}
      {...("html" in params.content
        ? { html: params.content.html }
        : { src: params.content.src })}
      {...(network !== undefined ? { network } : {})}
      isolation={isolation}
      frameTitle={
        params.label ?? (params.kind === "dialog" ? "Dialog" : "Popover")
      }
      internal={internal}
    />
  );

  let node: ReactNode;
  if (params.kind === "popover") {
    const style: CSSProperties = {
      position: "fixed",
      left: pos?.x ?? 0,
      top: pos?.y ?? 0,
      zIndex,
      width: "max-content",
      maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
      // Content taller than the room on its side scrolls here, like an
      // inline popover with max-height. Wheel scrolling chains out of the
      // frame; focus scrolling crosses frames.
      ...(pos?.scroll === true
        ? {
            maxHeight: pos.maxHeight,
            overflowX: "hidden",
            overflowY: "auto",
            overscrollBehavior: "contain",
          }
        : {}),
      ...(params.matchAnchorWidth && overlay.anchor
        ? { minWidth: overlay.anchor.width }
        : {}),
      visibility: settled && pos !== null ? undefined : "hidden",
    };
    node = (
      <div
        ref={containerRef}
        data-rc-overlay={params.id}
        data-rc-overlay-kind="popover"
        data-rc-internal=""
        style={style}
      >
        {frame}
      </div>
    );
  } else {
    const backdrop: CSSProperties = {
      position: "fixed",
      inset: 0,
      zIndex,
      display: "grid",
      placeItems: "center",
      background: "var(--rc-backdrop, rgba(0, 0, 0, 0.4))",
      visibility: settled ? undefined : "hidden",
    };
    const panel: CSSProperties = {
      width: "max-content",
      maxWidth: `calc(100vw - ${DIALOG_MARGIN * 2}px)`,
      maxHeight: `calc(100vh - ${DIALOG_MARGIN * 2}px)`,
      ...(dialogScroll
        ? {
            overflowX: "hidden",
            overflowY: "auto",
            overscrollBehavior: "contain",
          }
        : { overflow: "hidden" }),
    };
    // Focus sentinels keep Tab cycling inside the dialog.
    node = (
      <div
        ref={containerRef}
        data-rc-overlay={params.id}
        data-rc-overlay-kind="dialog"
        data-rc-backdrop=""
        data-rc-internal=""
        style={backdrop}
      >
        <span
          tabIndex={0}
          data-rc-sentinel="start"
          onFocus={() =>
            contentRef.current?.focus("last", { focusVisible: true })
          }
          style={{ position: "fixed", width: 1, height: 1, opacity: 0 }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={params.label ?? "Dialog"}
          data-rc-dialog-panel=""
          style={panel}
        >
          {frame}
        </div>
        <span
          tabIndex={0}
          data-rc-sentinel="end"
          onFocus={() =>
            contentRef.current?.focus("first", { focusVisible: true })
          }
          style={{ position: "fixed", width: 1, height: 1, opacity: 0 }}
        />
      </div>
    );
  }

  return createPortal(
    <OverlayContext.Provider value={entry}>{node}</OverlayContext.Provider>,
    document.body,
  );
}
