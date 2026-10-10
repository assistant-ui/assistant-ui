import { SafeContentFrame, type RenderedFrame } from "safe-content-frame";
import { buildBootstrapHtml, themeContext } from "./bootstrap";
import type { CspOptions } from "./csp";
import {
  GENFRAME_PROTOCOL_VERSION,
  INIT_MESSAGE,
  METHODS,
  READY_MESSAGE,
  type ClearStorageResult,
  type ConsoleEntry,
  type DisplayMode,
  type EndResult,
  type FrameInspection,
  type HostContext,
  type InitMessage,
  type ScreenshotOptions,
  type WidgetError,
  type WidgetSize,
} from "./protocol";
import {
  createRpcPeer,
  isJsonRpcMessage,
  RPC_ERROR,
  RpcError,
  type RpcPeer,
} from "./rpc";
import { DEFAULT_LIGHT_TOKENS, type ThemeTokens } from "./theme";
import { VERSION } from "./version";

export type UiMessageParams = {
  role?: string;
  content?: { type: string; text?: string }[];
  [key: string]: unknown;
};

export type ToolCallRequest = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type WidgetHandlers = {
  /** A widget called `sendPrompt(text)`; send it as the user's next message. */
  onPrompt?: (text: string) => unknown;
  /** Raw MCP Apps `ui/message`. Takes precedence over `onPrompt`. */
  onMessage?: (params: UiMessageParams) => unknown;
  /** Defaults to opening an `http(s)` URL in a new tab with `noopener`. */
  onOpenLink?: (url: string) => unknown;
  onCallTool?: (call: ToolCallRequest) => unknown;
  onRequestDisplayMode?: (request: { mode: DisplayMode }) => unknown;
  onUpdateModelContext?: (params: unknown) => unknown;
  onWidgetState?: (state: unknown) => void;
  onResize?: (size: WidgetSize) => void;
  onError?: (error: WidgetError) => void;
  onLog?: (entry: ConsoleEntry) => void;
};

export type CreateWidgetOptions = WidgetHandlers & {
  container: HTMLElement;
  /** Scopes the frame origin, see `SafeContentFrame`. Defaults to `"generative-frame"`. */
  product?: string;
  /** A preconfigured `SafeContentFrame`, for example with `useShadowDom`. */
  frame?: SafeContentFrame;
  /**
   * Loads the Safe Content Frame shim from a domain you host instead of
   * `scf.auiusercontent.com`. Widgets are isolated from your app and from each
   * other only when the domain is a public suffix on the Public Suffix List.
   */
  unsafeShimDomain?: string;
  /**
   * Renders in a `sandbox="allow-scripts"` frame with an opaque (`null`)
   * origin instead of Safe Content Frame: no shim domain, and no storage or
   * cookies. Cannot be combined with `id`, `frame`, or `unsafeShimDomain`.
   */
  opaqueOrigin?: boolean;
  /**
   * Gives the widget a stable origin, so its localStorage, IndexedDB, and
   * cookies persist across reloads for this id on this host origin. Choose
   * it on the host (never from model output); widgets with the same id share
   * storage. Without an id, every frame gets a fresh origin.
   */
  id?: string;
  csp?: CspOptions | string;
  tokens?: ThemeTokens;
  /** Extra host context fields (locale, display mode, …) merged over the theme. */
  context?: HostContext;
  animate?: boolean;
  css?: string;
  /** The iframe never grows past this height; taller content scrolls inside it. */
  maxHeight?: number;
  minHeight?: number;
  readyTimeoutMs?: number;
  /** Complete code to render immediately, as `write(code)` then `end()`. */
  code?: string;
};

export type WidgetInspection = FrameInspection & { code: string };

export type Screenshot = { dataUrl: string; width: number; height: number };

export type WidgetEventMap = {
  ready: undefined;
  resize: WidgetSize;
  error: WidgetError;
  log: ConsoleEntry;
  end: EndResult;
};

