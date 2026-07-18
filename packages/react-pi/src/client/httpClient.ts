/**
 * `createPiHttpClient` — the browser-side `PiClient`, backed by a small HTTP/SSE
 * route layer over a `createPiNodeClient` supervisor running on the server.
 *
 * The counterpart to the in-process `createPiNodeClient`: same `PiClient`
 * contract, different wire. Reads/writes go over `fetch`; the live event
 * stream goes over SSE via `openPiEventStream`.
 *
 * Browser-safe: imports no `@earendil-works/pi-*`. The route layer is the only
 * thing that touches the Pi SDK, and it lives behind `./node` on the server.
 *
 * Wire contract (relative to `baseUrl`, default `/api/pi`):
 *   GET    /threads                 → PiThreadMetadata[]
 *   POST   /threads                 → PiThreadSnapshot      (body: create input)
 *   GET    /threads/:id             → PiThreadSnapshot
 *   PATCH  /threads/:id             → 204                   (body: { title })
 *   POST   /threads/:id/messages    → 204                   (body: { input })
 *   POST   /threads/:id/cancel      → 204
 *   POST   /threads/:id/queue/clear → { steering, followUp } (cleared text)
 *   GET    /models                  → PiModelInfo[]
 *   POST   /threads/:id/model       → 204                   (body: { provider, modelId })
 *   POST   /threads/:id/thinking    → 204                   (body: { level })
 *   POST   /threads/:id/archive     → 204
 *   POST   /threads/:id/unarchive   → 204
 *   DELETE /threads/:id             → 204
 *   POST   /threads/:id/host-ui     → 204                   (body: { response })
 *   GET    /threads/:id/events      → SSE of PiClientEvent (?snapshot=false skips initial snapshot)
 */
import { openPiEventStream } from "./eventSource";
import type {
  PiClient,
  PiClientEvent,
  PiHostUiResponse,
  PiModelInfo,
  PiSendMessageInput,
  PiThinkingLevel,
  PiThreadMetadata,
  PiThreadSnapshot,
} from "../types";

type SharedStream = {
  listeners: Set<(event: PiClientEvent) => void>;
  close: () => void;
  closeTimer: ReturnType<typeof setTimeout> | undefined;
};

declare global {
  // eslint-disable-next-line no-var
  var __assistantUiPiHttpStreams: Map<string, SharedStream> | undefined;
}

const getDefaultBrowserStreams = () => {
  globalThis.__assistantUiPiHttpStreams ??= new Map<string, SharedStream>();
  return globalThis.__assistantUiPiHttpStreams;
};

export interface PiHttpClientOptions {
  /** Base path/URL of the route layer. Default: `/api/pi`. */
  baseUrl?: string;
  /** Injected `fetch` (defaults to the global). */
  fetchImpl?: typeof fetch;
  /** Extra headers applied to every request (e.g. auth). */
  headers?: Record<string, string>;
  /** Non-fatal SSE stream errors (reconnects follow). */
  onStreamError?: (error: unknown) => void;
  /** Reconnect backoff for the event stream; injectable for tests. */
  reconnectDelay?: () => Promise<void>;
  /** Delay before closing an idle shared event stream. Defaults to 30s. */
  streamCloseDelayMs?: number;
}

const trimTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

/** Throw a descriptive error for any non-2xx response, including the body. */
const assertOk = async (response: Response): Promise<void> => {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(
    `Pi HTTP request failed: ${response.status} ${response.statusText}${
      body ? ` — ${body}` : ""
    }`,
  );
};

const readJson = async <T>(response: Response): Promise<T> => {
  await assertOk(response);
  return (await response.json()) as T;
};

