import {
  isHostToWebviewMessage,
  VSCODE_BRIDGE_CHANNEL,
  VSCODE_VIRTUAL_ORIGIN,
  type HostToWebviewMessage,
  type WebviewToHostMessage,
} from "../protocol";
import { getVSCodeApi } from "./vscode-api";

export type VSCodeBridgePort = {
  postMessage(message: WebviewToHostMessage): void;
  onMessage(listener: (message: unknown) => void): () => void;
};

export type VSCodeFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const idPrefix = Math.random().toString(36).slice(2, 10);
let nextId = 0;

export const webviewPort: VSCodeBridgePort = {
  postMessage: (message) => getVSCodeApi().postMessage(message),
  onMessage: (listener) => {
    const handler = (event: MessageEvent) => listener(event.data);
    globalThis.addEventListener("message", handler);
    return () => globalThis.removeEventListener("message", handler);
  },
};

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ?? new DOMException("This operation was aborted", "AbortError");

const readBody = async (
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
) => {
  const reader = body.getReader();
  const onAbort = () => {
    reader.cancel(signal.reason).catch(() => undefined);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw abortReason(signal);
      if (done) break;
      parts.push(value);
      size += value.byteLength;
    }
    const out = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.byteLength;
    }
    return out;
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
};

const toRequest = (input: RequestInfo | URL, init?: RequestInit) =>
  input instanceof Request
    ? new Request(input, init)
    : new Request(new URL(String(input), VSCODE_VIRTUAL_ORIGIN), init);

/**
 * Creates a `fetch` that sends each request to `serveWebviewRoutes` in the
 * extension host and streams the response back over `port`.
 */
export function createVSCodeFetch(
  port: VSCodeBridgePort = webviewPort,
): VSCodeFetch {
  return async (input, init) => {
    const request = toRequest(input, init);
    const { signal } = request;
    if (signal.aborted) throw abortReason(signal);

    const body = request.body ? await readBody(request.body, signal) : null;

    const id = `${idPrefix}-${++nextId}`;

    return new Promise<Response>((resolve, reject) => {
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      let responded = false;
      let finished = false;

      const finish = () => {
        finished = true;
        unsubscribe();
        signal.removeEventListener("abort", onAbort);
      };

      const fail = (error: unknown) => {
        if (finished) return;
        finish();
        if (controller) controller.error(error);
        else reject(error);
      };

      const sendAbort = () => {
        port.postMessage({
          channel: VSCODE_BRIDGE_CHANNEL,
          kind: "fetch:abort",
          id,
        });
      };

      const onAbort = () => {
        if (finished) return;
        sendAbort();
        fail(abortReason(signal));
      };

      const onHead = (
        message: Extract<HostToWebviewMessage, { kind: "fetch:head" }>,
      ) => {
        const stream =
          request.method === "HEAD" || NULL_BODY_STATUSES.has(message.status)
            ? null
            : new ReadableStream<Uint8Array>({
                start: (c) => {
                  controller = c;
                },
                cancel: () => {
                  if (finished) return;
                  sendAbort();
                  finish();
                },
              });
        let response: Response;
        try {
          response = new Response(stream, {
            status: message.status,
            statusText: message.statusText,
            headers: message.headers,
          });
        } catch (error) {
          sendAbort();
          finish();
          reject(error);
          return;
        }
        responded = true;
        resolve(response);
      };

      const unsubscribe = port.onMessage((message) => {
        if (finished) return;
        if (!isHostToWebviewMessage(message) || message.id !== id) return;
        switch (message.kind) {
          case "fetch:head":
            onHead(message);
            break;
          case "fetch:chunk":
            controller?.enqueue(message.chunk);
            break;
          case "fetch:end":
            finish();
            if (controller) controller.close();
            else if (!responded) {
              reject(new TypeError("Response ended before its head"));
            }
            break;
          case "fetch:error":
            fail(new TypeError(message.message));
            break;
        }
      });

      signal.addEventListener("abort", onAbort, { once: true });

      try {
        port.postMessage({
          channel: VSCODE_BRIDGE_CHANNEL,
          kind: "fetch:request",
          id,
          url: request.url,
          method: request.method,
          headers: [...request.headers],
          body,
        });
      } catch (error) {
        fail(error);
      }
    });
  };
}

export const vscodeFetch: VSCodeFetch = createVSCodeFetch();