export type WidgetHandle = {
  /** Resolves once the frame runtime is connected; rejects if it never connects. */
  readonly ready: Promise<void>;
  /** All code written so far. */
  readonly code: string;
  readonly ended: boolean;
  readonly iframe: HTMLIFrameElement | undefined;
  /** Appends streamed code. Rendering is coalesced to animation frames. */
  write(chunk: string): void;
  /** Marks the code complete and runs held scripts in order. */
  end(): Promise<EndResult>;
  /** Renders new complete code, morphing in place or remounting when scripts already ran. */
  replace(code: string): Promise<EndResult>;
  setTheme(tokens: ThemeTokens): void;
  setContext(context: HostContext): void;
  notifyToolInput(
    args: Record<string, unknown>,
    options?: { partial?: boolean },
  ): void;
  notifyToolResult(result: unknown): void;
  screenshot(options?: ScreenshotOptions): Promise<Screenshot>;
  inspect(): Promise<WidgetInspection>;
  on<K extends keyof WidgetEventMap>(
    event: K,
    listener: (payload: WidgetEventMap[K]) => void,
  ): () => void;
  dispose(): void;
};

const DEFAULT_PRODUCT = "generative-frame";

/** The Safe Content Frame salt behind a widget id's stable origin. */
export const widgetStorageSalt = (id: string) => `genframe:v1:${id}`;

type FrameRenderer = {
  renderHtml(html: string, container: HTMLElement): Promise<RenderedFrame>;
};

/**
 * An opaque origin cannot be named as a `postMessage` target, so messages to
 * the frame use `"*"`. A sandboxed frame keeps its opaque origin and window
 * when it navigates, so after a navigated document loads, `origin` stops
 * matching and nothing is posted to the frame. A navigated document can still
 * post before its own `load`; that grants it nothing the widget code could
 * not already do.
 */
const opaqueFrame: FrameRenderer = {
  async renderHtml(html, container) {
    const iframe = container.ownerDocument.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.cssText = "border:none;width:100%;height:100%";
    iframe.srcdoc = html;
    let loads = 0;
    iframe.addEventListener("load", () => loads++);
    container.appendChild(iframe);
    return {
      iframe,
      get origin() {
        return loads > 1 ? "" : "null";
      },
      sendMessage: (data, transfer) => {
        if (loads > 1) return;
        iframe.contentWindow?.postMessage(data, "*", transfer);
      },
      fullyLoadedPromiseWithTimeout: async () => {},
      dispose: () => iframe.remove(),
    };
  },
};

const resolveFrame = (
  options: Pick<
    CreateWidgetOptions,
    "frame" | "id" | "product" | "unsafeShimDomain" | "opaqueOrigin"
  >,
): FrameRenderer => {
  if (options.opaqueOrigin) {
    if (
      options.frame ||
      options.id !== undefined ||
      options.unsafeShimDomain !== undefined
    ) {
      throw new TypeError(
        "`opaqueOrigin` renders without Safe Content Frame, so it cannot be combined with `frame`, `id`, or `unsafeShimDomain`.",
      );
    }
    return opaqueFrame;
  }
  if (
    options.frame &&
    (options.id !== undefined || options.unsafeShimDomain !== undefined)
  ) {
    throw new TypeError(
      "`frame` cannot be combined with `id` or `unsafeShimDomain`; configure the `SafeContentFrame` instead, with `salt: widgetStorageSalt(id)` and `unsafeShimDomain` as needed.",
    );
  }
  return (
    options.frame ??
    new SafeContentFrame(options.product ?? DEFAULT_PRODUCT, {
      ...(options.id !== undefined
        ? { salt: widgetStorageSalt(options.id) }
        : {}),
      ...(options.unsafeShimDomain !== undefined
        ? { unsafeShimDomain: options.unsafeShimDomain }
        : {}),
    })
  );
};

/** Lets `clearWidgetStorage` send a request no public method exposes. */
const internalRequests = new WeakMap<
  WidgetHandle,
  <T>(method: string, params?: unknown) => Promise<T>
