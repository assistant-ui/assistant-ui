import {
  encode,
  encodedEqual,
  functionPathSet,
  type Encoded,
  RemoteComponentError,
  type DismissReason,
  type FunctionTargets,
  type OverlayKind,
  type Placement,
  type Rect,
  type OverlayUpdateParams,
  type RemoteChannel,
} from "@assistant-ui/remote-components-protocol";

export interface OverlayOptions {
  kind: OverlayKind;
  /** Remote component URL for the overlay content. Relative URLs resolve against this document. */
  src?: string;
  /** Or an HTML document for the content; the host renders it like its `html` prop. */
  html?: string;
  /** Props for the overlay content. Functions become callbacks into this remote. */
  props?: Record<string, unknown>;
  /** Anchor element (required for popovers). Tracked while the overlay is open. */
  anchor?: Element | null;
  placement?: Placement;
  offset?: number;
  /** Accessible name for dialogs. */
  label?: string;
  /** Make the overlay at least as wide as the anchor (dropdowns). */
  matchAnchorWidth?: boolean;
  /** Called when the host dismisses the overlay (escape, outside click, unmount, …). Not called for `close()`. */
  onDismiss?: (reason: DismissReason) => void;
}

export type OverlayUpdateOptions = Pick<
  OverlayOptions,
  "anchor" | "placement" | "offset" | "label" | "matchAnchorWidth"
>;

/** What `rc.overlay()` returns. */
export interface OverlayHandle {
  /** Replaces the overlay content's props. */
  update(props: Record<string, unknown>): void;
  /** Changes options while open: anchor, placement, offset, label, matchAnchorWidth. */
  setOptions(options: OverlayUpdateOptions): void;
  close(): void;
  /** Resolves once the host has rendered the overlay; rejects if the host refused it. */
  readonly ready: Promise<void>;
}

/** The manager's handle: the public one plus the overlay's id (its function scope is `overlay:<id>`). */
export interface ManagedOverlay extends OverlayHandle {
  readonly id: string;
}

interface OpenOverlay {
  id: string;
  opts: OverlayOptions;
  props: Record<string, unknown>;
  /** Last encoding sent for `props`: updates that encode the same are not sent. */
  encoded: Encoded | null;
  /** Function paths in `encoded`: the only functions the host may call back. */
  functions: Set<string>;
  lastRect: Rect | null;
  offTargets: () => void;
  closed: boolean;
}

let counter = 0;

/**
 * Remote side of the overlay protocol. The host renders overlays (they
 * cannot escape the iframe); this side tracks the anchor and serves the
 * overlay content's callbacks.
 */
export class OverlayManager {
  private readonly open = new Map<string, OpenOverlay>();
  /** Elements focused when each overlay opened, restored on host request. */
  private readonly restoreStack: Element[] = [];
  private raf = 0;
  private readonly cleanups: (() => void)[] = [];

  private readonly channel: RemoteChannel | null;
  private readonly targets: FunctionTargets;
  private readonly win: Window;
  /** Base for relative overlay URLs: the remote's URL as the host knows it (blob documents have no useful location). */
  private readonly baseUrl: string;

  constructor(
    channel: RemoteChannel | null,
    targets: FunctionTargets,
    win: Window,
    baseUrl: string = win.location.href,
  ) {
    this.channel = channel;
    this.targets = targets;
    this.win = win;
    this.baseUrl = baseUrl;
    if (channel === null) return;
    channel.on("rc/notifications/overlay-dismissed", ({ id, reason }) => {
      const o = this.open.get(id);
      if (o === undefined) return;
      this.finish(o);
      o.opts.onDismiss?.(reason);
    });
    const onPointerDown = (ev: PointerEvent): void => {
      if (this.open.size === 0) return;
      const target = ev.target instanceof Node ? ev.target : null;
      const inside: string[] = [];
      for (const o of this.open.values())
        if (target !== null && o.opts.anchor?.contains(target) === true)
          inside.push(o.id);
      channel.notify("rc/notifications/pointer-down", {
        insideAnchorOf: inside,
      });
    };
    win.addEventListener("pointerdown", onPointerDown, true);
    const onScroll = (): void => this.trackAnchors();
    win.addEventListener("scroll", onScroll, true);
    win.addEventListener("resize", onScroll);
    this.cleanups.push(() => {
      win.removeEventListener("pointerdown", onPointerDown, true);
      win.removeEventListener("scroll", onScroll, true);
      win.removeEventListener("resize", onScroll);
    });
  }

  get count(): number {
    return this.open.size;
  }

