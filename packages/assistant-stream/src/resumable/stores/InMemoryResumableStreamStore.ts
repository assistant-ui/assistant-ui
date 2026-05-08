import { validateStreamId } from "../errors";
import type {
  ResumableStreamEntry,
  ResumableStreamStatus,
  ResumableStreamStore,
} from "../types";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

type FinalizeMarker = { kind: "done" } | { kind: "error"; error: string };

type StreamState = {
  entries: ResumableStreamEntry[];
  nextSeq: number;
  expiresAt: number;
  ttlMs: number;
  final: FinalizeMarker | undefined;
  waiters: Array<() => void>;
};

const cursorOf = (seq: number): string => seq.toString(36);
const seqFromCursor = (cursor: string): number => {
  if (cursor === "") return 0;
  const parsed = Number.parseInt(cursor, 36);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export type InMemoryResumableStreamStoreOptions = {
  readonly defaultTtlMs?: number;
  readonly now?: () => number;
  readonly maxChunkBytes?: number;
  readonly maxEntriesPerStream?: number;
  readonly maxStreams?: number;
  readonly gcIntervalMs?: number;
};

export function createInMemoryResumableStreamStore(
  options: InMemoryResumableStreamStoreOptions = {},
): ResumableStreamStore & { dispose: () => void } {
  const streams = new Map<string, StreamState>();
  const defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? Date.now;
  const maxChunkBytes = options.maxChunkBytes;
  const maxEntriesPerStream = options.maxEntriesPerStream;
  const maxStreams = options.maxStreams;

  const evictExpired = (): void => {
    const t = now();
    for (const [id, state] of streams) {
      if (state.expiresAt > t) continue;
      streams.delete(id);
      state.final ??= { kind: "error", error: "Stream expired" };
      notify(state);
    }
  };

  const notify = (state: StreamState): void => {
    const waiters = state.waiters;
    state.waiters = [];
    for (const wake of waiters) wake();
  };

  const findStartIndex = (state: StreamState, cursor: string): number => {
    if (cursor === "") return 0;
    const after = seqFromCursor(cursor);
    let lo = 0;
    let hi = state.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const seq = seqFromCursor(state.entries[mid]!.cursor);
      if (seq <= after) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const waitForUpdate = (
    state: StreamState,
    signal: AbortSignal,
    wakeBy?: number,
  ): Promise<void> =>
    new Promise<void>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const wake = () => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        signal.removeEventListener("abort", wake);
        const idx = state.waiters.indexOf(wake);
        if (idx !== -1) state.waiters.splice(idx, 1);
        resolve();
      };
      if (signal.aborted) {
        wake();
        return;
      }
      state.waiters.push(wake);
      signal.addEventListener("abort", wake, { once: true });
      if (wakeBy !== undefined) {
        if (wakeBy > 0) {
          timer = setTimeout(wake, wakeBy);
        } else {
          // already past the deadline; resolve so the caller can re-check
          // expiration without waiting for an external notify.
          wake();
        }
      }
    });

  const requireActive = (streamId: string): StreamState => {
    evictExpired();
    const state = streams.get(streamId);
    if (!state) throw new Error(`Stream not found: ${streamId}`);
    if (state.final) {
      throw new Error(`Stream already finalized: ${streamId}`);
    }
    return state;
  };

  const gcTimer =
    options.gcIntervalMs !== undefined
      ? setInterval(evictExpired, options.gcIntervalMs)
      : undefined;
  gcTimer?.unref?.();

  return {
    async acquire(streamId, acquireOptions) {
      validateStreamId(streamId);
      evictExpired();
      const existing = streams.get(streamId);
      if (existing) return "consumer";

      if (maxStreams !== undefined && streams.size >= maxStreams) {
        throw new Error("maxStreams exceeded");
      }

      const ttlMs = acquireOptions?.ttlMs ?? defaultTtlMs;
      streams.set(streamId, {
        entries: [],
        nextSeq: 1,
        expiresAt: now() + ttlMs,
        ttlMs,
        final: undefined,
        waiters: [],
      });
      return "producer";
    },

    async append(streamId, chunk) {
      validateStreamId(streamId);
      if (maxChunkBytes !== undefined && chunk.byteLength > maxChunkBytes) {
        throw new Error(`Chunk exceeds maxChunkBytes: ${chunk.byteLength}`);
      }
      const state = requireActive(streamId);
      if (
        maxEntriesPerStream !== undefined &&
        state.entries.length >= maxEntriesPerStream
      ) {
        throw new Error(`Stream exceeded maxEntriesPerStream: ${streamId}`);
      }
      const seq = state.nextSeq;
      state.nextSeq += 1;
      state.entries.push({ cursor: cursorOf(seq), chunk });
      state.expiresAt = now() + state.ttlMs;
      notify(state);
    },

    async finalize(streamId, status, error) {
      validateStreamId(streamId);
      evictExpired();
      const state = streams.get(streamId);
      if (!state) throw new Error(`Stream not found: ${streamId}`);
      if (state.final) return;
      state.final =
        status === "done"
          ? { kind: "done" }
          : { kind: "error", error: error ?? "Stream errored" };
      state.expiresAt = now() + state.ttlMs;
      notify(state);
    },

    async *read(streamId, cursor, signal) {
      validateStreamId(streamId);
      evictExpired();
      const state = streams.get(streamId);
      if (!state) throw new Error(`Stream not found: ${streamId}`);

      let idx = findStartIndex(state, cursor);

      while (true) {
        if (signal.aborted) return;

        while (idx < state.entries.length) {
          if (signal.aborted) return;
          yield state.entries[idx]!;
          idx += 1;
        }

        if (state.final) {
          if (state.final.kind === "error") {
            throw new Error(state.final.error);
          }
          return;
        }

        const wakeBy = state.expiresAt - now();
        await waitForUpdate(state, signal, wakeBy);
        evictExpired();
      }
    },

    async status(streamId): Promise<ResumableStreamStatus> {
      validateStreamId(streamId);
      evictExpired();
      const state = streams.get(streamId);
      if (!state) return "missing";
      if (!state.final) return "streaming";
      return state.final.kind === "error" ? "error" : "done";
    },

    async delete(streamId) {
      validateStreamId(streamId);
      const state = streams.get(streamId);
      if (!state) return;
      streams.delete(streamId);
      state.final ??= { kind: "done" };
      notify(state);
    },

    dispose() {
      if (gcTimer !== undefined) clearInterval(gcTimer);
    },
  };
}
