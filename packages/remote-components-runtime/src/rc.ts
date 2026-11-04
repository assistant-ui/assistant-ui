import {
  RemoteComponentError,
  type DismissReason,
  type Placement,
} from "@assistant-ui/remote-components-protocol";
import { connectToHost } from "./connect.js";
import { CssShim } from "./css.js";
import type { OverlayHandle, OverlayOptions } from "./overlays.js";
import { RemoteRuntime } from "./runtime.js";

/**
 * Defaults for a page in a slot. `<html>` is the slot: the host owns its
 * box, so these win over author rules (`!important`). Everything else uses
 * `:where()` (specificity 0) and comes first in `<head>`, so any author
 * rule overrides it.
 */
const PAGE_CSS =
  "html{overflow:hidden!important;margin:0 auto 0 0!important;padding:0!important;border:0!important;box-sizing:border-box!important;" +
  "min-width:0!important;max-width:none!important;min-height:0!important;max-height:none!important;transform:none!important;zoom:1!important}" +
  // A component has no UA page margin; body fills a definite slot height.
  ":where(body){margin:0;height:100%}" +
  // Conventional app mount points fill a definite slot height too, like the
  // reference model's flow-root wrapper. With an auto height this is auto.
  ":where(body>#root,body>#app,body>#__next){height:100%}";

export interface RcOverlayOptions extends Omit<OverlayOptions, "onDismiss"> {
  /** Called when the host dismisses the overlay (escape, outside click, …). Not called for `close()`. */
  onDismiss?: (reason: DismissReason) => void;
}

export type { OverlayHandle, Placement, DismissReason };

/** Events `window.rc` dispatches. Neither carries a payload: read `rc.props`, or re-read computed styles. */
export interface RcEventMap {
  /** The first props arrived (once, at connect), or a prop changed. */
  "props-changed": Event;
  /** The host's styles changed and the runtime re-applied them (also once at connect). */
  "theme-changed": Event;
}