  openOverlay(opts: OverlayOptions): ManagedOverlay {
    const id = `o${++counter}`;
    const channel = this.channel;
    const o: OpenOverlay = {
      id,
      opts,
      props: opts.props ?? {},
      encoded: null,
      functions: new Set(),
      lastRect: null,
      offTargets: () => {},
      closed: false,
    };
    if (channel === null) {
      console.warn(
        "[rc] Overlays need a host; ignoring open() in standalone mode",
      );
      o.closed = true;
      return this.handle(
        o,
        Promise.reject(new RemoteComponentError("overlay", "No host")),
      );
    }
    if ((opts.src === undefined) === (opts.html === undefined))
      throw new RemoteComponentError(
        "overlay",
        "Overlays need exactly one of src or html",
      );
    if (
      opts.kind === "popover" &&
      (opts.anchor === undefined || opts.anchor === null)
    ) {
      throw new RemoteComponentError(
        "overlay",
        "Popovers need an anchor element",
      );
    }
    const active = this.win.document.activeElement;
    if (active !== null && active !== this.win.document.body)
      this.restoreStack.push(active);

    const encoded = encode(o.props, {
      allowFunctions: true,
      label: "overlay props",
    });
    o.encoded = encoded;
    o.functions = functionPathSet(encoded);
    o.offTargets = this.targets.register(
      `overlay:${id}`,
      () => o.props,
      (path) => o.functions.has(JSON.stringify(path)),
    );
    this.open.set(id, o);
    const anchor = opts.anchor ? rectOf(opts.anchor) : undefined;
    o.lastRect = anchor ?? null;
    const params = {
      id,
      kind: opts.kind,
      content:
        opts.html !== undefined
          ? { html: opts.html, props: encoded }
          : { src: new URL(opts.src ?? "", this.baseUrl).href, props: encoded },
      ...(anchor !== undefined ? { anchor } : {}),
      ...(opts.placement !== undefined ? { placement: opts.placement } : {}),
      ...(opts.offset !== undefined ? { offset: opts.offset } : {}),
      ...(opts.label !== undefined ? { label: opts.label } : {}),
      ...(opts.matchAnchorWidth !== undefined
        ? { matchAnchorWidth: opts.matchAnchorWidth }
        : {}),
    };
    const ready = channel.request("rc/overlay/open", params).then(
      () => undefined,
      (err: unknown) => {
        this.finish(o);
        throw err;
      },
    );
    ready.catch(() => {}); // surfaced via handle.ready
    this.loop();
    return this.handle(o, ready);
  }

  private handle(o: OpenOverlay, ready: Promise<void>): ManagedOverlay {
    ready.catch(() => {});
    return {
      id: o.id,
      ready,
      update: (props) => {
        if (o.closed || this.channel === null) return;
        o.props = props;
        const encoded = encode(props, {
          allowFunctions: true,
          label: "overlay props",
        });
        // Same data (e.g. a new object literal each render): functions resolve
        // against the latest props anyway, so nothing needs to be sent.
        if (o.encoded !== null && encodedEqual(o.encoded, encoded)) return;
        o.encoded = encoded;
        o.functions = functionPathSet(encoded);
        this.channel
          .request("rc/overlay/update", { id: o.id, props: encoded })
          .catch(() => {});
      },
      setOptions: (next) => {
        if (o.closed || this.channel === null) return;
        const params: OverlayUpdateParams = { id: o.id };
        const prev = o.opts;
        if (
          next.placement !== undefined &&
          (next.placement.side !== prev.placement?.side ||
            next.placement.align !== prev.placement?.align)
        ) {
          params.placement = {
            side: next.placement.side,
            align: next.placement.align,
          };
        }
        if (next.offset !== undefined && next.offset !== prev.offset)
          params.offset = next.offset;
        if (next.label !== undefined && next.label !== prev.label)
          params.label = next.label;
        if (
          next.matchAnchorWidth !== undefined &&
          next.matchAnchorWidth !== prev.matchAnchorWidth
        )
          params.matchAnchorWidth = next.matchAnchorWidth;
        const anchorChanged =
          next.anchor !== undefined &&
          next.anchor !== null &&
          next.anchor !== prev.anchor;
        o.opts = { ...prev, ...definedOnly(next) };
        if (anchorChanged) {
          // The anchor loop sends the new rect; it also covers a popover
          // whose anchor element was replaced by a re-render.
          o.lastRect = null;
          this.trackAnchors();
        }
        if (Object.keys(params).length > 1)
          this.channel.request("rc/overlay/update", params).catch(() => {});
      },
      close: () => {
        if (o.closed || this.channel === null) return;
        this.channel.request("rc/overlay/close", { id: o.id }).catch(() => {});
        this.finish(o);
      },
    };
  }

  /** Host asked us to put focus back where it was before the last overlay opened. */
  restoreFocus(options?: FocusOptions): boolean {
    while (this.restoreStack.length > 0) {
      const el = this.restoreStack.pop()!;
      if (el.isConnected && el instanceof HTMLElement) {
        el.focus(options);
        return true;
      }
    }
    return false;
  }

  private finish(o: OpenOverlay): void {
    if (o.closed) return;
    o.closed = true;
    o.offTargets();
    this.open.delete(o.id);
  }

  private loop(): void {
    if (this.raf !== 0) return;
    const tick = (): void => {
      this.raf = 0;
      if (this.open.size === 0) return;
      this.trackAnchors();
      this.raf = this.win.requestAnimationFrame(tick);
    };
    this.raf = this.win.requestAnimationFrame(tick);
  }

  private trackAnchors(): void {
    if (this.channel === null) return;
    for (const o of this.open.values()) {
      const a = o.opts.anchor;
      if (a === undefined || a === null) continue;
      const r = rectOf(a);
      const l = o.lastRect;
      if (
        l !== null &&
        l.x === r.x &&
        l.y === r.y &&
        l.width === r.width &&
        l.height === r.height
      )
        continue;
      o.lastRect = r;
      this.channel.notify("rc/notifications/overlay-anchor-changed", {
        id: o.id,
        anchor: r,
      });
    }
  }

  dispose(): void {
    for (const o of [...this.open.values()]) this.finish(o);
    if (this.raf !== 0) this.win.cancelAnimationFrame(this.raf);
    for (const c of this.cleanups.splice(0)) c();
  }
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

/** Tab stops in sequential focus order (re-exported from the protocol package). */
export { tabbables } from "@assistant-ui/remote-components-protocol";

function definedOnly<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