export const createPiHttpClient = (
  options: PiHttpClientOptions = {},
): PiClient => {
  const {
    baseUrl = "/api/pi",
    fetchImpl = fetch,
    headers,
    onStreamError,
    reconnectDelay,
    streamCloseDelayMs = 30_000,
  } = options;

  const base = trimTrailingSlash(baseUrl);
  const threadUrl = (threadId: string) =>
    `${base}/threads/${encodeURIComponent(threadId)}`;

  const jsonHeaders = { "content-type": "application/json", ...headers };
  const streams =
    fetchImpl === globalThis.fetch && headers === undefined
      ? getDefaultBrowserStreams()
      : new Map<string, SharedStream>();

  const send = (url: string, method: string, body?: unknown) =>
    fetchImpl(url, {
      method,
      ...(body !== undefined
        ? { headers: jsonHeaders, body: JSON.stringify(body) }
        : headers
          ? { headers }
          : {}),
    });

  return {
    listThreads: async (input) => {
      const params = new URLSearchParams();
      if (input?.workspacePath)
        params.set("workspacePath", input.workspacePath);
      if (input?.includeArchived) params.set("includeArchived", "true");
      const query = params.toString();
      return readJson<PiThreadMetadata[]>(
        await send(`${base}/threads${query ? `?${query}` : ""}`, "GET"),
      );
    },

    createThread: async (input) =>
      readJson<PiThreadSnapshot>(
        await send(`${base}/threads`, "POST", input ?? {}),
      ),

    getThread: async (threadId) =>
      readJson<PiThreadSnapshot>(await send(threadUrl(threadId), "GET")),

    sendMessage: async (threadId, input: PiSendMessageInput) => {
      await assertOk(
        await send(`${threadUrl(threadId)}/messages`, "POST", { input }),
      );
    },

    cancelRun: async (threadId) => {
      await assertOk(await send(`${threadUrl(threadId)}/cancel`, "POST"));
    },

    clearQueue: async (threadId) =>
      readJson<{ steering: string[]; followUp: string[] }>(
        await send(`${threadUrl(threadId)}/queue/clear`, "POST"),
      ),

    getAvailableModels: async (input) => {
      const params = new URLSearchParams();
      if (input?.workspacePath)
        params.set("workspacePath", input.workspacePath);
      const query = params.toString();
      return readJson<PiModelInfo[]>(
        await send(`${base}/models${query ? `?${query}` : ""}`, "GET"),
      );
    },

    setModel: async (threadId, input) => {
      await assertOk(await send(`${threadUrl(threadId)}/model`, "POST", input));
    },

    setThinkingLevel: async (threadId, level: PiThinkingLevel) => {
      await assertOk(
        await send(`${threadUrl(threadId)}/thinking`, "POST", { level }),
      );
    },

    renameThread: async (threadId, title) => {
      await assertOk(await send(threadUrl(threadId), "PATCH", { title }));
    },

    archiveThread: async (threadId) => {
      await assertOk(await send(`${threadUrl(threadId)}/archive`, "POST"));
    },

    unarchiveThread: async (threadId) => {
      await assertOk(await send(`${threadUrl(threadId)}/unarchive`, "POST"));
    },

    deleteThread: async (threadId) => {
      await assertOk(await send(threadUrl(threadId), "DELETE"));
    },

    respondToHostUiRequest: async (threadId, response: PiHostUiResponse) => {
      await assertOk(
        await send(`${threadUrl(threadId)}/host-ui`, "POST", { response }),
      );
    },

    subscribe: (threadId, listener, subscribeOptions) => {
      const includeSnapshot = subscribeOptions?.includeSnapshot !== false;
      const streamKey = `${base}:${threadId}:${
        includeSnapshot ? "snapshot" : "live"
      }`;
      let stream = streams.get(streamKey);
      if (!stream) {
        const listeners = new Set<(event: PiClientEvent) => void>();
        const eventsUrl = `${threadUrl(threadId)}/events${
          includeSnapshot ? "" : "?snapshot=false"
        }`;
        stream = {
          listeners,
          closeTimer: undefined,
          close: openPiEventStream({
            url: eventsUrl,
            fetchImpl,
            ...(headers ? { headers } : {}),
            ...(reconnectDelay ? { reconnectDelay } : {}),
            ...(onStreamError ? { onError: onStreamError } : {}),
            onEvent: (event) => {
              for (const listener of [...listeners]) {
                try {
                  listener(event as PiClientEvent);
                } catch (error) {
                  console.error("[react-pi] Listener threw an error", error);
                }
              }
            },
          }),
        };
        streams.set(streamKey, stream);
      } else if (stream.closeTimer) {
        clearTimeout(stream.closeTimer);
        stream.closeTimer = undefined;
      }

      stream.listeners.add(listener);

      return () => {
        const current = streams.get(streamKey);
        if (!current) return;
        current.listeners.delete(listener);
        if (current.listeners.size > 0 || current.closeTimer) return;
        if (streamCloseDelayMs <= 0) {
          current.close();
          streams.delete(streamKey);
          return;
        }
        current.closeTimer = setTimeout(() => {
          const latest = streams.get(streamKey);
          if (!latest || latest.listeners.size > 0) return;
          latest.close();
          streams.delete(streamKey);
        }, streamCloseDelayMs);
      };
    },
  };
};
