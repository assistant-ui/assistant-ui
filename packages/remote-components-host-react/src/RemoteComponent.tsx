import {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import {
  RemoteComponentError,
  type LayoutInfo,
  type OverlayKind,
  type OverlayOpenParams,
  type SizeReport,
} from "@assistant-ui/remote-components-protocol";
import { FrameController, type FrameSource } from "./controller.js";
import { frameCsp, prepareDocument, type NetworkPolicy } from "./document.js";
import {
  OverlayContext,
  escapeInFrame,
  interactionInside,
  type OverlayEntry,
} from "./overlay-stack.js";
import {
  OverlayView,
  overlayParamsWith,
  type OpenOverlay,
} from "./overlays.js";
import { DEFAULT_SANDBOX, useHostConfig } from "./provider.js";
import { readTheme, watchTheme } from "./theme.js";
import { poke, watchPosition } from "./position-watch.js";
import {
  expectFocus,
  focusEntered,
  moveFocusFrom,
  registerFocusTarget,
  revealRect,
} from "./focus-nav.js";
import { SizeGuard } from "./size-guard.js";
import { readContainers } from "./containers.js";

export type RemoteStatus = "idle" | "loading" | "ready" | "error";

export interface RemoteComponentHandle {
  /** Reloads the remote document (new handshake, fallback shown again). */
  reload(): void;
  /**
   * Moves focus into the remote (first or last tabbable element).
   * `focusVisible` as in `HTMLElement.focus()`: true shows the focus ring
   * (keyboard), false hides it; omitted lets the browser decide.
   */
  focus(target?: "first" | "last", options?: { focusVisible?: boolean }): void;
  readonly iframe: HTMLIFrameElement | null;
  readonly status: RemoteStatus;
}

/** Host-only props. Everything else is passed to the remote component. */
export interface HostProps {
  /** URL of the remote component: any HTML page on the widget origin. */
  src?: string;
  /**
   * Or the document itself (model output that never touches a server). The
   * host adds the doctype, the runtime and the CSP, and shows it through
   * `srcdoc` in an opaque sandbox, or through Safe Content Frame with
   * `isolation="scf"`.
   */
  html?: string;
  /** Rendered (in flow, in place of the remote) until the remote is ready. */
  fallback?: ReactNode;
  /** Rendered when the remote fails. A function receives the error and a retry callback. */
  errorFallback?:
    | ReactNode
    | ((error: RemoteComponentError, retry: () => void) => ReactNode);
  /** Every error: fatal ones (timeout, load, protocol, security) and non-fatal ones (runtime, data). */
  onError?: (error: RemoteComponentError, info: { fatal: boolean }) => void;
  onReady?: () => void;
  /** ms until the remote must be ready. Default 10000 (or the provider's). */
  timeout?: number;
  /** "lazy" defers loading until the slot is near the viewport. Default "eager". */
  loading?: "eager" | "lazy";
  /**
   * Stable identity of this placement. Used only with `isolation="scf"` and
   * the provider's `scf.salt: "instance"`: the instance keeps the same
   * hashed origin (and so its own storage) across loads.
   */
  instanceId?: string;
  /** Class name of the slot element (the box that takes part in host layout). */
  className?: string;
  /** Style of the slot element. */
  style?: CSSProperties;
  /** Accessible title of the iframe. Default "Remote component". */
  frameTitle?: string;
  /** iframe sandbox tokens. Omitting `allow-same-origin` gives the remote an opaque origin (no storage, no cookies). */
  sandbox?: string;
  /** iframe `allow` (permissions policy). */
  allow?: string;
  /**
   * How the remote is isolated. "url" (default): an iframe navigated to
   * `src` (the publisher's own origin), or `srcdoc` for `html`. "scf": the
   * document is shown in a Safe Content Frame, on a hashed origin per
   * publisher on a public-suffix domain (`src` is fetched first).
   */
  isolation?: "url" | "scf";
  /**
   * Where the remote may connect (SPEC §12). "public" (default): any
   * https/wss endpoint, credential-less. "none", or a list of origins, to
   * lock it down. Applied as CSP: a `<meta>` for `html` and SCF documents,
   * the iframe `csp` attribute for URL remotes.
   */
  network?: NetworkPolicy;
  /** Escape hatch: props passed to the remote even if their names are host props. */
  remoteProps?: Record<string, unknown>;
  ref?: Ref<RemoteComponentHandle>;
}

export type RemoteComponentProps<P extends object = Record<string, unknown>> =
  HostProps & Omit<P, keyof HostProps>;

const HOST_KEYS = new Set<string>([
  "src",
  "fallback",
  "errorFallback",
  "onError",
  "onReady",
  "timeout",
  "loading",
  "instanceId",
  "className",
  "style",
  "frameTitle",
  "sandbox",
  "allow",
  "remoteProps",
  "isolation",
  "network",
  "html",
  "ref",
  "key",
]);

/** Internal options used when a RemoteFrame renders overlay content. */
export interface InternalFrameOptions {
  overlay: { kind: OverlayKind; entry: OverlayEntry };
  /** Called when this frame becomes ready and settled (sized). */
  onSettled?: () => void;
  onSize?: (size: SizeReport) => void;
}

/**
 * Renders a remote component in a sandboxed iframe whose layout behaves as
 * if the component were inline (see SPEC.md §Layout).
 *
 * DOM:
 *   slot   <div data-rc-slot>       ← takes part in host layout; className/style go here
 *     sizer <div data-rc-sizer>     ← min-width: min-content, min-height: content height
 *       <canvas>                    ← width: max-content; max-width: 100% (compressible)
 *       <iframe>                    ← absolutely fills the sizer
 *     fallback / errorFallback      ← in flow until ready / on error
 */
export function RemoteComponent<P extends object = Record<string, unknown>>(
  props: RemoteComponentProps<P>,
): ReactNode {
  return <RemoteFrame {...(props as RemoteComponentProps)} />;
}

export function RemoteFrame(
  allProps: RemoteComponentProps & { internal?: InternalFrameOptions },
): ReactNode {
  const config = useHostConfig();
  const parentOverlay = useContext(OverlayContext);
  const {
    html,
    fallback,
    errorFallback,
    onError,
    onReady,
    className,
    style,
    frameTitle,
    remoteProps,
    ref,
    internal,
  } = allProps;
  // Inline documents have no URL: their origin is opaque.
  const src = html !== undefined ? "about:srcdoc" : (allProps.src ?? "");
  const network = allProps.network ?? config.network;
  const networkKey =
    network === undefined
      ? ""
      : typeof network === "string"
        ? network
        : network.join(" ");
  const timeout = allProps.timeout ?? config.timeout ?? 10_000;
  // srcdoc inherits the host's origin: never with allow-same-origin.
  const sandbox = stripSameOrigin(
    allProps.sandbox ?? config.sandbox ?? DEFAULT_SANDBOX,
    html !== undefined,
  );
  const allow = allProps.allow ?? config.allow ?? "";
  const lazy = (allProps.loading ?? "eager") === "lazy";
  const instanceId = allProps.instanceId;
  const isolation = allProps.isolation ?? config.isolation ?? "url";
  // instanceId only matters for an SCF origin salted per instance.
  const scfInstance = isolation === "scf" ? instanceId : undefined;

  // Props for the remote: everything that is not a host prop, plus remoteProps.
  const forwarded: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(allProps))
    if (!HOST_KEYS.has(k) && k !== "internal") forwarded[k] = v;
  if (remoteProps) Object.assign(forwarded, remoteProps);
  const propsRef = useRef(forwarded);
  propsRef.current = forwarded;

  const absoluteSrc = useMemo(() => {
    if (html !== undefined) return "about:srcdoc";
    try {
      return new URL(
        src,
        typeof document !== "undefined" ? document.baseURI : undefined,
      ).href;
    } catch {
      return null;
    }
  }, [src, html]);
  const htmlRef = useRef(html);
  htmlRef.current = html;

  const slotRef = useRef<HTMLDivElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controllerRef = useRef<FrameController | null>(null);
  // Identity of this frame in the overlay stack. Overlay content frames use
  // the token their overlay entry was created with.
  const ownToken = useMemo(() => ({}), []);
  const token = internal?.overlay.entry.content ?? ownToken;

  const [status, setStatus] = useState<RemoteStatus>(lazy ? "idle" : "loading");
  const [error, setError] = useState<RemoteComponentError | null>(null);
  const [size, setSize] = useState<SizeReport | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [visible, setVisible] = useState(!lazy);
  const [overlays, setOverlays] = useState<OpenOverlay[]>([]);
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const internalRef = useRef(internal);
  internalRef.current = internal;
  // Policy is read live, so a host that changes it affects running instances.
  const configRef = useRef(config);
  configRef.current = config;
  const networkRef = useRef(network);
  networkRef.current = network;
  const themeOptsRef = useRef(config.theme);
  themeOptsRef.current = config.theme;

  // Lazy loading: wait until the slot is within 200px of the viewport.
  useEffect(() => {
    if (!lazy || visible) return;
    const el = slotRef.current;
    if (el === null) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy, visible]);

  const readLayout = useCallback((): LayoutInfo => {
    const sizer = sizerRef.current;
    if (sizer === null)
      return { width: 0, height: null, offsetX: 0, offsetY: 0 };
    const r = sizer.getBoundingClientRect();
    const step = frameGridStep(
      sizer.ownerDocument.defaultView?.devicePixelRatio ?? 1,
    );
    // Distance from the frame grid line at or before the edge (see frameGridStep).
    const frac = (v: number): number =>
      v - Math.floor((v + 1e-6) / step) * step;
    const cur = sizeRef.current;
    // The sizer's min-height is the content height; anything taller means the
    // host constrains the height (explicit height, stretch, aspect-ratio).
    const fixed =
      cur !== null && readyRef.current && r.height > cur.height + 0.01;
    const found: Element[] = [];
    const containers =
      slotRef.current === null ? [] : readContainers(slotRef.current, found);
    containerEls.current = found;
    const viewportHeight = sizer.ownerDocument.documentElement.clientHeight;
    // The sizer is at least the content's min-content width, so it can be
    // wider than the slot. Inline, the flow-root block would still be the
    // slot's width (its scroll containers scroll, wider content overflows),
    // so the remote lays out at the slot's content width then.
    let width = r.width;
    const slot = slotRef.current;
    if (slot !== null) {
      const cs = getComputedStyle(slot);
      const px = (v: string): number => parseFloat(v) || 0;
      const content =
        slot.getBoundingClientRect().width -
        px(cs.borderLeftWidth) -
        px(cs.borderRightWidth) -
        px(cs.paddingLeft) -
        px(cs.paddingRight);
      if (content < r.width - 0.5) width = Math.max(0, content);
    }
    return {
      width,
      height: fixed ? r.height : null,
      offsetX: frac(r.x),
      offsetY: frac(r.y),
      viewportHeight,
      ...(containers.length > 0 ? { containers } : {}),
    };
  }, []);
  const sizeRef = useRef<SizeReport | null>(null);
  const readyRef = useRef(false);
  const containerEls = useRef<Element[]>([]);
  const revealedRef = useRef(false);
  revealedRef.current = revealed;
  /** Full layout update (set by the layout effect); the theme watcher calls it too. */
  const layoutUpdateRef = useRef<() => void>(() => {});

  const checkReveal = useCallback(() => {
    const c = controllerRef.current;
    const s = sizeRef.current;
    if (c === null || s === null || !readyRef.current || revealedRef.current)
      return;
    const layout = readLayout();
    if (Math.abs(s.width - layout.width) < 0.01) setRevealed(true);
  }, [readLayout]);

  // Controller lifecycle: one per (src, sandbox, reload).
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!visible || (isolation === "url" && iframe === null)) return;
    const inline = htmlRef.current !== undefined;
    if (absoluteSrc === null) {
      const err = new RemoteComponentError(
        "load",
        `Invalid remote component URL: ${src}`,
      );
      setError(err);
      setStatus("error");
      onErrorRef.current?.(err, { fatal: true });
      return;
    }
    const opaque = inline || !/(^|\s)allow-same-origin(\s|$)/.test(sandbox);
    const remoteOrigin = new URL(absoluteSrc).origin;
    if (
      isolation === "url" &&
      !inline &&
      !opaque &&
      remoteOrigin === window.location.origin &&
      config.dangerouslyAllowSameOrigin !== true
    ) {
      const err = new RemoteComponentError(
        "security",
        "Refusing to load a same-origin remote with allow-same-origin: it could script the host page. Serve remotes from a separate origin.",
      );
      setError(err);
      setStatus("error");
      onErrorRef.current?.(err, { fatal: true });
      return;
    }

    setStatus("loading");
    setError(null);
    setSize(null);
    setRevealed(false);
    sizeRef.current = null;
    readyRef.current = false;

    const scf = config.scf ?? {};
    const saltMode = scf.salt ?? "publisher";
    const salt =
      typeof saltMode === "function"
        ? saltMode({ src: absoluteSrc, remoteOrigin, instanceId })
        : saltMode === "instance" || inline
          ? `rc:v2:${remoteOrigin}:${instanceId ?? Math.random().toString(36).slice(2)}`
          : `rc:v2:${remoteOrigin}`;
    const policy = networkRef.current;
    const prepare = (): Promise<string> =>
      inline
        ? prepareDocument(
            htmlRef.current!,
            policy === undefined ? {} : { network: policy },
          )
        : (scf.loadHtml ?? defaultLoadHtml)(absoluteSrc).then((doc) =>
            prepareDocument(doc, {
              ...(policy === undefined ? {} : { network: policy }),
              base: singleFileUrl(absoluteSrc),
            }),
          );
    const frame: FrameSource =
      isolation !== "scf"
        ? inline
          ? { kind: "srcdoc", iframe: iframe!, load: prepare }
          : { kind: "url", iframe: iframe!, opaque }
        : {
            kind: "scf",
            container: sizerRef.current!,
            load: prepare,
            options: {
              product: scf.product ?? "remote-components",
              salt,
              ...(scf.shimDomain !== undefined
                ? { shimDomain: scf.shimDomain }
                : {}),
              sandbox: sandbox
                .split(/\s+/)
                .filter(
                  (t) =>
                    t !== "" &&
                    t !== "allow-scripts" &&
                    t !== "allow-same-origin",
                ),
            },
            onIframe: (el) => {
              iframeRef.current = el;
              unregisterFocus = registerFocusTarget(el, enterFocus);
              el.title = frameTitleRef.current;
              el.setAttribute("allow", allow);
              el.style.cssText = "";
              Object.assign(el.style, BASE_IFRAME_STYLE, {
                visibility: "hidden",
              });
              const l = readLayout();
              placeIframe(el, l.offsetX, l.offsetY);
            },
          };
    // Feedback-loop guard (size-guard.ts): may hold the slot at a taller height.
    const guard = new SizeGuard();
    const guarded = (report: SizeReport): SizeReport => {
      const height = guard.report(report, performance.now());
      return height === report.height ? report : { ...report, height };
    };
    let unregisterFocus = (): void => {};
    const enterFocus = (
      target: "first" | "last",
      focusVisible?: boolean,
    ): void => controllerRef.current?.focus(target, focusVisible);
    const controller = new FrameController({
      src: absoluteSrc,
      frame,
      timeout,
      initializeAfterLoadTimeout: 3000,
      getProps: () => propsRef.current,
      getTheme: () => readTheme(slotRef.current!, themeOptsRef.current),
      getLayout: readLayout,
      ...(internalRef.current
        ? { overlay: { kind: internalRef.current.overlay.kind } }
        : {}),
      events: {
        onReady: (report) => {
          const s = guarded(report);
          sizeRef.current = s;
          readyRef.current = true;
          setSize(s);
          setStatus("ready");
          onReadyRef.current?.();
        },
        onSize: (report) => {
          const s = guarded(report);
          sizeRef.current = s;
          setSize(s);
        },
        onError: (err, fatal) => {
          if (fatal) {
            setError(err);
            setStatus("error");
          }
          if (onErrorRef.current) onErrorRef.current(err, { fatal });
          else if (fatal) console.error("[remote-components]", err);
        },
        onOverlayOpen: (params) => openOverlay(params),
        onReset: () => setOverlays([]),
        onOverlayUpdate: (params) => {
          const proxies = controller.proxies;
          setOverlays((list) =>
            list.map((o) =>
              o.params.id !== params.id
                ? o
                : {
                    ...o,
                    params: overlayParamsWith(o.params, params),
                    ...(params.anchor ? { anchor: params.anchor } : {}),
                    ...(params.props && proxies
                      ? {
                          props: proxies.decode(
                            `overlay:${o.params.id}`,
                            params.props,
                          ) as Record<string, unknown>,
                        }
                      : {}),
                  },
            ),
          );
        },
        onOverlayAnchor: (id, anchor) =>
          setOverlays((list) =>
            list.map((o) => (o.params.id === id ? { ...o, anchor } : o)),
          ),
        onOverlayClose: (id) =>
          setOverlays((list) => list.filter((o) => o.params.id !== id)),
        onEscape: () =>
          escapeInFrame(
            token,
            internalRef.current?.overlay.entry ?? parentOverlay,
          ),
        onFocusExit: (direction) => {
          if (iframeRef.current !== null)
            moveFocusFrom(iframeRef.current, direction);
        },
        onFocusEnter: () => {
          if (iframeRef.current !== null) focusEntered(iframeRef.current);
        },
        onReveal: (rect) => {
          if (iframeRef.current !== null) revealRect(iframeRef.current, rect);
        },
        onPointerDown: (inside) =>
          interactionInside(
            internalRef.current?.overlay.entry ?? parentOverlay,
            inside,
            token,
          ),
      },
    });

    const openOverlay = (params: OverlayOpenParams): void => {
      // HTML content is shown like the `html` prop (opaque, the owner's
      // network policy), so it needs no origin check.
      if ("src" in params.content) {
        const allowed = configRef.current.overlayOrigins ?? "same-origin";
        let contentOrigin: string;
        try {
          contentOrigin = new URL(params.content.src).origin;
        } catch {
          throw new RemoteComponentError("overlay", "Invalid overlay src");
        }
        const ok =
          allowed === "any" ||
          (allowed === "same-origin"
            ? contentOrigin === remoteOrigin
            : allowed.includes(contentOrigin));
        if (!ok)
          throw new RemoteComponentError(
            "overlay",
            `Overlay content from ${contentOrigin} is not allowed by this host`,
          );
      }
      if (params.kind === "popover" && params.anchor === undefined)
        throw new RemoteComponentError("overlay", "Popovers need an anchor");
      if (overlaysRef.current.some((o) => o.params.id === params.id))
        throw new RemoteComponentError("overlay", "Duplicate overlay id");
      const proxies = controller.proxies!;
      const decoded = proxies.decode(
        `overlay:${params.id}`,
        params.content.props,
      );
      if (
        decoded === null ||
        typeof decoded !== "object" ||
        Array.isArray(decoded)
      )
        throw new RemoteComponentError(
          "overlay",
          "Overlay props must be an object",
        );
      setOverlays((list) => [
        ...list,
        {
          params,
          props: decoded as Record<string, unknown>,
          anchor: params.anchor ?? null,
        },
      ]);
    };

    controllerRef.current = controller;
    if (frame.kind === "url")
      unregisterFocus = registerFocusTarget(frame.iframe, enterFocus);
    controller.start();
    return () => {
      unregisterFocus();
      controller.dispose();
      if (isolation === "scf") iframeRef.current = null;
      if (controllerRef.current === controller) controllerRef.current = null;
      setOverlays([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only on these
  }, [
    absoluteSrc,
    html,
    sandbox,
    reloadKey,
    visible,
    scfInstance,
    isolation,
    networkKey,
  ]);

  // Props: diffed and sent after every render (coalesced per microtask).
  useLayoutEffect(() => {
    controllerRef.current?.propsChanged();
  });

  // Theme: re-read when the document theme may have changed or slot styling changed.
  const styleKey = JSON.stringify(style ?? null);
  useLayoutEffect(() => {
    controllerRef.current?.themeChanged();
  }, [className, styleKey]);
  useEffect(() => {
    const doc = slotRef.current?.ownerDocument;
    if (doc === undefined) return;
    return watchTheme(doc, () => {
      controllerRef.current?.themeChanged();
      // Class or style changes can make an ancestor a query container.
      layoutUpdateRef.current();
    });
  }, []);

  // Layout: observe the sizer; send exact width (and height when constrained).
  useLayoutEffect(() => {
    const sizer = sizerRef.current;
    if (sizer === null) return;
    // The position watcher calls `check` every frame of a burst, for every
    // slot. It compares a cheap key (the sizer's rect, the DPR and the sizes
    // of the known query containers) and does the full update only when it
    // changed: no ancestor walk or style reads on frames where nothing moved.
    let lastKey = "";
    const key = (): string => {
      const r = sizer.getBoundingClientRect();
      let k = `${r.x},${r.y},${r.width},${r.height},${sizer.ownerDocument.defaultView?.devicePixelRatio ?? 1},${sizer.ownerDocument.documentElement.clientHeight}`;
      for (const el of containerEls.current) {
        const c = el.getBoundingClientRect();
        k += `|${c.width},${c.height}`;
      }
      return k;
    };
    const update = (): void => {
      const layout = readLayout();
      placeIframe(iframeRef.current, layout.offsetX, layout.offsetY);
      lastKey = key();
      const c = controllerRef.current;
      if (c === null) return;
      c.layoutChanged(layout);
      checkReveal();
    };
    const check = (): void => {
      if (key() !== lastKey) update();
    };
    layoutUpdateRef.current = update;
    const ro = new ResizeObserver(() => {
      poke();
      update();
      // Container queries can restyle the slot's ancestors when it resizes.
      controllerRef.current?.themeChanged();
    });
    ro.observe(sizer);
    // The host viewport height is part of the layout (vh in auto-height remotes).
    const win = sizer.ownerDocument.defaultView;
    win?.addEventListener("resize", check);
    const unwatch = watchPosition(check);
    return () => {
      layoutUpdateRef.current = () => {};
      ro.disconnect();
      win?.removeEventListener("resize", check);
      unwatch();
    };
  }, [readLayout, checkReveal]);

  // After every size report or status change: push layout (sizer changed) and check reveal.
  useLayoutEffect(() => {
    const c = controllerRef.current;
    if (c === null || status !== "ready") return;
    const layout = readLayout();
    placeIframe(iframeRef.current, layout.offsetX, layout.offsetY);
    c.layoutChanged(layout);
    checkReveal();
    poke();
  }, [size, status, readLayout, checkReveal]);

  // Never stay hidden: reveal at most 250ms after ready even if layout keeps moving.
  useEffect(() => {
    if (status !== "ready" || revealed) return;
    const t = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(t);
  }, [status, revealed]);

  useEffect(() => {
    if (revealed && status === "ready") internalRef.current?.onSettled?.();
  }, [revealed, status]);
  useEffect(() => {
    if (size !== null) internalRef.current?.onSize?.(size);
  }, [size]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  useImperativeHandle(
    ref,
    () => ({
      reload: retry,
      focus: (target = "first", options) => {
        if (iframeRef.current !== null) expectFocus(iframeRef.current);
        iframeRef.current?.focus();
        controllerRef.current?.focus(target, options?.focusVisible);
      },
      get iframe() {
        return iframeRef.current;
      },
      status,
    }),
    [retry, status],
  );

  const ready = status === "ready" && size !== null;
  const sizerStyle: CSSProperties = ready
    ? {
        position: "relative",
        display: "block",
        minWidth: size.minContent,
        minHeight: size.height,
        height: "100%",
      }
    : {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 0,
        overflow: "hidden",
        visibility: "hidden",
        pointerEvents: "none",
      };
  const frameTitleRef = useRef(frameTitle ?? "Remote component");
  frameTitleRef.current = frameTitle ?? "Remote component";
  // Visibility is applied imperatively so it also reaches iframes created by SCF.
  useLayoutEffect(() => {
    const el = iframeRef.current;
    if (el !== null) el.style.visibility = ready && revealed ? "" : "hidden";
  });

  const dismissOverlay = useCallback(
    (id: string, reason: Parameters<OverlayEntry["dismiss"]>[0]) => {
      const exists = overlaysRef.current.some((o) => o.params.id === id);
      if (!exists) return;
      setOverlays((list) => list.filter((o) => o.params.id !== id));
      controllerRef.current?.dismissOverlay(id, reason);
    },
    [],
  );

  const restoreFocus = useCallback((focusVisible?: boolean) => {
    if (iframeRef.current !== null) expectFocus(iframeRef.current);
    iframeRef.current?.focus();
    controllerRef.current?.focus("restore", focusVisible);
  }, []);

  const contextEntry = internal?.overlay.entry ?? parentOverlay;

  return (
    <div
      ref={slotRef}
      data-rc-slot=""
      data-rc-status={status}
      data-rc-revealed={ready && revealed ? "" : undefined}
      className={className}
      style={{ position: "relative", ...style }}
    >
      <div
        ref={sizerRef}
        data-rc-sizer=""
        data-rc-internal=""
        style={sizerStyle}
      >
        <canvas
          aria-hidden="true"
          style={{
            display: "block",
            width: ready ? size.maxContent : 0,
            maxWidth: "100%",
            height: 0,
          }}
        />
        {isolation === "url" ? (
          // A new element per (src, sandbox, reload): changing only the fragment
          // (new nonce) would be a same-document navigation, not a reload, and
          // sandbox flags only apply to the next navigation.
          <iframe
            key={`${reloadKey}|${absoluteSrc ?? ""}|${html ?? ""}|${sandbox}|${networkKey}`}
            ref={iframeRef}
            title={frameTitle ?? "Remote component"}
            sandbox={sandbox}
            allow={allow}
            referrerPolicy="strict-origin"
            style={URL_IFRAME_STYLE}
            {...(html === undefined && frameCsp(network) !== undefined
              ? ({ csp: frameCsp(network) } as Record<string, string>)
              : {})}
          />
        ) : null}
      </div>
      {status === "error" && error !== null
        ? typeof errorFallback === "function"
          ? errorFallback(error, retry)
          : (errorFallback ?? null)
        : !ready
          ? (fallback ?? null)
          : null}
      {overlays.map((o) => (
        <OverlayView
          key={o.params.id}
          isolation={isolation}
          network={network}
          overlay={o}
          owner={token}
          ownerIframe={iframeRef}
          parent={contextEntry}
          zIndex={config.overlayZIndex ?? 2147483000}
          onDismiss={dismissOverlay}
          onRestoreFocus={restoreFocus}
        />
      ))}
    </div>
  );
}

/** Styles every remote iframe gets; top/left/width/height come from placeIframe(). */
const BASE_IFRAME_STYLE = {
  position: "absolute",
  border: "0",
  margin: "0",
  padding: "0",
  display: "block",
  background: "transparent",
  colorScheme: "inherit",
} as const;
const URL_IFRAME_STYLE: CSSProperties = {
  ...BASE_IFRAME_STYLE,
  visibility: "hidden",
};

function stripSameOrigin(sandbox: string, strip: boolean): string {
  return strip
    ? sandbox
        .split(/\s+/)
        .filter((t) => t !== "" && t !== "allow-same-origin")
        .join(" ")
    : sandbox;
}

/**
 * The single-file document for a remote URL: the URL itself when it names a
 * file, else `single.html` in that directory (the Vite plugin's layout).
 * So one `src` works with both isolation modes.
 */
export function singleFileUrl(src: string): string {
  const url = new URL(src);
  if (url.pathname.endsWith("/")) url.pathname += "single.html";
  url.hash = "";
  return url.href;
}

/** Fetches the document for SCF: the single-file build when there is one, else the page itself. */
async function defaultLoadHtml(src: string): Promise<string> {
  const single = singleFileUrl(src);
  let res = await fetch(single, { credentials: "omit" });
  const page = src.split("#")[0]!;
  if (res.status === 404 && single !== page)
    res = await fetch(page, { credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Puts the iframe's top-left corner on the frame grid line at or before
 * the sizer's corner (frameGridStep: the browser does not have to snap
 * it); the remote offsets its root by (offsetX, offsetY), so content lands
 * exactly where it would inline.
 *
 * The iframe is sized to cover the sizer plus the offset plus 1px, rounded
 * up to a size that is a whole number of CSS px *and* of device px. A
 * frame's viewport is a whole number of CSS px; if the element is not, the
 * engine scales the frame's content to fit (visible as glyphs shifted by a
 * fraction of a pixel at DPR 1.5 or 2). The extra px are clipped away.
 */
function placeIframe(
  iframe: HTMLIFrameElement | null,
  offsetX: number,
  offsetY: number,
): void {
  if (iframe === null) return;
  const sizer = iframe.parentElement;
  if (sizer === null) return;
  const r = sizer.getBoundingClientRect();
  const dpr = iframe.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  const width = frameExtent(r.width + offsetX + 1, dpr);
  const height = frameExtent(r.height + offsetY + 1, dpr);
  // Clip to the slot's area rounded out to whole device px: the extra area
  // never shows anything (a frame can keep a stale surface there after
  // resizes) or catches pointer events meant for neighbouring content.
  const ceilDevice = (v: number): number => Math.ceil(v * dpr - 1e-6) / dpr;
  const clipRight = Math.max(0, width - ceilDevice(offsetX + r.width));
  const clipBottom = Math.max(0, height - ceilDevice(offsetY + r.height));
  const next = {
    left: -offsetX,
    top: -offsetY,
    width,
    height,
    clipRight,
    clipBottom,
  };
  // Compare with what we wrote, not with style strings (engines serialise
  // lengths to 6 significant digits, so they rarely compare equal).
  const prev = placed.get(iframe);
  if (
    prev !== undefined &&
    prev.left === next.left &&
    prev.top === next.top &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.clipRight === next.clipRight &&
    prev.clipBottom === next.clipBottom
  )
    return;
  placed.set(iframe, next);
  const s = iframe.style;
  s.left = `${next.left}px`;
  s.top = `${next.top}px`;
  s.width = `${next.width}px`;
  s.height = `${next.height}px`;
  s.clipPath =
    next.clipRight === 0 && next.clipBottom === 0
      ? ""
      : `inset(0px ${next.clipRight}px ${next.clipBottom}px 0px)`;
}

const placed = new WeakMap<
  HTMLIFrameElement,
  {
    left: number;
    top: number;
    width: number;
    height: number;
    clipRight: number;
    clipBottom: number;
  }
>();

/**
 * Spacing (CSS px) of the grid iframes are anchored on: the smallest whole
 * number of CSS px that is also a whole number of device px (1 at DPR 1
 * and 2, 2 at DPR 1.5, 4 at DPR 1.25). Engines snap a frame's origin
 * differently (WebKit and Firefox to device px, Chromium to whole CSS px),
 * and a grid line is both, so content placed relative to it lands where it
 * would inline in every engine.
 */
function frameGridStep(dpr: number): number {
  for (let k = 1; k <= 16; k++)
    if (Math.abs(k * dpr - Math.round(k * dpr)) < 1e-3) return k;
  return 1;
}

/** Smallest whole CSS px ≥ `need` that is also a whole number of device px (searching a few px). */
function frameExtent(need: number, dpr: number): number {
  const start = Math.ceil(need - 1e-6);
  for (let w = start; w < start + 16; w++) {
    const device = w * dpr;
    if (Math.abs(device - Math.round(device)) < 1e-3) return w;
  }
  return start;
}
