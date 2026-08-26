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
import { isThreadMetadata, isThreadSnapshot } from "./validation";
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

type PiSnapshotEvent = Extract<PiClientEvent, { type: "snapshot" }>;
type PiEventListener = (event: PiClientEvent) => void;
type PendingSnapshotEvents = {
  events: PiClientEvent[];
  joinSeq: number;
  snapshotRetries: number;
};

type SharedSnapshotLoad = {
  listeners: Set<PiEventListener>;
  close: () => void;
  timeout: ReturnType<typeof setTimeout> | undefined;
};

type SharedStream = {
  listeners: Set<PiEventListener>;
  pendingEvents: Map<PiEventListener, PendingSnapshotEvents>;
  snapshotSeqs: Map<PiEventListener, number>;
  snapshotEvent: PiSnapshotEvent | undefined;
  hasEventsSinceSnapshot: boolean;
  latestSeq: number;
  liveSnapshotSeq: number;
  awaitingLiveSnapshot: boolean;
  snapshotLoad: SharedSnapshotLoad | undefined;
  close: () => void;
  closeTimer: ReturnType<typeof setTimeout> | undefined;
};

const SNAPSHOT_LOAD_TIMEOUT_MS = 10_000;
const MAX_SNAPSHOT_RETRIES = 1;

const notifyListener = (listener: PiEventListener, event: PiClientEvent) => {
  try {
    listener(event);
  } catch (error) {
    console.error("[react-pi] Listener threw an error", error);
  }
};

const deliverEvent = (
  stream: SharedStream,
  listener: PiEventListener,
  event: PiClientEvent,
) => {
  if (event.type === "snapshot") {
    stream.snapshotSeqs.set(listener, event.seq);
  }
  notifyListener(listener, event);
};

const applyCachedSnapshot = (
  stream: SharedStream,
  snapshotEvent: PiSnapshotEvent,
  replace = false,
): boolean => {
  if (
    !replace &&
    stream.snapshotEvent &&
    snapshotEvent.seq < stream.snapshotEvent.seq
  ) {
    stream.latestSeq = Math.max(stream.latestSeq, snapshotEvent.seq);
    stream.hasEventsSinceSnapshot = stream.latestSeq > stream.snapshotEvent.seq;
    return false;
  }
  stream.latestSeq = replace
    ? snapshotEvent.seq
    : Math.max(stream.latestSeq, snapshotEvent.seq);
  stream.snapshotEvent = snapshotEvent;
  stream.hasEventsSinceSnapshot = stream.latestSeq > snapshotEvent.seq;
  return true;
};

const deliverPendingSnapshots = (
  stream: SharedStream,
  snapshotEvent: PiSnapshotEvent,
) => {
  for (const listener of [...stream.pendingEvents.keys()]) {
    const pending = stream.pendingEvents.get(listener);
    if (!pending || !stream.listeners.has(listener)) continue;
    stream.pendingEvents.delete(listener);
    deliverEvent(stream, listener, snapshotEvent);
    for (const event of pending.events) {
      if (!stream.listeners.has(listener)) break;
      if (
        (event.type === "error" && event.seq === 0) ||
        event.seq > snapshotEvent.seq
      ) {
        deliverEvent(stream, listener, event);
      }
    }
  }
};

