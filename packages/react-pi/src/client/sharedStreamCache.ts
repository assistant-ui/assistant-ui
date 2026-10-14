import { invokeUserCallback } from "@assistant-ui/core/internal";
import { SSEEventDecoderError } from "assistant-stream/utils";
import {
  createPiEventStreamConnection,
  openPiEventStream,
} from "./eventSource";
import type { PiEventStreamConnection } from "./eventSource";
import type { PiHttpClientOptions } from "./httpClient";
import type { PiClient, PiClientEvent } from "../types";

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
  connection: PiEventStreamConnection;
  reconnectOnReturnAvailable: boolean;
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

export const createSharedStreamCache = (
  options: PiHttpClientOptions & {
    base: string;
    threadUrl: (threadId: string) => string;
    fetchImpl: typeof fetch;
  },
): PiClient["subscribe"] => {
  const {
    base,
    threadUrl,
    fetchImpl,
    headers,
    onStreamError,
    reconnectDelay,
    streamCloseDelayMs = 30_000,
    maxStreamLineLength,
    maxStreamEventLength,
  } = options;
  const streams = new Map<string, SharedStream>();

  return (threadId, listener, subscribeOptions) => {
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
        reconnectOnReturnAvailable: true,
        connection: createPiEventStreamConnection({
          url: eventsUrl,
          expectedThreadId: threadId,
          ...(!includeSnapshot && {
            snapshotRecoveryUrl: `${threadUrl(threadId)}/events`,
          }),
          fetchImpl,
          ...(headers ? { headers } : {}),
          ...(reconnectDelay ? { reconnectDelay } : {}),
          onError: (error) => {
            if (!(error instanceof SSEEventDecoderError)) {
              onStreamError?.(error);
              return;
            }
            queueMicrotask(() => {
              if (streams.get(streamKey) === createdStream) {
                streams.delete(streamKey);
              }
              if (createdStream.closeTimer) {
                clearTimeout(createdStream.closeTimer);
                createdStream.closeTimer = undefined;
              }
              const snapshotLoad = createdStream.snapshotLoad;
              if (snapshotLoad) {
                createdStream.snapshotLoad = undefined;
                if (snapshotLoad.timeout) clearTimeout(snapshotLoad.timeout);
                snapshotLoad.close();
              }
              createdStream.pendingEvents.clear();
              createdStream.connection.close();
              const errorEvent: PiClientEvent = {
                type: "error",
                threadId,
                seq: 0,
                error: error.message,
                terminal: true,
              };
              void invokeUserCallback(
                "react-pi",
                "onError",
                onStreamError,
                error,
              );
              for (const listener of [...listeners]) {
                if (listeners.has(listener)) {
                  deliverEvent(createdStream, listener, errorEvent);
                }
              }
            });
          },
          maxStreamLineLength,
          maxStreamEventLength,
          onConnect: () => {
            createdStream.reconnectOnReturnAvailable = true;
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
                applyCachedSnapshot(createdStream, clientEvent, rebaseSnapshot)
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
      if (stream.reconnectOnReturnAvailable && stream.connection.reconnect()) {
        stream.reconnectOnReturnAvailable = false;
      }
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
          onError: (error) => {
            if (error instanceof SSEEventDecoderError) {
              failSnapshotLoad({
                type: "error",
                threadId,
                seq: 0,
                error: error.message,
              });
            }
            onStreamError?.(error);
          },
          maxStreamLineLength,
          maxStreamEventLength,
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
      const current = stream;
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
      if (
        streams.get(streamKey) !== current ||
        current.listeners.size > 0 ||
        current.closeTimer
      )
        return;
      if (streamCloseDelayMs <= 0) {
        current.connection.close();
        streams.delete(streamKey);
        return;
      }
      current.closeTimer = setTimeout(() => {
        const latest = streams.get(streamKey);
        if (!latest || latest.listeners.size > 0) return;
        latest.connection.close();
        streams.delete(streamKey);
      }, streamCloseDelayMs);
    };
  };
};
