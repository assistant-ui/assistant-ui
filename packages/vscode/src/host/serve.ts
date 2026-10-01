import { DEFAULT_EXTERNAL_SCHEMES, parseExternalUrl } from "../external-url";
import {
  isWebviewToHostMessage,
  VSCODE_BRIDGE_CHANNEL,
  type RpcRequestMessage,
  type RpcResponseMessage,
} from "../protocol";
import {
  serveRoutes,
  type Disposable,
  type ServeWebviewRoutesOptions,
  type WebviewLike,
  type WebviewRoutes,
} from "./router";

export type MementoLike = {
  get(key: string): unknown;
  update(key: string, value: unknown): PromiseLike<void>;
};

export type ServeWebviewHostOptions = ServeWebviewRoutesOptions & {
  routes?: WebviewRoutes;
  /**
   * Opens a URL forwarded by `installLinkInterceptor`, after the host has
   * checked its scheme against `externalSchemes`.
   */
  openExternal?: (url: string) => PromiseLike<boolean> | boolean | void;
  /** URL schemes `openExternal` may receive, such as `"https:"`. */
  externalSchemes?: readonly string[];
  /** Backs `createVSCodeStorage`, such as `context.globalState`. */
  storage?: MementoLike;
  /** Namespaces the webview's keys inside `storage`. */
  storagePrefix?: string;
};

type RpcHandler = (...params: unknown[]) => unknown;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const stringParam = (value: unknown, name: string): string => {
  if (typeof value !== "string")
    throw new TypeError(`${name} must be a string`);
  return value;
};

/**
 * Serves `vscodeFetch` routes and the webview's host calls, such as
 * `installLinkInterceptor` opening links and `createVSCodeStorage`, for one
 * webview. Host calls without a handler reject in the webview.
 */
export function serveWebviewHost(
  webview: WebviewLike,
  {
    routes = {},
    openExternal,
    externalSchemes = DEFAULT_EXTERNAL_SCHEMES,
    storage,
    storagePrefix = "@assistant-ui/vscode:",
    ...routeOptions
  }: ServeWebviewHostOptions = {},
): Disposable {
  const handlers: Record<string, RpcHandler> = {};

  if (openExternal) {
    handlers.openExternal = async (value) => {
      const url = parseExternalUrl(value, externalSchemes);
      if (!url) throw new Error(`Refused to open ${String(value)}`);
      return (await openExternal(url)) !== false;
    };
  }

  if (storage) {
    const storageKey = (key: unknown) =>
      storagePrefix + stringParam(key, "key");
    handlers["storage.getItem"] = (key) => {
      const value = storage.get(storageKey(key));
      return typeof value === "string" ? value : null;
    };
    handlers["storage.setItem"] = async (key, value) => {
      await storage.update(storageKey(key), stringParam(value, "value"));
    };
    handlers["storage.removeItem"] = async (key) => {
      await storage.update(storageKey(key), undefined);
    };
  }

  const respond = (
    response:
      | { id: string; ok: true; result: unknown }
      | { id: string; ok: false; message: string },
  ) => {
    const message: RpcResponseMessage = {
      channel: VSCODE_BRIDGE_CHANNEL,
      kind: "rpc:response",
      ...response,
    };
    Promise.resolve(webview.postMessage(message)).catch(() => undefined);
  };

  const handle = async ({ id, method, params }: RpcRequestMessage) => {
    try {
      const handler = Object.hasOwn(handlers, method) ? handlers[method] : null;
      if (!handler) throw new Error(`${method} is not served by this host`);
      const result = await handler(...(Array.isArray(params) ? params : []));
      respond({ id, ok: true, result });
    } catch (error) {
      respond({ id, ok: false, message: errorMessage(error) });
    }
  };

  const server = serveRoutes(webview, routes, routeOptions);
  const subscription = webview.onDidReceiveMessage((message: unknown) => {
    if (isWebviewToHostMessage(message) && message.kind === "rpc:request") {
      void handle(message);
    }
  });

  return {
    dispose: () => {
      subscription.dispose();
      server.dispose();
    },
  };
}

/**
 * Serves `routes` to `createVSCodeFetch` / `vscodeFetch` calls made inside
 * `webview`, streaming each response back as it is produced. Host calls such
 * as `installLinkInterceptor` or `createVSCodeStorage` reject in the webview;
 * use `serveWebviewHost` to serve them.
 */
export function serveWebviewRoutes(
  webview: WebviewLike,
  routes: WebviewRoutes,
  options?: ServeWebviewRoutesOptions,
): Disposable {
  return serveWebviewHost(webview, { ...options, routes });
}