>();
const DEFAULT_READY_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;
const SCRIPT_TAG = /<script[\s>]/i;
const REVEAL_MS = 120;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const promptText = (params: UiMessageParams) =>
  (params.content ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");

const defaultOpenLink = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

type Session = {
  slot: HTMLElement;
  ready: Promise<void>;
  peer: () => RpcPeer;
  iframe: () => HTMLIFrameElement | undefined;
  /** Shows the iframe once the runtime has themed and laid out its document. */
  reveal(): void;
  dispose(): void;
};

/**
 * Mounts a widget frame in `container`. The frame loads a bootstrap document
 * once through Safe Content Frame; code then streams in over a private
 * `MessagePort`, so every chunk renders without reloading the frame.
 */
export function createWidget(options: CreateWidgetOptions): WidgetHandle {
  const { container } = options;
  const frame = resolveFrame(options);
  const minHeight = options.minHeight ?? 0;
  const maxHeight = options.maxHeight ?? Number.POSITIVE_INFINITY;
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;

  let tokens = options.tokens ?? DEFAULT_LIGHT_TOKENS;
  let context: HostContext = {
    ...themeContext(tokens),
    platform: "web",
    ...(Number.isFinite(maxHeight)
      ? { containerDimensions: { maxHeight } }
      : {}),
    ...options.context,
  };
  let code = "";
  let ended = false;
  let disposed = false;
  let lastToolInput:
    | { args: Record<string, unknown>; partial: boolean }
    | undefined;
  let lastToolResult: { result: unknown } | undefined;
  const listeners = new Map<
    keyof WidgetEventMap,
    Set<(payload: never) => void>
  >();

  const emit = <K extends keyof WidgetEventMap>(
    event: K,
    payload: WidgetEventMap[K],
  ) => {
    for (const listener of listeners.get(event) ?? []) {
      try {
        (listener as (payload: WidgetEventMap[K]) => void)(payload);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const reportError = (error: WidgetError) => {
    options.onError?.(error);
    emit("error", error);
  };

  const onRequest = async (method: string, params: unknown) => {
    const p = (params ?? {}) as Record<string, unknown>;
    switch (method) {
      case METHODS.initialize:
        return {
          protocolVersion:
            typeof p["protocolVersion"] === "string"
              ? p["protocolVersion"]
              : GENFRAME_PROTOCOL_VERSION,
          hostInfo: { name: "generative-frame", version: VERSION },
          hostCapabilities: {
            openLinks: {},
            ...(options.onCallTool ? { serverTools: {} } : {}),
            ...(options.onMessage || options.onPrompt
              ? { message: { text: {} } }
              : {}),
            ...(options.onUpdateModelContext
              ? { updateModelContext: { text: {} } }
              : {}),
            logging: {},
          },
          hostContext: context,
        };
      case METHODS.message: {
        if (options.onMessage) return options.onMessage(p as UiMessageParams);
        if (options.onPrompt) {
          await options.onPrompt(promptText(p as UiMessageParams));
          return {};
        }
        throw new RpcError(
          RPC_ERROR.methodNotFound,
          "This host does not accept messages",
        );
      }
      case METHODS.openLink: {
        const url = p["url"];
        let protocol = "";
        try {
          protocol = typeof url === "string" ? new URL(url).protocol : "";
        } catch {}
        if (protocol !== "http:" && protocol !== "https:") {
          throw new RpcError(
            RPC_ERROR.invalidParams,
            "ui/open-link requires an http(s) URL",
          );
        }
        await (options.onOpenLink ?? defaultOpenLink)(url as string);
        return {};
      }
      case METHODS.callTool: {
        if (!options.onCallTool) {
          throw new RpcError(
            RPC_ERROR.methodNotFound,
            "This host does not expose tools",
          );
        }
        if (typeof p["name"] !== "string") {
          throw new RpcError(
            RPC_ERROR.invalidParams,
            "tools/call requires a string 'name'",
          );
        }
        const args = p["arguments"];
        if (
          args !== undefined &&
          (typeof args !== "object" || args === null || Array.isArray(args))
        ) {
          throw new RpcError(
            RPC_ERROR.invalidParams,
            "tools/call 'arguments' must be an object",
          );
        }
        return options.onCallTool({
          name: p["name"],
          ...(args !== undefined
            ? { arguments: args as Record<string, unknown> }
            : {}),
        });
      }
      case METHODS.requestDisplayMode: {
        const mode = p["mode"];
        if (mode !== "inline" && mode !== "fullscreen" && mode !== "pip") {
          throw new RpcError(
            RPC_ERROR.invalidParams,
            "ui/request-display-mode requires a valid 'mode'",
          );
        }
        if (!options.onRequestDisplayMode)
          return { mode: context.displayMode ?? "inline" };
        return (await options.onRequestDisplayMode({ mode })) ?? { mode };
      }
      case METHODS.updateModelContext:
        if (!options.onUpdateModelContext) {
          throw new RpcError(
            RPC_ERROR.methodNotFound,
            "This host does not accept model context",
          );
        }
        return options.onUpdateModelContext(params);
      default:
        throw new RpcError(
          RPC_ERROR.methodNotFound,
          `Unknown method: ${method}`,
        );
    }
  };

  let activeSession: Session | undefined;

  const applySize = (session: Session, size: WidgetSize) => {
    const iframe = session.iframe();
    if (iframe) {
      const height = Math.min(Math.max(size.height, minHeight), maxHeight);
      iframe.style.height = `${height}px`;
      session.reveal();
    }
    if (session === activeSession) {
      options.onResize?.(size);
      emit("resize", size);
    }
  };

  const createSession = (hidden: boolean): Session => {
    const slot = container.ownerDocument.createElement("div");
    slot.dataset["generativeFrame"] = "";
    // Safe Content Frame appends the iframe at once, and its shim paints an
    // opaque canvas before the runtime themes the document, so the slot stays
    // transparent (but laid out) until the runtime's first size report.
    slot.style.cssText = hidden
      ? "display:block;height:0;overflow:hidden;visibility:hidden;pointer-events:none;opacity:0"
      : "display:block;opacity:0";
    container.appendChild(slot);

    let rendered: RenderedFrame | undefined;
    let peer: RpcPeer | undefined;
    let initSent = false;
    let sessionDisposed = false;
    let revealed = false;
    let resolveReady!: () => void;
    let rejectReady!: (error: unknown) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    void ready.catch(() => {});

    const session: Session = {
      slot,
      ready,
      peer: () => {
        if (!peer) throw new Error("Widget frame is not connected");
        return peer;
      },
      iframe: () => rendered?.iframe,
      reveal() {
        if (revealed) return;
        revealed = true;
        if (!prefersReducedMotion()) {
          slot.style.transition = `opacity ${REVEAL_MS}ms ease-out`;
        }
        slot.style.opacity = "1";
      },
      dispose() {
        if (sessionDisposed) return;
        sessionDisposed = true;
        clearTimeout(timer);
        window.removeEventListener("message", onWindowMessage);
        peer?.dispose();
        rendered?.dispose();
        slot.remove();
        rejectReady(new Error("Widget disposed"));
      },
    };

    const fail = (message: string) => {
      if (sessionDisposed) return;
      rejectReady(new Error(message));
      reportError({ kind: "error", message });
    };
    const timer = setTimeout(
      () => fail(`Widget frame did not connect within ${readyTimeoutMs}ms`),
      readyTimeoutMs,
    );

    const sendInit = () => {
      if (initSent || !rendered) return;
      initSent = true;
      const channel = new MessageChannel();
      peer = createRpcPeer(channel.port1, {
        onRequest,
        onNotification: (method, params) => {
          const p = (params ?? {}) as Record<string, unknown>;
          switch (method) {
            case METHODS.ready:
              clearTimeout(timer);
              resolveReady();
              return;
            case METHODS.sizeChanged:
              if (
                typeof p["height"] === "number" &&
                typeof p["width"] === "number"
              ) {
                applySize(session, { width: p["width"], height: p["height"] });
              }
              return;
            case METHODS.error:
              if (session === activeSession) reportError(p as WidgetError);
              return;
            case METHODS.log:
              if (session === activeSession) {
                options.onLog?.(p as ConsoleEntry);
                emit("log", p as ConsoleEntry);
              }
              return;
            case METHODS.widgetState:
              options.onWidgetState?.(p["state"]);
              return;
            default:
              return;
          }
        },
      });
      const init: InitMessage = {
        type: INIT_MESSAGE,
        context,
      };
      rendered.sendMessage(init, [channel.port2]);
    };

    // Widgets built on the MCP Apps SDK talk to `window.parent` rather than the port.
    function onWindowMessage(event: MessageEvent) {
      if (!rendered) return;
      if (
        event.source !== rendered.iframe.contentWindow ||
        event.origin !== rendered.origin
      ) {
        return;
      }
      const data: unknown = event.data;
      if ((data as { type?: unknown } | null)?.type === READY_MESSAGE) {
        sendInit();
        return;
      }
      if (peer && isJsonRpcMessage(data)) {
        const target = rendered;
        peer.receive(data, (message) => target.sendMessage(message));
      }
    }
    window.addEventListener("message", onWindowMessage);

    const html = buildBootstrapHtml({
      hostOrigin: window.location.origin,
      tokens,
      ...(options.csp !== undefined ? { csp: options.csp } : {}),
      ...(options.animate !== undefined ? { animate: options.animate } : {}),
      ...(options.css !== undefined ? { css: options.css } : {}),
    });

    frame.renderHtml(html, slot).then(
      (result) => {
        if (sessionDisposed) {
          result.dispose();
          return;
        }
        rendered = result;
        const style = result.iframe.style;
        style.display = "block";
        style.height = `${minHeight}px`;
        style.colorScheme = tokens.colorScheme;
        result.iframe.setAttribute("title", "Generated widget");
        result
          .fullyLoadedPromiseWithTimeout(readyTimeoutMs)
          .catch((error: unknown) =>
            fail(error instanceof Error ? error.message : String(error)),
          );
      },
      (error: unknown) =>
        fail(error instanceof Error ? error.message : String(error)),
    );

    return session;
  };

  activeSession = createSession(false);

  type Op = { kind: "write"; chunk: string } | { kind: "run"; run: () => void };
  let queue: Op[] | undefined = [];
  activeSession.ready.then(
    () => {
      const ops = queue ?? [];
      queue = undefined;
      emit("ready", undefined);
      for (const op of ops) {
        if (op.kind === "write")
          activeSession?.peer().notify(METHODS.write, { chunk: op.chunk });
        else op.run();
      }
    },
    () => {},
  );

  const enqueue = (run: () => void) => {
    if (queue) queue.push({ kind: "run", run });
    else run();
  };

  const request = <T>(method: string, params?: unknown) =>
    new Promise<T>((resolve, reject) => {
      const session = activeSession;
      if (!session || disposed) {
        reject(new Error("Widget disposed"));
        return;
      }
      session.ready.then(
        () =>
          enqueue(() => {
            session
              .peer()
              .request(method, params, { timeoutMs: REQUEST_TIMEOUT_MS })
              .then((value) => resolve(value as T), reject);
          }),
        reject,
      );
    });

  const notify = (method: string, params: unknown) => {
    const session = activeSession;
    if (!session || disposed) return;
    enqueue(() => {
      try {
        session.peer().notify(method, params);
      } catch {}
    });
  };

  const replayState = (session: Session) => {
    const peer = session.peer();
    if (lastToolInput) {
      peer.notify(
        lastToolInput.partial ? METHODS.toolInputPartial : METHODS.toolInput,
        { arguments: lastToolInput.args },
      );
    }
    if (lastToolResult) peer.notify(METHODS.toolResult, lastToolResult.result);
  };

  const remount = async (next: string): Promise<EndResult> => {
    const previous = activeSession;
    const session = createSession(true);
    await session.ready;
    if (disposed) throw new Error("Widget disposed");
    replayState(session);
    const result = (await session
      .peer()
      .request(
        METHODS.replace,
        { code: next },
        { timeoutMs: REQUEST_TIMEOUT_MS },
      )) as EndResult;
    if (disposed) throw new Error("Widget disposed");
    activeSession = session;
    // The new frame has rendered completely, so it swaps in without a fade.
    session.slot.style.cssText = "display:block";
    applySize(session, result.size);
    previous?.dispose();
    return result;
  };

  const handle: WidgetHandle = {
    ready: activeSession.ready,
    get code() {
      return code;
    },
    get ended() {
      return ended;
    },
    get iframe() {
      return activeSession?.iframe();
    },
    write(chunk) {
      if (disposed || !chunk) return;
      if (ended) throw new Error("Cannot write after end(); use replace()");
      code += chunk;
      const last = queue?.[queue.length - 1];
      if (queue) {
        if (last?.kind === "write") last.chunk += chunk;
        else queue.push({ kind: "write", chunk });
        return;
      }
      activeSession?.peer().notify(METHODS.write, { chunk });
    },
    async end() {
      ended = true;
      const result = await request<EndResult>(METHODS.end);
      emit("end", result);
      return result;
    },
    async replace(next) {
      const scriptsRan = ended && SCRIPT_TAG.test(code);
      code = next;
      ended = true;
      const result = scriptsRan
        ? await remount(next)
        : await request<EndResult>(METHODS.replace, { code: next });
      emit("end", result);
      return result;
    },
    setTheme(next) {
      tokens = next;
      context = { ...context, ...themeContext(next) };
      notify(METHODS.hostContextChanged, themeContext(next));
      // An iframe whose color-scheme differs from its document's paints an
      // opaque canvas, so the element follows only after the frame switched.
      const session = activeSession;
      const followTheme = () => {
        const iframe = session?.iframe();
        if (iframe && tokens === next)
          iframe.style.colorScheme = next.colorScheme;
      };
      request(METHODS.inspect).then(followTheme, followTheme);
    },
    setContext(partial) {
      context = { ...context, ...partial };
      notify(METHODS.hostContextChanged, partial);
    },
    notifyToolInput(args, notifyOptions) {
      const partial = notifyOptions?.partial ?? false;
      lastToolInput = { args, partial };
      notify(partial ? METHODS.toolInputPartial : METHODS.toolInput, {
        arguments: args,
      });
    },
    notifyToolResult(result) {
      lastToolResult = { result };
      notify(METHODS.toolResult, result);
    },
    screenshot(screenshotOptions) {
      return request<Screenshot>(METHODS.screenshot, screenshotOptions ?? {});
    },
    async inspect() {
      const inspection = await request<FrameInspection>(METHODS.inspect);
      return { ...inspection, code };
    },
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener as (payload: never) => void);
      return () => set.delete(listener as (payload: never) => void);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      queue = undefined;
      activeSession?.dispose();
      activeSession = undefined;
      listeners.clear();
    },
  };

  internalRequests.set(handle, request);

  if (options.code !== undefined) {
    handle.write(options.code);
    void handle.end().catch(() => {});
  }

  return handle;
}

/**
 * Clears what widgets with this `id` stored (localStorage, sessionStorage,
 * IndexedDB, Cache Storage, and cookies) by loading a hidden frame on the
 * same origin. Resolves with the storage kinds that were cleared.
 */
export async function clearWidgetStorage(
  id: string,
  options: Pick<
    CreateWidgetOptions,
    "product" | "unsafeShimDomain" | "readyTimeoutMs"
  > = {},
): Promise<ClearStorageResult> {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
  document.body.appendChild(container);
  let widget: WidgetHandle | undefined;
  try {
    widget = createWidget({ ...options, container, id });
    await widget.ready;
    return await internalRequests.get(widget)!<ClearStorageResult>(
      METHODS.clearStorage,
    );
  } finally {
    widget?.dispose();
    container.remove();
  }
}