/** `window.rc`: everything a page needs from its host. Usable before the host connects. */
export interface Rc extends EventTarget {
  /** Current props. Function props are async calls into the host. Same object until a prop changes. */
  readonly props: Readonly<Record<string, unknown>>;
  /** Opens a host-rendered popover or dialog. Content is a URL or an HTML document. */
  overlay(options: RcOverlayOptions): OverlayHandle;
  addEventListener<K extends keyof RcEventMap>(
    type: K,
    listener: (this: Rc, ev: RcEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof RcEventMap>(
    type: K,
    listener: (this: Rc, ev: RcEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

declare global {
  /** The remote-components runtime (`rc-runtime.js`). */
  var rc: Rc;
}

const EMPTY: Readonly<Record<string, unknown>> = Object.freeze({});

/** The object behind `window.rc`. Only `props`, `overlay()` and the EventTarget methods are public. */
class RcTarget extends EventTarget implements Rc {
  /** Resolves with the connection (null: opened directly, no host). */
  readonly #runtime: Promise<RemoteRuntime | null>;
  /** The connection once its props are visible to the page (see start()). */
  readonly #live: () => RemoteRuntime | null;

  constructor(
    runtime: Promise<RemoteRuntime | null>,
    live: () => RemoteRuntime | null,
  ) {
    super();
    this.#runtime = runtime;
    this.#live = live;
  }

  get props(): Readonly<Record<string, unknown>> {
    // Stable before connect: React's useSyncExternalStore loops on a new
    // object per read.
    return this.#live()?.getProps() ?? EMPTY;
  }

  overlay(options: RcOverlayOptions): OverlayHandle {
    return lazyOverlay(
      this.#runtime.then((r) =>
        r === null
          ? Promise.reject(
              new RemoteComponentError("overlay", "Overlays need a host"),
            )
          : r.overlays(),
      ),
      options,
    );
  }
}

/**
 * Starts the runtime in this document and installs `window.rc`. Idempotent.
 * Safe to run from a classic `<script>` in `<head>`: the handshake starts at
 * once, the parts that need `<body>` wait for it.
 */
export function start(): Rc {
  const win = window;
  if (win.rc !== undefined) return win.rc;
  const doc = win.document;
  // Opened directly (not framed), the page stays a normal page: no slot
  // styles, no CSS shim, empty props.
  const embedded = win.parent !== win;

  if (embedded) {
    const style = doc.createElement("style");
    style.dataset.rc = "";
    style.textContent = PAGE_CSS;
    (doc.head ?? doc.documentElement).prepend(style);
  }

  /** The connection, from connect on. */
  let conn: RemoteRuntime | null = null;
  /** The connection, once its props are visible to the page. */
  let rt: RemoteRuntime | null = null;
  const css = embedded
    ? new CssShim(doc, () => conn?.measurer.schedule())
    : null;

  // ---- reveal: `load` (or DOMContentLoaded + 1.5s), then two tasks ----
  let loaded = doc.readyState === "complete";
  const trySignal = (): void => {
    if (rt === null || !loaded) return;
    // Two tasks after load: let script-rendered content (React's first
    // commit, a chart drawn on load) land before the first size. Not
    // rAF: a hidden cross-origin frame gets no animation frames, and the
    // host keeps the frame hidden until ready.
    const r = rt;
    setTimeout(() => setTimeout(() => void r.signalRendered(), 0), 0);
  };
  if (!loaded) {
    const onLoad = (): void => {
      if (loaded) return;
      loaded = true;
      trySignal();
    };
    win.addEventListener("load", onLoad, { once: true });
    // Slow images or iframes should not hold the reveal for long.
    doc.addEventListener("DOMContentLoaded", () => setTimeout(onLoad, 1500), {
      once: true,
    });
  }

  // DOMContentLoaded has fired. readyState says "interactive" before
  // deferred and module scripts run, so it cannot tell; `load` covers a
  // runtime started after DOMContentLoaded.
  let parsed = doc.readyState === "complete";
  const afterParse: (() => void)[] = [];
  if (!parsed) {
    const onParsed = (): void => {
      if (parsed) return;
      parsed = true;
      for (const f of afterParse.splice(0)) f();
    };
    doc.addEventListener("DOMContentLoaded", onParsed, { once: true });
    win.addEventListener("load", onParsed, { once: true });
  }

  const runtime: Promise<RemoteRuntime | null> = embedded
    ? connectToHost().then((conn) => new RemoteRuntime(doc, conn, css))
    : Promise.resolve(null);
  const api = new RcTarget(runtime, () => rt);
  runtime.then(
    (r) => {
      if (r === null) return;
      conn = r;
      // Layout and theme apply at once (body styles once there is a body).
      // Props become visible, and the first "props-changed" fires, once
      // the document is parsed: every script in it, deferred and module
      // scripts included, has had the chance to listen.
      const bodyReady = (): void => {
        r.theme.applyBody();
        r.measurer.apply();
        r.measurer.schedule();
        css?.schedule();
      };
      if (doc.body !== null) bodyReady();
      else doc.addEventListener("DOMContentLoaded", bodyReady, { once: true });
      const live = (): void => {
        rt = r;
        r.subscribeProps(() => api.dispatchEvent(new Event("props-changed")));
        r.subscribeTheme(() => api.dispatchEvent(new Event("theme-changed")));
        api.dispatchEvent(new Event("props-changed"));
        api.dispatchEvent(new Event("theme-changed"));
        trySignal();
      };
      if (parsed) live();
      else afterParse.push(live);
    },
    (err: unknown) => console.error("[rc]", err),
  );

  Object.defineProperty(win, "rc", {
    value: api,
    configurable: false,
    writable: false,
    enumerable: true,
  });
  return api;
}

/** A handle that works at once; the overlay chunk loads behind it. */
function lazyOverlay(
  manager: Promise<import("./overlays.js").OverlayManager>,
  options: RcOverlayOptions,
): OverlayHandle {
  let real: OverlayHandle | null = null;
  let closed = false;
  const queue: ((h: OverlayHandle) => void)[] = [];
  const ready = manager.then((m) => {
    if (closed) return;
    real = m.openOverlay(options);
    for (const f of queue.splice(0)) f(real);
    return real.ready;
  });
  ready.catch(() => {});
  const run = (f: (h: OverlayHandle) => void): void => {
    if (real !== null) f(real);
    else queue.push(f);
  };
  return {
    ready,
    update: (props) => run((h) => h.update(props)),
    setOptions: (o) => run((h) => h.setOptions(o)),
    close: () => {
      closed = true;
      if (real !== null) real.close();
    },
  };
}
