/**
 * Server-Sent-Events decoding for the HTTP transport.
 *
 * SSE lives in the client layer, NOT the controller: `PiThreadController` only
 * ever sees decoded `PiClientEvent`s through `PiClient.subscribe`. The wire
 * format and reconnection live here.
 *
 * Two pieces:
 * - `createSseDecoder()` — an incremental SSE frame parser wrapping
 *   assistant-stream's `SSEEventDecoder`. Feed it text chunks (which may split
 *   a frame mid-line); it returns the complete frames so far.
 * - `openPiEventStream()` — a `fetch` + `ReadableStream` loop that feeds the
 *   decoder and emits parsed `PiAnyClientEvent`s. Snapshot-first reconnect: the
 *   server re-sends a `snapshot` on every (re)connect, so a dropped stream
 *   recovers by replacing local state, never by replaying. The returned
 *   function aborts the in-flight fetch and stops the reconnect loop.
 *
 * Browser-safe: imports no `@earendil-works/pi-*`.
 */
import { SSEEventDecoder } from "assistant-stream/utils";
import { isRecord } from "@assistant-ui/core/internal";
import { isKnownPiClientEventType } from "../eventTypes";
import type { PiAnyClientEvent } from "../types";
import {
  isAssistantMessageDelta,
  isCompleteTranscriptMessage,
  isContextUsage,
  isHostUiRequest,
  isThreadSnapshot,
} from "./validation";

/** A decoded SSE frame. `data` is the concatenation of every `data:` line in the
 * frame (joined by `\n`, per the SSE spec); `event`/`id` are the last-seen field
 * values, omitted when the frame carried none. */
export interface SseFrame {
  event?: string;
  data: string;
  id?: string;
}

/**
 * Incremental SSE frame parser. `push(chunk)` returns every frame completed by
 * that chunk; partial trailing data is buffered by the shared decoder until its
 * terminating blank line arrives.
 */
export const createSseDecoder = () => {
  const decoder = new SSEEventDecoder();
  return {
    push(chunk: string): SseFrame[] {
      return decoder.push(chunk).map(({ data, event, id }) => ({
        ...(event === undefined ? {} : { event }),
        data,
        ...(id === undefined ? {} : { id }),
      }));
    },
  };
};

export interface PiEventStreamOptions {
  /** Absolute or relative URL of the SSE endpoint. */
  url: string;
  /** Called with each decoded `PiClientEvent`. */
  onEvent: (event: PiAnyClientEvent) => void;
  /** Called after each successful SSE response is opened, before events. */
  onConnect?: () => void;
  /** Non-fatal stream errors (network drop, bad JSON, reconnect-delay failures).
   * The loop reconnects after each; surface these for logging, not control flow. */
  onError?: (error: unknown) => void;
  /** Injected `fetch` (defaults to the global). */
  fetchImpl?: typeof fetch;
  /** Extra request headers (e.g. auth). */
  headers?: Record<string, string>;
  /** Thread ID expected in every event envelope. */
  expectedThreadId?: string;
  /** Snapshot-enabled URL used to recover after a stream disconnect. */
  snapshotRecoveryUrl?: string;
  /** Reconnect backoff between a dropped stream and the next attempt. Rejections
   * are reported via `onError`, then followed by the default ~1s backoff. */
  reconnectDelay?: () => Promise<void>;
}

const defaultReconnectDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 1000));

