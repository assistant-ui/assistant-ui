/**
 * Server-Sent-Events decoding for the HTTP transport.
 *
 * SSE lives in the client layer, NOT the controller: `PiThreadController` only
 * ever sees decoded `PiClientEvent`s through `PiClient.subscribe`. The wire
 * format and reconnection live here.
 *
 * Two pieces:
 * - `createSseDecoder()` — a pure, incremental SSE frame parser. Feed it text
 *   chunks (which may split a frame mid-line); it returns the complete frames so
 *   far. This is the unit-tested core, with no network or browser dependency.
 * - `openPiEventStream()` — a `fetch` + `ReadableStream` loop that feeds the
 *   decoder and emits parsed `PiAnyClientEvent`s. Snapshot-first reconnect: the
 *   server re-sends a `snapshot` on every (re)connect, so a dropped stream
 *   recovers by replacing local state, never by replaying. The returned
 *   function aborts the in-flight fetch and stops the reconnect loop.
 *
 * Browser-safe: imports no `@earendil-works/pi-*`.
 */
import type { PiAnyClientEvent } from "./piTypes";

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
 * that chunk; partial trailing data is buffered until its terminating blank
 * line arrives. Handles `\n` and `\r\n` line endings, `:`-comment heartbeats,
 * and multi-line `data:`.
 */
export const createSseDecoder = () => {
  let buffer = "";
  let dataLines: string[] = [];
  let eventName: string | undefined;
  let lastId: string | undefined;

  const resetFrame = () => {
    dataLines = [];
    eventName = undefined;
  };

  const handleLine = (line: string, out: SseFrame[]) => {
    if (line === "") {
      // Blank line dispatches the frame. A frame with no data lines (e.g. a
      // lone `:` heartbeat followed by a blank line) is discarded.
      if (dataLines.length === 0) {
        resetFrame();
        return;
      }
      const frame: SseFrame = { data: dataLines.join("\n") };
      if (eventName !== undefined) frame.event = eventName;
      if (lastId !== undefined) frame.id = lastId;
      out.push(frame);
      resetFrame();
      return;
    }
    // Comment line (used for keep-alive); ignore.
    if (line.startsWith(":")) return;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    switch (field) {
      case "data":
        dataLines.push(value);
        break;
      case "event":
        eventName = value;
        break;
      case "id":
        lastId = value;
        break;
      // `retry:` is ignored — reconnect cadence is owned by openPiEventStream.
    }
  };

  return {
    push(chunk: string): SseFrame[] {
      buffer += chunk;
      const out: SseFrame[] = [];
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        buffer = buffer.slice(idx + 1);
        handleLine(line, out);
      }
      return out;
    },
    /** The last `id:` seen across all frames (the SSE "last event id"). */
    get lastEventId(): string | undefined {
      return lastId;
    },
  };
};

export interface PiEventStreamOptions {
  /** Absolute or relative URL of the SSE endpoint. */
  url: string;
  /** Called with each decoded `PiClientEvent`. */
  onEvent: (event: PiAnyClientEvent) => void;
  /** Non-fatal stream errors (network drop, bad JSON). The loop reconnects after
   * each; surface these for logging, not control flow. */
  onError?: (error: unknown) => void;
  /** Injected `fetch` (defaults to the global). */
  fetchImpl?: typeof fetch;
  /** Extra request headers (e.g. auth). */
  headers?: Record<string, string>;
  /** Reconnect backoff between a dropped stream and the next attempt. Returns a
   * promise that resolves when it's time to retry. Defaults to a ~1s timer;
   * injectable for tests. */
  reconnectDelay?: () => Promise<void>;
}

const defaultReconnectDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 1000));

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
    onError,
    fetchImpl = fetch,
    headers,
    reconnectDelay = defaultReconnectDelay,
  } = options;

  let closed = false;
  const abort = new AbortController();

  const run = async () => {
    while (!closed) {
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          signal: abort.signal,
          headers: { Accept: "text/event-stream", ...headers },
        });
        if (!response.ok || !response.body) {
          throw new Error(`Pi event stream failed: HTTP ${response.status}`);
        }

        const decoder = createSseDecoder();
        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();

        while (!closed) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = textDecoder.decode(value, { stream: true });
          for (const frame of decoder.push(chunk)) {
            if (frame.event === "ping" || frame.data === "") continue;
            let parsed: PiAnyClientEvent;
            try {
              parsed = JSON.parse(frame.data) as PiAnyClientEvent;
            } catch (error) {
              onError?.(error);
              continue;
            }
            if (!closed) onEvent(parsed);
          }
        }
      } catch (error) {
        if (closed || abort.signal.aborted) break;
        onError?.(error);
      }
      if (closed) break;
      // Snapshot-first: the next connect replaces local state, so we lose
      // nothing by not replaying. Back off, then retry.
      await reconnectDelay();
    }
  };

  void run();

  return () => {
    closed = true;
    abort.abort();
  };
};
