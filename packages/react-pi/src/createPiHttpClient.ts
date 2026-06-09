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
 *   GET    /models                  → PiModelInfo[]
 *   POST   /threads/:id/model       → 204                   (body: { provider, modelId })
 *   POST   /threads/:id/thinking    → 204                   (body: { level })
 *   POST   /threads/:id/archive     → 204
 *   POST   /threads/:id/unarchive   → 204
 *   DELETE /threads/:id             → 204
 *   POST   /threads/:id/host-ui     → 204                   (body: { response })
 *   GET    /threads/:id/events      → SSE of PiClientEvent
 */
import { openPiEventStream } from "./PiEventSource";
import type {
  PiClient,
  PiClientEvent,
  PiHostUiResponse,
  PiModelInfo,
  PiSendMessageInput,
  PiThinkingLevel,
  PiThreadMetadata,
  PiThreadSnapshot,
} from "./piTypes";

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
  } = options;

  const base = trimTrailingSlash(baseUrl);
  const threadUrl = (threadId: string) =>
    `${base}/threads/${encodeURIComponent(threadId)}`;

  const jsonHeaders = { "content-type": "application/json", ...headers };

  const send = (url: string, method: string, body?: unknown) =>
    fetchImpl(url, {
      method,
      headers: jsonHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

  return {
    listThreads: async (input) => {
      const params = new URLSearchParams();
      if (input?.workspacePath)
        params.set("workspacePath", input.workspacePath);
      if (input?.includeArchived) params.set("includeArchived", "true");
      const query = params.toString();
      const response = await fetchImpl(
        `${base}/threads${query ? `?${query}` : ""}`,
        { method: "GET", ...(headers ? { headers } : {}) },
      );
      return readJson<PiThreadMetadata[]>(response);
    },

    createThread: async (input) =>
      readJson<PiThreadSnapshot>(
        await send(`${base}/threads`, "POST", input ?? {}),
      ),

    getThread: async (threadId) =>
      readJson<PiThreadSnapshot>(
        await fetchImpl(threadUrl(threadId), {
          method: "GET",
          ...(headers ? { headers } : {}),
        }),
      ),

    sendMessage: async (threadId, input: PiSendMessageInput) => {
      await assertOk(
        await send(`${threadUrl(threadId)}/messages`, "POST", { input }),
      );
    },

    cancelRun: async (threadId) => {
      await assertOk(await send(`${threadUrl(threadId)}/cancel`, "POST"));
    },

    getAvailableModels: async (input) => {
      const params = new URLSearchParams();
      if (input?.workspacePath)
        params.set("workspacePath", input.workspacePath);
      const query = params.toString();
      const response = await fetchImpl(
        `${base}/models${query ? `?${query}` : ""}`,
        {
          method: "GET",
          ...(headers ? { headers } : {}),
        },
      );
      return readJson<PiModelInfo[]>(response);
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

    subscribe: (threadId, listener) =>
      openPiEventStream({
        url: `${threadUrl(threadId)}/events`,
        fetchImpl,
        ...(headers ? { headers } : {}),
        ...(reconnectDelay ? { reconnectDelay } : {}),
        ...(onStreamError ? { onError: onStreamError } : {}),
        onEvent: (event) => listener(event as PiClientEvent),
      }),
  };
};