const flushStrandedPendingListeners = (stream: SharedStream) => {
  for (const listener of [...stream.pendingEvents.keys()]) {
    if (stream.snapshotLoad?.listeners.has(listener)) continue;
    const pending = stream.pendingEvents.get(listener);
    if (!pending) continue;
    stream.pendingEvents.delete(listener);
    if (!stream.listeners.has(listener)) continue;
    for (const event of pending.events) {
      if (!stream.listeners.has(listener)) break;
      deliverEvent(stream, listener, event);
    }
  }
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

const parseThreadListResponse = (value: unknown): PiThreadMetadata[] => {
  if (!Array.isArray(value)) {
    throw invalidResponse("listing threads", "expected an array of threads.");
  }

  for (const [index, thread] of value.entries()) {
    if (!isThreadMetadata(thread)) {
      throw invalidResponse(
        "listing threads",
        `thread at index ${index} must have a non-empty string "id", a string "status", and correctly typed known fields.`,
      );
    }
  }
  return value;
};

const parseThreadSnapshotResponse = (
  value: unknown,
  operation: "creating a thread" | "fetching a thread",
): PiThreadSnapshot => {
  if (!isThreadSnapshot(value)) {
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
  const streams = new Map<string, SharedStream>();

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
      const eventsUrl = `${threadUrl(threadId)}/events${
        includeSnapshot ? "" : "?snapshot=false"
      }`;
      let stream = streams.get(streamKey);
      if (!stream) {
        const listeners = new Set<PiEventListener>();
        const pendingEvents = new Map<PiEventListener, PendingSnapshotEvents>();
        const createdStream: SharedStream = {
          listeners,
          pendingEvents,
          snapshotSeqs: new Map(),
          snapshotEvent: undefined,
          hasEventsSinceSnapshot: false,
          latestSeq: 0,
          liveSnapshotSeq: 0,
          awaitingLiveSnapshot: false,
          snapshotLoad: undefined,
          closeTimer: undefined,
          close: openPiEventStream({
            url: eventsUrl,
            expectedThreadId: threadId,
            ...(!includeSnapshot && {
              snapshotRecoveryUrl: `${threadUrl(threadId)}/events`,
            }),
            fetchImpl,
            ...(headers ? { headers } : {}),
            ...(reconnectDelay ? { reconnectDelay } : {}),
            ...(onStreamError ? { onError: onStreamError } : {}),
            onConnect: () => {
              createdStream.awaitingLiveSnapshot = true;
              const snapshotLoad = createdStream.snapshotLoad;
              if (snapshotLoad) {
                createdStream.snapshotLoad = undefined;
                clearTimeout(snapshotLoad.timeout);
                snapshotLoad.close();
              }
              for (const pending of createdStream.pendingEvents.values()) {
                pending.events = [];
              }
            },
            onEvent: (event) => {
              const clientEvent = event as PiClientEvent;
              let rebasePending = false;
              let rebaseSnapshot = false;
              if (clientEvent.type === "snapshot") {
                const fromReconnect = createdStream.awaitingLiveSnapshot;
                const isLiveReset =
                  createdStream.liveSnapshotSeq > 0 &&
                  clientEvent.seq < createdStream.liveSnapshotSeq;
                createdStream.awaitingLiveSnapshot = false;
                rebaseSnapshot = fromReconnect || isLiveReset;
                if (
                  applyCachedSnapshot(
                    createdStream,
                    clientEvent,
                    rebaseSnapshot,
                  )
                ) {
                  createdStream.liveSnapshotSeq = clientEvent.seq;
                  rebasePending = fromReconnect;
                }
              } else {
                createdStream.latestSeq = Math.max(
                  createdStream.latestSeq,
                  clientEvent.seq,
                );
                if (
                  createdStream.snapshotEvent &&
                  clientEvent.seq > createdStream.snapshotEvent.seq
                ) {
                  createdStream.hasEventsSinceSnapshot = true;
                }
              }
              for (const listener of [...listeners]) {
                const pending = pendingEvents.get(listener);
                if (pending) {
                  pending.events.push(clientEvent);
                } else if (
                  clientEvent.type !== "snapshot" ||
                  rebaseSnapshot ||
                  (createdStream.snapshotSeqs.get(listener) ?? -1) <
                    clientEvent.seq
                ) {
                  deliverEvent(createdStream, listener, clientEvent);
                }
              }
              if (rebasePending && clientEvent.type === "snapshot") {
                deliverPendingSnapshots(createdStream, clientEvent);
              } else if (
                createdStream.awaitingLiveSnapshot &&
                clientEvent.type === "error" &&
                clientEvent.seq === 0
              ) {
                createdStream.awaitingLiveSnapshot = false;
                flushStrandedPendingListeners(createdStream);
              }
            },
          }),
        };
        stream = createdStream;
        streams.set(streamKey, stream);
      } else if (stream.closeTimer) {
        clearTimeout(stream.closeTimer);
        stream.closeTimer = undefined;
      }

      const isNewListener = !stream.listeners.has(listener);
      stream.listeners.add(listener);
      if (isNewListener && includeSnapshot && stream.snapshotEvent) {
        stream.pendingEvents.set(listener, {
          events: [],
          joinSeq: stream.latestSeq,
          snapshotRetries: 0,
        });

        const finishSnapshotLoad = (
          pendingListener: PiEventListener,
          snapshotEvent: PiSnapshotEvent,
        ) => {
          const pending = stream.pendingEvents.get(pendingListener);
          if (!pending || !stream.listeners.has(pendingListener)) {
            return;
          }

          stream.pendingEvents.delete(pendingListener);
          applyCachedSnapshot(stream, snapshotEvent);

          deliverEvent(stream, pendingListener, snapshotEvent);
          for (const event of pending.events) {
            if (!stream.listeners.has(pendingListener)) break;
            if (
              (event.type === "error" && event.seq === 0) ||
              event.seq > snapshotEvent.seq
            ) {
              deliverEvent(stream, pendingListener, event);
            }
          }
        };

        const flushPendingEvents = (
          pendingListener: PiEventListener,
          errorEvent?: PiClientEvent,
        ) => {
          const pending = stream.pendingEvents.get(pendingListener);
          stream.pendingEvents.delete(pendingListener);
          if (!stream.listeners.has(pendingListener)) return;
          if (errorEvent) deliverEvent(stream, pendingListener, errorEvent);
          for (const event of pending?.events ?? []) {
            if (!stream.listeners.has(pendingListener)) break;
            deliverEvent(stream, pendingListener, event);
          }
        };

        const stopSnapshotLoad = () => {
          const snapshotLoad = stream.snapshotLoad;
          if (!snapshotLoad) return undefined;
          stream.snapshotLoad = undefined;
          if (snapshotLoad.timeout) clearTimeout(snapshotLoad.timeout);
          snapshotLoad.close();
          return snapshotLoad;
        };

        const failSnapshotLoad = (errorEvent?: PiClientEvent) => {
          const snapshotLoad = stopSnapshotLoad();
          if (!snapshotLoad) return;
          for (const pendingListener of snapshotLoad.listeners) {
            flushPendingEvents(pendingListener, errorEvent);
          }
        };

        const startSnapshotLoad = (
          pendingListeners: Iterable<PiEventListener>,
        ) => {
          if (stream.snapshotLoad) {
            for (const pendingListener of pendingListeners) {
              stream.snapshotLoad.listeners.add(pendingListener);
            }
            return;
          }

          const snapshotLoad: SharedSnapshotLoad = {
            listeners: new Set(pendingListeners),
            close: () => {},
            timeout: undefined,
          };
          stream.snapshotLoad = snapshotLoad;
          snapshotLoad.timeout = setTimeout(() => {
            if (stream.snapshotLoad === snapshotLoad) failSnapshotLoad();
          }, SNAPSHOT_LOAD_TIMEOUT_MS);
          snapshotLoad.close = openPiEventStream({
            url: eventsUrl,
            expectedThreadId: threadId,
            fetchImpl,
            ...(headers ? { headers } : {}),
            ...(reconnectDelay ? { reconnectDelay } : {}),
            ...(onStreamError ? { onError: onStreamError } : {}),
            onEvent: (event) => {
              if (stream.snapshotLoad !== snapshotLoad) return;
              if (event.type === "snapshot") {
                finishSharedSnapshotLoad(event as PiSnapshotEvent);
              } else if (event.type === "error") {
                failSnapshotLoad(event as PiClientEvent);
              }
            },
          });
        };

        const finishSharedSnapshotLoad = (snapshotEvent: PiSnapshotEvent) => {
          const snapshotLoad = stopSnapshotLoad();
          if (!snapshotLoad) return;
          applyCachedSnapshot(stream, snapshotEvent);
          const retryListeners: PiEventListener[] = [];
          for (const pendingListener of snapshotLoad.listeners) {
            const pending = stream.pendingEvents.get(pendingListener);
            if (pending && snapshotEvent.seq < pending.joinSeq) {
              if (pending.snapshotRetries < MAX_SNAPSHOT_RETRIES) {
                pending.snapshotRetries += 1;
                retryListeners.push(pendingListener);
              } else {
                flushPendingEvents(pendingListener);
              }
            } else {
              finishSnapshotLoad(pendingListener, snapshotEvent);
            }
          }
          if (retryListeners.length > 0) {
            startSnapshotLoad(retryListeners);
          }
        };

        if (!stream.hasEventsSinceSnapshot) {
          const snapshotEvent = stream.snapshotEvent;
          queueMicrotask(() => finishSnapshotLoad(listener, snapshotEvent));
        } else {
          startSnapshotLoad([listener]);
        }
      }

      return () => {
        const current = streams.get(streamKey);
        if (!current) return;
        current.listeners.delete(listener);
        current.pendingEvents.delete(listener);
        current.snapshotSeqs.delete(listener);
        const snapshotLoad = current.snapshotLoad;
        if (snapshotLoad?.listeners.delete(listener)) {
          if (snapshotLoad.listeners.size === 0) {
            current.snapshotLoad = undefined;
            if (snapshotLoad.timeout) clearTimeout(snapshotLoad.timeout);
            snapshotLoad.close();
          }
        }
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
