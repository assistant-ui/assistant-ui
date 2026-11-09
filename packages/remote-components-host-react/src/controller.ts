import {
  Channel,
  diffProps,
  FunctionProxies,
  propsFunctionPathSet,
  FunctionTargets,
  negotiateVersion,
  NONCE_PARAM,
  RemoteComponentError,
  SUPPORTED_VERSIONS,
  validateFromRemote,
  deserializeError,
  jsonRpcCode,
  type DismissReason,
  type EncodedProps,
  type HostChannel,
  type InitializeRequest,
  type InitializeResponse,
  type LayoutInfo,
  type OverlayKind,
  type OverlayOpenParams,
  type OverlayUpdateParams,
  type Rect,
  type SizeReport,
  type ThemeSnapshot,
} from "@assistant-ui/remote-components-protocol";
import { createNonce, registerFrame } from "./handshake.js";

export interface ControllerEvents {
  onConnected?(): void;
  /** The remote document reloaded itself: drop state tied to the old document (overlays). */
  onReset?(): void;
  onReady(size: SizeReport): void;
  onSize(size: SizeReport): void;
  onError(error: RemoteComponentError, fatal: boolean): void;
  onOverlayOpen?(params: OverlayOpenParams): Promise<void> | void;
  onOverlayUpdate?(params: OverlayUpdateParams): void;
  onOverlayAnchor?(id: string, anchor: Rect): void;
  onOverlayClose?(id: string): void;
  onEscape?(): void;
  onPointerDown?(insideAnchorOf: string[]): void;
  onFocusExit?(direction: "next" | "previous"): void;
  onFocusEnter?(): void;
  onReveal?(rect: Rect): void;
}

/** Options for rendering through safe-content-frame. */
interface ScfFrameOptions {
  /** SCF product id (the shim path segment). */
  product: string;
  /** Salt for the hashed origin: same salt + product + host origin ⇒ same origin. */
  salt: string;
  /** Self-hosted shim domain (`unsafeShimDomain`); must be on the Public Suffix List in production. */
  shimDomain?: string;
  /** Extra sandbox tokens (allow-scripts and allow-same-origin are always set by SCF). */
  sandbox?: string[];
}

export type FrameSource =
  /** Navigate our own iframe to the remote URL (publisher-hosted origin, dev servers). */
  | { kind: "url"; iframe: HTMLIFrameElement; opaque: boolean }
  /** Show a document the host prepared (`html` prop) in our own iframe through `srcdoc`, always opaque. */
  | { kind: "srcdoc"; iframe: HTMLIFrameElement; load: () => Promise<string> }
  /** Show a document in a Safe Content Frame created inside `container`. `load` returns the prepared document. */
  | {
      kind: "scf";
      container: HTMLElement;
      load: () => Promise<string>;
      options: ScfFrameOptions;
      onIframe: (iframe: HTMLIFrameElement) => void;
    };

export interface ControllerConfig {
  /** Absolute remote URL (identity for overlay origin checks; navigated in url mode). */
  src: string;
  frame: FrameSource;
  /** ms until `ready` must arrive. */
  timeout: number;
  /** ms after the document's `load` event within which `rc/initialize` must arrive. */
  initializeAfterLoadTimeout: number;
  getProps(): Record<string, unknown>;
  getTheme(): ThemeSnapshot;
  getLayout(): LayoutInfo;
  overlay?: { kind: OverlayKind };
  events: ControllerEvents;
}

/**
 * Host side of one remote component instance: navigates the iframe, runs
 * the handshake, and owns the channel. Framework-agnostic; the React
 * component drives it.
 *
 * Lifecycle: start() → rc/initialize → ready → updates … → dispose().
 * An `rc/initialize` with a new session from the same frame (the remote
 * document reloaded itself) re-runs the handshake on a fresh channel and
 * resends everything.
 */