const validateEventStreamContentType = (response: Response): void => {
  const contentType = response.headers.get("Content-Type");
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "text/event-stream") {
    const received = contentType
      ? `"${contentType}"`
      : "no Content-Type header";
    void response.body?.cancel().catch(() => undefined);
    throw new Error(
      `Expected Pi event stream Content-Type "text/event-stream", received ${received}`,
    );
  }
};

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const isOptionalBoolean = (value: unknown): boolean =>
  value === undefined || typeof value === "boolean";

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isStringArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isKnownEventPayload = (event: Record<string, unknown>): boolean => {
  switch (event.type) {
    case "snapshot":
      return isThreadSnapshot(event.snapshot);
    case "agent_start":
    case "agent_settled":
      return true;
    case "agent_end":
      return isOptionalBoolean(event.willRetry);
    case "turn_start":
    case "turn_end":
      return typeof event.turnIndex === "number";
    case "message_start":
    case "message_end":
      return isCompleteTranscriptMessage(event.message);
    case "message_update":
      return (
        isCompleteTranscriptMessage(event.message) &&
        isAssistantMessageDelta(event.assistantMessageEvent)
      );
    case "tool_execution_start":
      return (
        typeof event.toolCallId === "string" &&
        typeof event.toolName === "string" &&
        hasOwn(event, "args")
      );
    case "tool_execution_update":
      return (
        typeof event.toolCallId === "string" &&
        isOptionalString(event.toolName) &&
        hasOwn(event, "partialResult")
      );
    case "tool_execution_end":
      return (
        typeof event.toolCallId === "string" &&
        typeof event.isError === "boolean" &&
        hasOwn(event, "result")
      );
    case "queue_update":
      return isStringArray(event.steering) && isStringArray(event.followUp);
    case "compaction_start":
      return typeof event.reason === "string";
    case "compaction_end":
      return (
        typeof event.aborted === "boolean" &&
        typeof event.willRetry === "boolean"
      );
    case "entry_appended":
      return (
        isRecord(event.entry) &&
        typeof event.entry.id === "string" &&
        (event.entry.parentId === null ||
          typeof event.entry.parentId === "string") &&
        typeof event.entry.timestamp === "string" &&
        typeof event.entry.type === "string"
      );
    case "auto_retry_start":
      return (
        typeof event.attempt === "number" && typeof event.delayMs === "number"
      );
    case "auto_retry_end":
      return typeof event.success === "boolean";
    case "session_info_changed":
      return isOptionalString(event.name);
    case "thinking_level_changed":
      return typeof event.level === "string";
    case "context_usage":
      return isContextUsage(event.contextUsage);
    case "extension_ui_request":
      return isHostUiRequest(event.request);
    case "extension_ui_resolved":
      return typeof event.requestId === "string";
    case "error":
      return typeof event.error === "string";
    default:
      return true;
  }
};

class InvalidKnownEventStreamPayloadError extends Error {}

const parseEventStreamPayload = (
  data: string,
  expectedThreadId?: string,
): PiAnyClientEvent => {
  const event: unknown = JSON.parse(data);
  if (!isRecord(event)) {
    throw new Error("Invalid Pi event stream payload: expected an object");
  }
  if (typeof event.type !== "string" || event.type.length === 0) {
    throw new Error(
      'Invalid Pi event stream payload: expected a non-empty string "type"',
    );
  }
  const PayloadError = isKnownPiClientEventType(event.type)
    ? InvalidKnownEventStreamPayloadError
    : Error;
  if (typeof event.threadId !== "string" || event.threadId.length === 0) {
    throw new PayloadError(
      'Invalid Pi event stream payload: expected a non-empty string "threadId"',
    );
  }
  if (!Number.isSafeInteger(event.seq) || (event.seq as number) < 0) {
    throw new PayloadError(
      'Invalid Pi event stream payload: expected a non-negative safe integer "seq"',
    );
  }
  if (expectedThreadId !== undefined && event.threadId !== expectedThreadId) {
    throw new InvalidKnownEventStreamPayloadError(
      `Invalid Pi event stream payload: expected thread "${expectedThreadId}", received "${event.threadId}"`,
    );
  }
  if (isKnownPiClientEventType(event.type) && !isKnownEventPayload(event)) {
    throw new InvalidKnownEventStreamPayloadError(
      `Invalid Pi event stream payload: event "${event.type}" has an invalid payload`,
    );
  }
  return event as PiAnyClientEvent;
};

/**
 * Open a reconnecting SSE stream. Returns a synchronous unsubscribe that aborts
 * the in-flight request and stops reconnecting. Frames named `ping` and empty
 * frames are treated as heartbeats and dropped; every other frame's `data` is
 * JSON-parsed into a `PiAnyClientEvent`.
 */
