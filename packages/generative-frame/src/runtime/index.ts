import {
  INIT_MESSAGE,
  METHODS,
  READY_MESSAGE,
  type ColorScheme,
  type Compat,
  type EndResult,
  type FrameInspection,
  type HostContext,
  type InitMessage,
  type ScreenshotOptions,
  type WidgetSize,
} from "../protocol";
import { createRpcPeer, RPC_ERROR, RpcError, type RpcPeer } from "../rpc";
import { VERSION } from "../version";
import { installDiagnostics, isBlankRender } from "./diagnostics";
import { createStreamRenderer } from "./morph";
import { captureScreenshot } from "./screenshot";

export type RuntimeConfig = {
  hostOrigin: string;
  compat: Compat[];
  animate: boolean;
};

const VARIABLE_NAME = /^--[\w-]+$/;
const READY_INTERVAL_MS = 100;
const READY_ATTEMPTS = 100;

type Listener = (event: Event) => void;

/** Boots the in-frame runtime: handshake, streaming renderer, bridge, and widget globals. */
export function startRuntime(win: Window & typeof globalThis = window): void {
  const doc = win.document;
  const configElement = doc.getElementById("gf-config");
  const config = JSON.parse(
    configElement?.textContent ?? "{}",
  ) as RuntimeConfig;
  configElement?.remove();
  const root = doc.getElementById("gf-root") ?? doc.body;

  let peer: RpcPeer | undefined;
  let context: HostContext = {};
  let toolInput: Record<string, unknown> | null = null;
  let toolOutput: unknown = null;
  let widgetState: unknown = null;
  let lastSize: WidgetSize = { width: 0, height: 0 };

  const diagnostics = installDiagnostics(win, {
    onError: (error) => peer?.notify(METHODS.error, error),
    onConsole: (entry) => {
      if (entry.level === "warn" || entry.level === "error") {
        peer?.notify(METHODS.log, entry);
      }
    },
  });

  const reducedMotion = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  const renderer = createStreamRenderer({
    root,
    animate: () => config.animate !== false && !reducedMotion?.matches,
    onScriptError: (message, src) =>
      diagnostics.record({
        kind: "script",
        message,
        ...(src ? { source: src } : {}),
      }),
  });

  const measure = (): WidgetSize => {
    const rect = root.getBoundingClientRect();
    return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
  };

  let sizeFrame: number | undefined;
  const reportSize = () => {
    sizeFrame = undefined;
    const size = measure();
    const maxHeight = context.containerDimensions?.maxHeight;
    // The host sizes the iframe to the content, so a scrollbar would only flash
    // while the two catch up and steal width; it is needed only past maxHeight.
    doc.documentElement.style.overflowY =
      typeof maxHeight === "number" && size.height > maxHeight
        ? "auto"
        : "hidden";
    if (size.width === lastSize.width && size.height === lastSize.height)
      return;
    lastSize = size;
    peer?.notify(METHODS.sizeChanged, size);
  };
  const scheduleSize = () => {
    sizeFrame ??= win.requestAnimationFrame(reportSize);
  };
  if (typeof win.ResizeObserver === "function") {
    new win.ResizeObserver(scheduleSize).observe(root);
  }

  const openaiCompat = config.compat?.includes("openai") ?? false;
  const emitOpenAiGlobals = (globals: Record<string, unknown>) => {
    if (!openaiCompat) return;
    win.dispatchEvent(
      new CustomEvent("openai:set_globals", { detail: { globals } }),
    );
  };

  const applyContext = (next: HostContext) => {
    const previousTheme = context.theme;
    context = { ...context, ...next };
    const style = doc.documentElement.style;
    let themeChanged = false;
    if (next.theme === "light" || next.theme === "dark") {
      style.colorScheme = next.theme;
      doc.documentElement.dataset["theme"] = next.theme;
      themeChanged = next.theme !== previousTheme;
    }
    const variables = next.styles?.variables;
    if (variables && typeof variables === "object") {
      for (const [name, value] of Object.entries(variables)) {
        if (VARIABLE_NAME.test(name) && typeof value === "string") {
          style.setProperty(name, value);
        }
      }
      themeChanged = true;
    }
    if (themeChanged) {
      win.dispatchEvent(
        new CustomEvent("themechange", {
          detail: {
            theme: context.theme,
            variables: context.styles?.variables,
          },
        }),
      );
    }
    emitOpenAiGlobals({
      theme: context.theme,
      displayMode: context.displayMode,
      locale: context.locale,
    });
  };

  const requirePeer = () => {
    if (!peer) throw new Error("generative-frame is not connected to its host");
    return peer;
  };

  const sendPrompt = (text: string) =>
    requirePeer().request(METHODS.message, {
      role: "user",
      content: [{ type: "text", text: String(text) }],
    });
  const openLink = (url: string) =>
    requirePeer().request(METHODS.openLink, { url: String(url) });
  const callTool = (name: string, args?: Record<string, unknown>) =>
    requirePeer().request(METHODS.callTool, {
      name,
      ...(args !== undefined ? { arguments: args } : {}),
    });
  const requestDisplayMode = (mode: string) =>
    requirePeer().request(METHODS.requestDisplayMode, { mode });
  const updateModelContext = (params: unknown) =>
    requirePeer().request(METHODS.updateModelContext, params);
  const setState = (state: unknown) => {
    widgetState = state;
    requirePeer().notify(METHODS.widgetState, { state });
    emitOpenAiGlobals({ widgetState: state });
  };

  const genframe = {
    version: VERSION,
    get theme(): ColorScheme | undefined {
      return context.theme;
    },
    get context(): HostContext {
      return context;
    },
    get toolInput() {
      return toolInput;
    },
    get toolOutput() {
      return toolOutput;
    },
    get state() {
      return widgetState;
    },
    sendPrompt,
    openLink,
    callTool,
    requestDisplayMode,
    updateModelContext,
    setState,
    on(type: "themechange" | "toolinput" | "toolresult", listener: Listener) {
      win.addEventListener(type, listener);
      return () => win.removeEventListener(type, listener);
    },
  };

  const globals = win as unknown as Record<string, unknown>;
  globals["genframe"] = genframe;
  globals["sendPrompt"] = sendPrompt;
  globals["openLink"] = openLink;
  win.open = ((url?: string | URL) => {
    if (url !== undefined) void openLink(String(url)).catch(() => {});
    return null;
  }) as typeof win.open;

  if (openaiCompat) {
    globals["openai"] = {
      get theme() {
        return context.theme;
      },
      get locale() {
        return context.locale;
      },
      get displayMode() {
        return context.displayMode ?? "inline";
      },
      get maxHeight() {
        return context.containerDimensions?.maxHeight;
      },
      get toolInput() {
        return toolInput ?? {};
      },
      get toolOutput() {
        return toolOutput;
      },
      toolResponseMetadata: null,
      get widgetState() {
        return widgetState;
      },
      setWidgetState: async (state: unknown) => setState(state),
      callTool: (name: string, args?: Record<string, unknown>) =>
        callTool(name, args),
      sendFollowUpMessage: async ({ prompt }: { prompt: string }) => {
        await sendPrompt(prompt);
      },
      openExternal: ({ href }: { href: string }) => {
        void openLink(href).catch(() => {});
      },
      requestDisplayMode: async ({ mode }: { mode: string }) => {
        await requestDisplayMode(mode);
        return { mode };
      },
    };
  }

  doc.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || !(event.target instanceof win.Element)) {
        return;
      }
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, config.hostOrigin);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      event.preventDefault();
      void openLink(url.href).catch(() => {});
    },
    true,
  );

  const endResult = (): EndResult => {
    const size = measure();
    return {
      size,
      blank: isBlankRender(root),
      errorCount: diagnostics.errors.length,
    };
  };

  const inspect = (): FrameInspection => ({
    kind: renderer.kind,
    ended: renderer.ended,
    size: measure(),
    blank: renderer.ended ? isBlankRender(root) : false,
    errors: [...diagnostics.errors],
    console: [...diagnostics.console],
  });

  const onRequest = async (method: string, params: unknown) => {
    const p = (params ?? {}) as Record<string, unknown>;
    switch (method) {
      case METHODS.end:
        await renderer.end();
        scheduleSize();
        return endResult();
      case METHODS.replace:
        if (typeof p["code"] !== "string") {
          throw new RpcError(
            RPC_ERROR.invalidParams,
            "replace requires a string 'code'",
          );
        }
        await renderer.replace(p["code"]);
        scheduleSize();
        return endResult();
      case METHODS.screenshot:
        renderer.flush();
        return captureScreenshot(root, p as ScreenshotOptions);
      case METHODS.inspect:
        renderer.flush();
        return inspect();
      default:
        throw new RpcError(
          RPC_ERROR.methodNotFound,
          `Unknown method: ${method}`,
        );
    }
  };

  const onNotification = (method: string, params: unknown) => {
    const p = (params ?? {}) as Record<string, unknown>;
    switch (method) {
      case METHODS.write:
        if (typeof p["chunk"] === "string") renderer.write(p["chunk"]);
        return;
      case METHODS.hostContextChanged:
        applyContext(p as HostContext);
        return;
      case METHODS.toolInputPartial:
      case METHODS.toolInput: {
        const args = p["arguments"];
        toolInput =
          args && typeof args === "object"
            ? (args as Record<string, unknown>)
            : {};
        win.dispatchEvent(
          new CustomEvent("toolinput", {
            detail: {
              arguments: toolInput,
              partial: method === METHODS.toolInputPartial,
            },
          }),
        );
        emitOpenAiGlobals({ toolInput });
        return;
      }
      case METHODS.toolResult:
        toolOutput =
          p["structuredContent"] !== undefined ? p["structuredContent"] : p;
        win.dispatchEvent(new CustomEvent("toolresult", { detail: p }));
        emitOpenAiGlobals({ toolOutput });
        return;
      default:
        return;
    }
  };

  const connect = (port: MessagePort, init: InitMessage) => {
    peer = createRpcPeer(port, { onRequest, onNotification });
    applyContext(init.context ?? {});
    peer.notify(METHODS.ready, { version: VERSION });
    scheduleSize();
    for (const error of diagnostics.errors) peer.notify(METHODS.error, error);
  };

  let attempts = 0;
  const announce = () => {
    attempts++;
    if (attempts > READY_ATTEMPTS) win.clearInterval(readyTimer);
    win.parent.postMessage({ type: READY_MESSAGE }, config.hostOrigin);
  };
  const onWindowMessage = (event: MessageEvent) => {
    if (event.source !== win.parent || event.origin !== config.hostOrigin)
      return;
    const data = event.data as Partial<InitMessage> | null;
    if (data?.type !== INIT_MESSAGE || !event.ports[0]) return;
    win.removeEventListener("message", onWindowMessage);
    win.clearInterval(readyTimer);
    connect(event.ports[0], data as InitMessage);
  };
  win.addEventListener("message", onWindowMessage);
  const readyTimer = win.setInterval(announce, READY_INTERVAL_MS);
  announce();
}