export class FrameController {
  /** Origin of `src` (the publisher), used for policy decisions. */
  readonly remoteOrigin: string;
  /** Origin the frame's document actually runs on (differs from remoteOrigin under SCF; "null" when opaque). */
  private frameOrigin: string | null = null;
  private iframe: HTMLIFrameElement | null;
  private session: string | null = null;
  private scfDispose: (() => void) | null = null;
  readonly targets = new FunctionTargets();
  private channel: HostChannel | null = null;
  private proxiesInstance: FunctionProxies | null = null;
  private nonce = "";
  private unregister: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;
  private probeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEncoded: EncodedProps | null = null;
  /** Function paths in `lastEncoded`: the only host functions the remote may call. */
  private sentFunctions = new Set<string>();
  private seq = 0;
  private propsScheduled = false;
  private lastThemeJson = "";
  private lastLayout: LayoutInfo | null = null;
  private ready = false;
  private disposed = false;
  private failed = false;
  private readonly onLoad = (): void => this.handleLoad();

  private readonly config: ControllerConfig;

  constructor(config: ControllerConfig) {
    this.config = config;
    this.remoteOrigin = new URL(config.src).origin;
    this.iframe = config.frame.kind === "scf" ? null : config.frame.iframe;
    // Only functions the remote was sent: a prop that failed to encode (a
    // React element, a DOM node) or a non-enumerable property must not
    // expose the functions inside it.
    this.targets.register(
      "props",
      () => this.config.getProps(),
      (path) => this.sentFunctions.has(JSON.stringify(path)),
    );
  }

  get isReady(): boolean {
    return this.ready;
  }

  get connected(): boolean {
    return this.channel !== null && !this.channel.isClosed;
  }

  /** Proxies for functions the remote passes to the host (overlay props). */
  get proxies(): FunctionProxies | null {
    return this.proxiesInstance;
  }

  start(): void {
    this.timer = setTimeout(
      () =>
        this.fail(
          new RemoteComponentError(
            "timeout",
            `Remote component did not become ready within ${this.config.timeout}ms`,
          ),
        ),
      this.config.timeout,
    );
    const frame = this.config.frame;
    if (frame.kind === "url") {
      const iframe = frame.iframe;
      this.nonce = createNonce();
      this.frameOrigin = frame.opaque ? "null" : this.remoteOrigin;
      this.register(iframe);
      iframe.addEventListener("load", this.onLoad);
      iframe.src = withNonce(this.config.src, this.nonce);
      // Some engines fire no `load` for failed navigations (Firefox: empty
      // error responses). If nothing has happened after the rc/initialize window,
      // probe the URL once so a missing remote fails fast with a clear error.
      this.probeTimer = setTimeout(
        () => void this.probe(),
        this.config.initializeAfterLoadTimeout,
      );
      return;
    }
    if (frame.kind === "srcdoc") {
      void this.startSrcdoc(frame);
      return;
    }
    void this.startScf(frame);
  }

  private async startSrcdoc(
    frame: Extract<FrameSource, { kind: "srcdoc" }>,
  ): Promise<void> {
    let html: string;
    try {
      html = await frame.load();
    } catch (err) {
      this.fail(
        new RemoteComponentError(
          "load",
          `Could not prepare the remote document: ${String(err)}`,
        ),
      );
      return;
    }
    if (this.disposed || this.failed) return;
    this.nonce = ""; // srcdoc documents have no URL fragment
    this.frameOrigin = "null";
    this.register(frame.iframe);
    frame.iframe.addEventListener("load", this.onLoad);
    frame.iframe.srcdoc = html;
  }

  private register(iframe: HTMLIFrameElement): void {
    this.unregister = registerFrame(
      this.nonce,
      {
        window: () => iframe.contentWindow,
        origin: this.frameOrigin!,
        onInitialize: (event, request) => this.handleInitialize(event, request),
      },
      iframe.ownerDocument.defaultView!,
    );
  }

