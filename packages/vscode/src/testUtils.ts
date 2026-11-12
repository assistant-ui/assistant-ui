import type { WebviewLike } from "./host/router";
import type { WebviewToHostMessage } from "./protocol";
import type { VSCodeBridgePort } from "./webview/fetch";

type Listener = (message: unknown) => void;

/** A response body that yields `text` on the first read and fails with `error` on the next. */
export const failsAfter = (text: string, error: Error) => {
  let reads = 0;
  return new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (reads++ === 0) controller.enqueue(new TextEncoder().encode(text));
        else controller.error(error);
      },
    },
    { highWaterMark: 0 },
  );
};

export type InMemoryBridge = {
  webview: WebviewLike;
  port: VSCodeBridgePort;
  hostToWebview: unknown[];
  webviewToHost: unknown[];
  postToWebview(message: unknown): void;
};

export function createInMemoryBridge(): InMemoryBridge {
  const hostListeners = new Set<Listener>();
  const webviewListeners = new Set<Listener>();
  const hostToWebview: unknown[] = [];
  const webviewToHost: unknown[] = [];

  const deliver = (listeners: Set<Listener>, message: unknown) => {
    const cloned = structuredClone(message);
    queueMicrotask(() => {
      for (const listener of [...listeners]) {
        if (listeners.has(listener)) listener(cloned);
      }
    });
  };

  const postToWebview = (message: unknown) => {
    hostToWebview.push(message);
    deliver(webviewListeners, message);
  };

  return {
    hostToWebview,
    webviewToHost,
    postToWebview,
    webview: {
      postMessage: (message) => {
        postToWebview(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (listener) => {
        hostListeners.add(listener);
        return { dispose: () => hostListeners.delete(listener) };
      },
    },
    port: {
      postMessage: (message: WebviewToHostMessage) => {
        webviewToHost.push(message);
        deliver(hostListeners, message);
      },
      onMessage: (listener) => {
        webviewListeners.add(listener);
        return () => {
          webviewListeners.delete(listener);
        };
      },
    },
  };
}
