import {
  isWebviewToHostMessage,
  VSCODE_BRIDGE_CHANNEL,
  type FetchRequestMessage,
  type HostToWebviewMessage,
} from "../protocol";

export type RouteHandler = (request: Request) => Response | Promise<Response>;

export type HttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS";

export type RouteHandlers = { [M in HttpMethod]?: RouteHandler };

export type WebviewRoutes = Record<string, RouteHandlers>;

export type WebviewLike = {
  postMessage(message: any): PromiseLike<boolean>;
  onDidReceiveMessage(listener: (message: any) => unknown): {
    dispose(): unknown;
  };
};

export type ServeWebviewRoutesOptions = {
  /** Milliseconds to coalesce response chunks before posting them. */
  flushInterval?: number;
  /** Buffered byte count that posts a chunk without waiting. */
  flushSize?: number;
  onError?: (error: unknown) => void;
};

export type Disposable = { dispose(): void };

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

const concat = (parts: Uint8Array[], size: number) => {
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Serves `routes` to `createVSCodeFetch` / `vscodeFetch` calls made inside
 * `webview`, streaming each response back as it is produced.
 */
export function serveWebviewRoutes(
  webview: WebviewLike,
  routes: WebviewRoutes,
  {
    flushInterval = 16,
    flushSize = 64 * 1024,
    onError = (error) => console.error(error),
  }: ServeWebviewRoutesOptions = {},
): Disposable {
  const inflight = new Map<string, AbortController>();

  const post = (message: HostToWebviewMessage, controller: AbortController) => {
    Promise.resolve(webview.postMessage(message)).then(
      (delivered) => {
        if (!delivered) controller.abort();
      },
      () => controller.abort(),
    );
  };

  const dispatch = async (
    request: Request,
    pathname: string,
  ): Promise<Response> => {
    const route = Object.hasOwn(routes, pathname) ? routes[pathname] : null;
    if (!route) return new Response("Not Found", { status: 404 });
    const handler = route[request.method as HttpMethod];
    if (!handler) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: Object.keys(route).join(", ") },
      });
    }
    try {
      return await handler(request);
    } catch (error) {
      if (request.signal.aborted) throw error;
      onError(error);
      return new Response("Internal Server Error", { status: 500 });
    }
  };

  const pump = async (
    id: string,
    body: ReadableStream<Uint8Array>,
    controller: AbortController,
  ) => {
    const { signal } = controller;
    const reader = body.getReader();
    const onAbort = () => {
      reader.cancel(signal.reason).catch(() => undefined);
    };
    signal.addEventListener("abort", onAbort, { once: true });

    let buffered: Uint8Array[] = [];
    let size = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      if (size === 0 || signal.aborted) return;
      const chunk = concat(buffered, size);
      buffered = [];
      size = 0;
      post(
        { channel: VSCODE_BRIDGE_CHANNEL, kind: "fetch:chunk", id, chunk },
        controller,
      );
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        if (value.byteLength === 0) continue;
        buffered.push(value);
        size += value.byteLength;
        if (size >= flushSize || flushInterval <= 0) flush();
        else timer ??= setTimeout(flush, flushInterval);
      }
      flush();
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reader.releaseLock();
    }
  };

  const handle = async (message: FetchRequestMessage) => {
    const controller = new AbortController();
    inflight.set(message.id, controller);
    const { id } = message;
    try {
      const url = new URL(message.url);
      const request = new Request(url, {
        method: message.method,
        headers: message.headers,
        body: BODYLESS_METHODS.has(message.method.toUpperCase())
          ? null
          : message.body,
        signal: controller.signal,
      });
      const response = await dispatch(request, url.pathname);
      if (controller.signal.aborted) {
        await response.body?.cancel().catch(() => undefined);
        return;
      }
      post(
        {
          channel: VSCODE_BRIDGE_CHANNEL,
          kind: "fetch:head",
          id,
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers],
        },
        controller,
      );
      if (response.body) await pump(id, response.body, controller);
      if (!controller.signal.aborted) {
        post(
          { channel: VSCODE_BRIDGE_CHANNEL, kind: "fetch:end", id },
          controller,
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      onError(error);
      post(
        {
          channel: VSCODE_BRIDGE_CHANNEL,
          kind: "fetch:error",
          id,
          message: errorMessage(error),
        },
        controller,
      );
    } finally {
      inflight.delete(id);
    }
  };

  const subscription = webview.onDidReceiveMessage((message: unknown) => {
    if (!isWebviewToHostMessage(message)) return;
    if (message.kind === "fetch:request") void handle(message);
    else if (message.kind === "fetch:abort") inflight.get(message.id)?.abort();
  });

  return {
    dispose: () => {
      subscription.dispose();
      for (const controller of inflight.values()) controller.abort();
      inflight.clear();
    },
  };
}