  private async startScf(
    frame: Extract<FrameSource, { kind: "scf" }>,
  ): Promise<void> {
    let html: string;
    try {
      html = await frame.load();
    } catch (err) {
      this.fail(
        new RemoteComponentError(
          "load",
          `Could not load the remote document for ${this.config.src}: ${String(err)}`,
        ),
      );
      return;
    }
    if (this.disposed || this.failed) return;
    try {
      const { SafeContentFrame } = await import("safe-content-frame");
      const scf = new SafeContentFrame(frame.options.product, {
        salt: frame.options.salt,
        ...(frame.options.shimDomain !== undefined
          ? { unsafeShimDomain: frame.options.shimDomain }
          : {}),
        ...(frame.options.sandbox !== undefined
          ? { sandbox: frame.options.sandbox as never }
          : {}),
      });
      const rendered = await scf.renderHtml(html, frame.container);
      if (this.disposed || this.failed) {
        rendered.dispose();
        return;
      }
      this.scfDispose = () => rendered.dispose();
      this.iframe = rendered.iframe;
      this.frameOrigin = rendered.origin;
      this.nonce = ""; // blob documents cannot see a URL fragment
      frame.onIframe(rendered.iframe);
      this.register(rendered.iframe);
      this.handleLoad();
    } catch (err) {
      this.fail(
        new RemoteComponentError(
          "load",
          `Safe Content Frame failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  /** Fetches `src` (no credentials) and fails with `load` if it is unreachable or not 2xx. */
  private async probe(): Promise<void> {
    this.probeTimer = null;
    if (
      this.session !== null ||
      this.loadTimer !== null ||
      this.disposed ||
      this.failed
    )
      return;
    const url = this.config.src.split("#")[0]!;
    let problem: string | null = null;
    try {
      const res = await fetch(url, { credentials: "omit", cache: "no-store" });
      if (!res.ok) problem = `HTTP ${res.status}`;
    } catch {
      // CORS or network. no-cors tells them apart: it only rejects on network errors.
      try {
        await fetch(url, {
          mode: "no-cors",
          credentials: "omit",
          cache: "no-store",
        });
      } catch (err) {
        problem = `network error (${String(err)})`;
      }
    }
    if (problem !== null && this.session === null)
      this.fail(
        new RemoteComponentError(
          "load",
          `Could not load remote component ${url}: ${problem}`,
        ),
      );
  }

  private handleLoad(): void {
    if (this.channel !== null || this.disposed || this.failed) return;
    if (this.loadTimer !== null) clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => {
      if (this.channel === null) {
        this.fail(
          new RemoteComponentError(
            "load",
            "The remote document loaded but did not start the remote-components runtime (wrong URL, HTTP error, or blocked script)",
          ),
        );
      }
    }, this.config.initializeAfterLoadTimeout);
  }

  private handleInitialize(
    event: MessageEvent,
    request: InitializeRequest,
  ): void {
    if (this.disposed || this.failed) return;
    const params = request.params;
    // rc/initialize repeats until answered: same session = duplicate. A new
    // session means the document reloaded itself: reconnect.
    if (params.session === this.session) return;
    this.session = params.session;
    const target = this.frameOrigin === "null" ? "*" : this.frameOrigin!;
    const source = event.source as Window;
    const version = negotiateVersion(SUPPORTED_VERSIONS, params.protocol);
    if (version === null) {
      const message = "No common protocol version";
      const refusal: InitializeResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: jsonRpcCode("protocol"),
          message,
          data: {
            name: "RemoteComponentError",
            message,
            code: "protocol",
            nonce: this.nonce,
            supported: SUPPORTED_VERSIONS,
          },
        },
      };
      source.postMessage(refusal, target);
      this.fail(
        new RemoteComponentError(
          "protocol",
          `Remote speaks protocol ${params.protocol.min}–${params.protocol.max}; host supports ${SUPPORTED_VERSIONS.min}–${SUPPORTED_VERSIONS.max}`,
        ),
      );
      return;
    }

    // A reload of the remote document: drop the old channel, its overlays and
    // proxies, and wait for ready again.
    if (this.channel !== null) {
      this.channel.close("The remote document reloaded");
      this.channel = null;
      this.config.events.onReset?.();
      if (this.timer === null) {
        this.timer = setTimeout(
          () =>
            this.fail(
              new RemoteComponentError(
                "timeout",
                `Remote component did not become ready within ${this.config.timeout}ms`,
              ),
            ),
          this.config.timeout,
        );
      }
    }
    this.ready = false;

    const { port1, port2 } = new MessageChannel();
    const channel: HostChannel = new Channel(port1, {
      validate: validateFromRemote,
      onInvalid: (m) =>
        console.warn(
          "[remote-components] Dropped invalid message from remote",
          m,
        ),
    });
    this.channel = channel;
    this.proxiesInstance = new FunctionProxies((ref, args, signal) =>
      channel.request("rc/call", { ref, args }, signal ? { signal } : {}),
    );
    this.wire(channel);

    const { encoded } = diffProps(null, this.config.getProps(), (key, err) =>
      this.reportPropError(key, err),
    );
    this.setSent(encoded);
    this.seq = 0;
    const theme = this.config.getTheme();
    this.lastThemeJson = JSON.stringify(theme);
    const layout = this.config.getLayout();
    this.lastLayout = layout;
    const response: InitializeResponse = {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        nonce: this.nonce,
        protocol: version,
        init: {
          src: this.config.src,
          props: encoded,
          theme,
          layout,
          ...(this.config.overlay ? { overlay: this.config.overlay } : {}),
        },
      },
    };
    try {
      source.postMessage(response, target, [port2]);
    } catch (err) {
      this.fail(
        new RemoteComponentError(
          "data",
          `Could not send initial props: ${String(err)}`,
        ),
      );
      return;
    }
    this.config.events.onConnected?.();
  }

  private wire(channel: HostChannel): void {
    const ev = this.config.events;
    channel.on("rc/notifications/ready", ({ size }) => {
      if (this.ready || this.failed) return;
      this.ready = true;
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      ev.onReady(size);
    });
    channel.on("rc/notifications/size-changed", ({ size }) => ev.onSize(size));
    channel.on("rc/notifications/error", ({ error }) => {
      // Uncaught errors in the remote are never fatal.
      const e = deserializeError(error);
      const code =
        e instanceof RemoteComponentError &&
        (e.code === "runtime" || e.code === "data")
          ? e.code
          : "runtime";
      ev.onError(
        e instanceof RemoteComponentError && e.code === code
          ? e
          : new RemoteComponentError(code, e.message, { cause: e }),
        false,
      );
    });
    channel.on("rc/notifications/escape-pressed", () => ev.onEscape?.());
    channel.on("rc/notifications/focus-exit", ({ direction }) =>
      ev.onFocusExit?.(direction),
    );
    channel.on("rc/notifications/focus-enter", () => ev.onFocusEnter?.());
    channel.on("rc/notifications/focus-changed", ({ rect }) =>
      ev.onReveal?.(rect),
    );
    channel.on("rc/notifications/pointer-down", ({ insideAnchorOf }) =>
      ev.onPointerDown?.(insideAnchorOf),
    );
    channel.on("rc/notifications/overlay-anchor-changed", ({ id, anchor }) =>
      ev.onOverlayAnchor?.(id, anchor),
    );
    channel.handle("rc/call", ({ ref, args }, { signal }) =>
      this.targets.invoke(ref, args, signal),
    );
    channel.handle("rc/overlay/open", async (params) => {
      if (ev.onOverlayOpen === undefined)
        throw new RemoteComponentError(
          "overlay",
          "This host does not render overlays",
        );
      await ev.onOverlayOpen(params);
      return null;
    });
    channel.handle("rc/overlay/update", (params) => {
      ev.onOverlayUpdate?.(params);
      return null;
    });
    channel.handle("rc/overlay/close", ({ id }) => {
      ev.onOverlayClose?.(id);
      this.proxiesInstance?.dropScope(`overlay:${id}`);
      return null;
    });
  }

  private setSent(encoded: EncodedProps): void {
    if (encoded !== this.lastEncoded)
      this.sentFunctions = propsFunctionPathSet(encoded);
    this.lastEncoded = encoded;
  }

  private reportPropError(key: string, err: unknown): void {
    const e =
      err instanceof RemoteComponentError
        ? err
        : new RemoteComponentError(
            "data",
            `Prop "${key}" could not be sent: ${String(err)}`,
          );
    this.config.events.onError(e, false);
  }

  /** Call after every host render; diffs and sends at most once per microtask. */
  propsChanged(): void {
    if (this.propsScheduled) return;
    this.propsScheduled = true;
    queueMicrotask(() => {
      this.propsScheduled = false;
      const channel = this.channel;
      if (channel === null || this.lastEncoded === null) return;
      const { encoded, patch } = diffProps(
        this.lastEncoded,
        this.config.getProps(),
        (key, err) => this.reportPropError(key, err),
      );
      this.setSent(encoded);
      if (patch !== null)
        channel.notify("rc/notifications/props-changed", {
          seq: ++this.seq,
          set: patch.set,
          del: patch.del,
        });
    });
  }

  themeChanged(): void {
    if (this.channel === null) return;
    const theme = this.config.getTheme();
    const json = JSON.stringify(theme);
    if (json === this.lastThemeJson) return;
    this.lastThemeJson = json;
    this.channel.notify("rc/notifications/theme-changed", { theme });
  }

  layoutChanged(layout: LayoutInfo): void {
    const l = this.lastLayout;
    if (
      l !== null &&
      l.width === layout.width &&
      l.height === layout.height &&
      l.offsetX === layout.offsetX &&
      l.offsetY === layout.offsetY &&
      l.viewportHeight === layout.viewportHeight &&
      JSON.stringify(l.containers ?? []) ===
        JSON.stringify(layout.containers ?? [])
    )
      return;
    this.lastLayout = layout;
    this.channel?.notify("rc/notifications/layout-changed", { layout });
  }

  get sentLayout(): LayoutInfo | null {
    return this.lastLayout;
  }

  /** `focusVisible`: show the focus ring (keyboard) or not (pointer); undefined lets the remote's browser decide. */
  focus(target: "first" | "last" | "restore", focusVisible?: boolean): void {
    this.channel
      ?.request("rc/focus", {
        target,
        ...(focusVisible === undefined ? {} : { focusVisible }),
      })
      .catch(() => {});
  }

  dismissOverlay(id: string, reason: DismissReason): void {
    this.channel?.notify("rc/notifications/overlay-dismissed", { id, reason });
    this.proxiesInstance?.dropScope(`overlay:${id}`);
  }

  private fail(err: RemoteComponentError): void {
    if (this.failed || this.disposed) return;
    this.failed = true;
    this.clearTimers();
    // A failed remote gets no more host services while the error fallback shows.
    this.unregister?.();
    this.unregister = null;
    this.channel?.close("The remote component failed");
    this.channel = null;
    this.config.events.onError(err, true);
  }

  private clearTimers(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.loadTimer !== null) clearTimeout(this.loadTimer);
    if (this.probeTimer !== null) clearTimeout(this.probeTimer);
    this.timer = this.loadTimer = this.probeTimer = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearTimers();
    this.unregister?.();
    this.iframe?.removeEventListener("load", this.onLoad);
    this.scfDispose?.();
    this.channel?.close("The remote component was unmounted");
    this.channel = null;
  }
}

/**
 * Appends `rc-nonce=…` to the URL fragment, keeping any existing fragment
 * (`#/route` becomes `#/route&rc-nonce=…`). The fragment is reserved for the
 * host; remotes should not use hash routing.
 */
export function withNonce(src: string, nonce: string): string {
  const url = new URL(src);
  const existing = url.hash.slice(1);
  url.hash =
    existing === ""
      ? `${NONCE_PARAM}=${nonce}`
      : `${existing}&${NONCE_PARAM}=${nonce}`;
  return url.href;
}