export const openPiEventStream = (
  options: PiEventStreamOptions,
): (() => void) => {
  const {
    url,
    onEvent,
    onConnect,
    onError,
    fetchImpl = fetch,
    headers,
    expectedThreadId,
    snapshotRecoveryUrl,
    reconnectDelay = defaultReconnectDelay,
  } = options;

  let closed = false;
  let needsSnapshotRecovery = false;
  let cancelActiveReader: (() => void) | undefined;
  const abort = new AbortController();
  const reportCallbackError = (callbackError: unknown) => {
    console.error("[react-pi] onError callback threw an error", callbackError);
  };
  const reportEventCallbackError = (callbackError: unknown) => {
    console.error("[react-pi] onEvent callback threw an error", callbackError);
  };
  const reportError = (error: unknown) => {
    if (!onError) return;
    try {
      void Promise.resolve(onError(error)).catch(reportCallbackError);
    } catch (callbackError) {
      reportCallbackError(callbackError);
    }
  };
  const emitEvent = (event: PiAnyClientEvent) => {
    try {
      void Promise.resolve(onEvent(event)).catch(reportEventCallbackError);
    } catch (callbackError) {
      reportEventCallbackError(callbackError);
    }
  };
  const reportConnectCallbackError = (callbackError: unknown) => {
    console.error(
      "[react-pi] onConnect callback threw an error",
      callbackError,
    );
  };
  const emitConnect = () => {
    if (!onConnect) return;
    try {
      void Promise.resolve(onConnect()).catch(reportConnectCallbackError);
    } catch (callbackError) {
      reportConnectCallbackError(callbackError);
    }
  };

  const run = async () => {
    while (!closed) {
      try {
        const requestUrl =
          needsSnapshotRecovery && snapshotRecoveryUrl
            ? snapshotRecoveryUrl
            : url;
        const response = await fetchImpl(requestUrl, {
          method: "GET",
          signal: abort.signal,
          headers: { Accept: "text/event-stream", ...headers },
        });
        if (!response.ok || !response.body) {
          void response.body?.cancel().catch(() => undefined);
          throw new Error(`Pi event stream failed: HTTP ${response.status}`);
        }
        validateEventStreamContentType(response);
        emitConnect();

        const sseDecoder = createSseDecoder();
        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();
        const handleFrame = (frame: { event?: string; data: string }) => {
          if (frame.event === "ping" || frame.data === "") return;
          let parsed: PiAnyClientEvent;
          try {
            parsed = parseEventStreamPayload(frame.data, expectedThreadId);
          } catch (error) {
            if (error instanceof InvalidKnownEventStreamPayloadError) {
              throw error;
            }
            reportError(error);
            return;
          }
          if (!closed) emitEvent(parsed);
        };

        let shouldCancel = true;
        let cancelPromise: Promise<void> | undefined;
        const cancelReader = () => {
          cancelPromise ??= reader.cancel().catch(() => undefined);
          return cancelPromise;
        };
        const requestCancel = () => {
          void cancelReader();
        };
        cancelActiveReader = requestCancel;

        try {
          while (!closed) {
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
              result = await reader.read();
            } catch (error) {
              shouldCancel = false;
              throw error;
            }

            const { value, done } = result;
            if (done) {
              shouldCancel = false;
              break;
            }
            const chunk = textDecoder.decode(value, { stream: true });
            for (const frame of sseDecoder.push(chunk)) {
              handleFrame(frame);
            }
          }
        } finally {
          if (cancelActiveReader === requestCancel)
            cancelActiveReader = undefined;
          try {
            if (shouldCancel || cancelPromise) await cancelReader();
          } finally {
            reader.releaseLock();
          }
        }
      } catch (error) {
        if (closed || abort.signal.aborted) break;
        reportError(error);
      }
      if (closed) break;
      needsSnapshotRecovery = true;
      // Snapshot-first: the next connect replaces local state, so we lose
      // nothing by not replaying. Back off, then retry.
      try {
        await reconnectDelay();
      } catch (error) {
        if (closed) break;
        reportError(error);
        await defaultReconnectDelay();
        if (closed) break;
      }
    }
  };

  void run();

  return () => {
    closed = true;
    abort.abort();
    cancelActiveReader?.();
  };
};
