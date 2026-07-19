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
import { isRecord } from "@assistant-ui/core/internal";
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

const invalidResponse = (
  operation: string,
  expectation: string,
  cause?: unknown,
): Error =>
  new Error(
    `Invalid Pi HTTP response while ${operation}: ${expectation}`,
    cause === undefined ? undefined : { cause },
  );

const readJson = async (
  response: Response,
  operation: string,
): Promise<unknown> => {
  await assertOk(response);
  try {
    return await response.json();
  } catch (error) {
    throw invalidResponse(operation, "expected valid JSON.", error);
  }
};

const isQueuedMessage = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.mode === "string" &&
    typeof value.content === "string"
  );
};

const isThreadMetadata = (value: unknown): value is PiThreadMetadata => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.status === "string" &&
    (value.queuedMessages === undefined ||
      (Array.isArray(value.queuedMessages) &&
        value.queuedMessages.every(isQueuedMessage)))
  );
};

const parseThreadListResponse = (value: unknown): PiThreadMetadata[] => {
  if (!Array.isArray(value)) {
    throw invalidResponse("listing threads", "expected an array of threads.");
  }

  for (const [index, thread] of value.entries()) {
    if (!isThreadMetadata(thread)) {
      throw invalidResponse(
        "listing threads",
        `thread at index ${index} must have a non-empty string "id", a string "status", and structurally valid queued messages when present.`,
      );
    }
  }
  return value;
};

const isTranscriptMessage = (value: unknown): boolean =>
  isRecord(value) && typeof value.role === "string";

const isHostUiRequest = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.kind !== "string") {
    return false;
  }

  if (value.kind === "confirm") {
    return typeof value.title === "string" && typeof value.message === "string";
  }
  if (value.kind === "select") {
    return (
      typeof value.title === "string" &&
      Array.isArray(value.options) &&
      value.options.every((option) => typeof option === "string")
    );
  }
  if (value.kind === "input" || value.kind === "editor") {
    return typeof value.title === "string";
  }
  return true;
};

const parseThreadSnapshotResponse = (
  value: unknown,
  operation: "creating a thread" | "fetching a thread",
): PiThreadSnapshot => {
  if (
    !isRecord(value) ||
    !isThreadMetadata(value.metadata) ||
    !Array.isArray(value.messages) ||
    !value.messages.every(isTranscriptMessage) ||
    (value.hostUiRequests !== undefined &&
      (!Array.isArray(value.hostUiRequests) ||
        !value.hostUiRequests.every(isHostUiRequest)))
  ) {
    throw invalidResponse(
      operation,
      'expected a thread snapshot with valid "metadata", a "messages" array, and valid host UI requests when present.',
    );
  }
  return value as PiThreadSnapshot;
};

const parseClearQueueResponse = (
  value: unknown,
): { steering: string[]; followUp: string[] } => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.steering) ||
    !value.steering.every((item) => typeof item === "string") ||
    !Array.isArray(value.followUp) ||
    !value.followUp.every((item) => typeof item === "string")
  ) {
    throw invalidResponse(
      "clearing a thread queue",
      'expected an object with string arrays "steering" and "followUp".',
    );
  }
  return value as { steering: string[]; followUp: string[] };
};

const isModelInfo = (value: unknown): value is PiModelInfo =>
  isRecord(value) &&
  typeof value.provider === "string" &&
  value.provider.length > 0 &&
  typeof value.modelId === "string" &&
  value.modelId.length > 0;

const parseModelListResponse = (value: unknown): PiModelInfo[] => {
  if (!Array.isArray(value)) {
    throw invalidResponse("listing models", "expected an array of models.");
  }

  for (const [index, model] of value.entries()) {
    if (!isModelInfo(model)) {
      throw invalidResponse(
        "listing models",
        `model at index ${index} must have non-empty string "provider" and "modelId" fields.`,
      );
    }
  }
  return value;
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
      return parseThreadListResponse(
        await readJson(
          await send(`${base}/threads${query ? `?${query}` : ""}`, "GET"),
          "listing threads",
        ),
      );
    },

    createThread: async (input) =>
      parseThreadSnapshotResponse(
        await readJson(
          await send(`${base}/threads`, "POST", input ?? {}),
          "creating a thread",
        ),
        "creating a thread",
      ),

    getThread: async (threadId) =>
      parseThreadSnapshotResponse(
        await readJson(
          await send(threadUrl(threadId), "GET"),
          "fetching a thread",
        ),
        "fetching a thread",
      ),

    sendMessage: async (threadId, input: PiSendMessageInput) => {
      await assertOk(
        await send(`${threadUrl(threadId)}/messages`, "POST", { input }),
      );
    },

    cancelRun: async (threadId) => {
      await assertOk(await send(`${threadUrl(threadId)}/cancel`, "POST"));
    },

    clearQueue: async (threadId) =>
      parseClearQueueResponse(
        await readJson(
          await send(`${threadUrl(threadId)}/queue/clear`, "POST"),
          "clearing a thread queue",
        ),
      ),

    getAvailableModels: async (input) => {
      const params = new URLSearchParams();
      if (input?.workspacePath)
        params.set("workspacePath", input.workspacePath);
      const query = params.toString();
      return parseModelListResponse(
        await readJson(
          await send(`${base}/models${query ? `?${query}` : ""}`, "GET"),
          "listing models",
        ),
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
              for (const l of [...listeners]) l(event as PiClientEvent);
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
