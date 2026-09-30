import { DEFAULT_EXTERNAL_SCHEMES, parseExternalUrl } from "../external-url";
import {
  isWebviewToHostMessage,
  VSCODE_BRIDGE_CHANNEL,
  type RpcRequestMessage,
  type RpcResponseMessage,
} from "../protocol";
import {
  serveWebviewRoutes,
  type Disposable,
  type ServeWebviewRoutesOptions,
  type WebviewLike,
  type WebviewRoutes,
} from "./router";

export type ServeWebviewHostOptions = ServeWebviewRoutesOptions & {
  routes?: WebviewRoutes;
  /**
   * Opens a URL forwarded by `installLinkInterceptor`, after the host has
   * checked its scheme against `externalSchemes`.
   */
  openExternal?: (url: string) => PromiseLike<boolean> | boolean | void;
  /** URL schemes `openExternal` may receive, such as `"https:"`. */
  externalSchemes?: readonly string[];
};

type RpcHandler = (...params: unknown[]) => unknown;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Serves `vscodeFetch` routes and the webview's host calls, such as
 * `installLinkInterceptor` opening links, for one webview. Use it in place of
 * `serveWebviewRoutes`.
 */
export function serveWebviewHost(
  webview: WebviewLike,
  {
    routes = {},
    openExternal,
    externalSchemes = DEFAULT_EXTERNAL_SCHEMES,
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

  const server = serveWebviewRoutes(webview, routes, routeOptions);
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
