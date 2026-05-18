import { ResumableStreamError } from "./errors";
import type {
  ResumableStreamRole,
  ResumableStreamStatus,
  ResumableStreamStore,
} from "./types";

export type ResumableStreamContextOptions = {
  readonly store: ResumableStreamStore;
  readonly ttlMs?: number;
  /**
   * Required on serverless runtimes that terminate background work when the
   * request handler returns (Vercel, Cloudflare). Pass `after` from
   * `next/server` so the producer task outlives the response.
   */
  readonly waitUntil?: (promise: Promise<unknown>) => void;
  readonly onAcquire?: (streamId: string, role: ResumableStreamRole) => void;
  readonly onAppend?: (streamId: string, byteLength: number) => void;
  readonly onFinalize?: (
    streamId: string,
    status: "done" | "error",
    error?: string,
  ) => void;
  readonly onError?: (streamId: string, error: unknown) => void;
};

export interface ResumableStreamContext {
  /** Producer or consumer entrypoint. Atomically elects the role. */
  run(
    streamId: string,
    makeStream: () => ReadableStream<Uint8Array>,
  ): Promise<ReadableStream<Uint8Array>>;

  /** Returns `null` when the stream does not exist. */
  resume(streamId: string): Promise<ReadableStream<Uint8Array> | null>;

  /** Throws `ResumableStreamError("missing")` when the stream does not exist. */
  requireResume(streamId: string): Promise<ReadableStream<Uint8Array>>;

  status(streamId: string): Promise<ResumableStreamStatus>;

  delete(streamId: string): Promise<void>;
}

export function createResumableStreamContext(
  options: ResumableStreamContextOptions,
): ResumableStreamContext {
  const { store, waitUntil, onAcquire, onAppend, onFinalize, onError } =
    options;
  const acquireOptions =
    options.ttlMs !== undefined ? { ttlMs: options.ttlMs } : undefined;

  return {
    async run(streamId, makeStream) {
      const role = await store.acquire(streamId, acquireOptions);
      onAcquire?.(streamId, role);
      if (role === "producer") {
        startProducerTask(store, streamId, makeStream, {
          waitUntil,
          onAppend,
          onFinalize,
          onError,
        });
      }
      return readFromStore(store, streamId);
    },

    async resume(streamId) {
      const status = await store.status(streamId);
      if (status === "missing") return null;
      return readFromStore(store, streamId);
    },

    async requireResume(streamId) {
      const status = await store.status(streamId);
      if (status === "missing") {
        throw new ResumableStreamError(
          "missing",
          `resumable stream not found: ${streamId}`,
        );
      }
      return readFromStore(store, streamId);
    },

    async status(streamId) {
      return store.status(streamId);
    },

    async delete(streamId) {
      await store.delete(streamId);
    },
  };
}

type ProducerHooks = {
  readonly waitUntil: ((promise: Promise<unknown>) => void) | undefined;
  readonly onAppend:
    | ((streamId: string, byteLength: number) => void)
    | undefined;
  readonly onFinalize:
    | ((streamId: string, status: "done" | "error", error?: string) => void)
    | undefined;
  readonly onError: ((streamId: string, error: unknown) => void) | undefined;
};

function startProducerTask(
  store: ResumableStreamStore,
  streamId: string,
  makeStream: () => ReadableStream<Uint8Array>,
  hooks: ProducerHooks,
): void {
  const { waitUntil, onAppend, onFinalize, onError } = hooks;
  const task = (async () => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancelled = false;
    try {
      reader = makeStream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await store.append(streamId, value);
        onAppend?.(streamId, value.byteLength);
      }
      await store.finalize(streamId, "done");
      onFinalize?.(streamId, "done");
    } catch (err) {
      cancelled = true;
      onError?.(streamId, err);
      const message = err instanceof Error ? err.message : String(err);
      try {
        await reader?.cancel(err);
      } catch (cancelErr) {
        console.error("resumable stream reader cancel failed:", cancelErr);
      }
      try {
        await store.finalize(streamId, "error", message);
        onFinalize?.(streamId, "error", message);
      } catch (finalizeErr) {
        console.error("resumable stream finalize failed:", finalizeErr);
      }
    } finally {
      if (!cancelled) reader?.releaseLock();
    }
  })();

  if (waitUntil) waitUntil(task);
  task.catch((err) => {
    console.error("resumable producer task failed:", err);
  });
}

function readFromStore(
  store: ResumableStreamStore,
  streamId: string,
): ReadableStream<Uint8Array> {
  const ac = new AbortController();
  let iterator: AsyncIterator<{ chunk: Uint8Array }> | undefined;

  return new ReadableStream<Uint8Array>({
    start() {
      iterator = store.read(streamId, "", ac.signal)[Symbol.asyncIterator]();
    },
    async pull(controller) {
      try {
        if (!iterator) return;
        const { done, value } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value.chunk);
      } catch (err) {
        // the platform never calls cancel() on errored streams, so unwind
        // the store iterator and abort the signal explicitly.
        ac.abort();
        try {
          await iterator?.return?.();
        } catch {}
        controller.error(err);
      }
    },
    cancel() {
      ac.abort();
      iterator?.return?.().catch(() => {});
    },
  });
}
