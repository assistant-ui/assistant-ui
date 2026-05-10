export type ResumableStreamRole = "producer" | "consumer";

export type ResumableStreamStatus = "streaming" | "done" | "error" | "missing";

export type ResumableStreamEntry = {
  readonly cursor: string;
  readonly chunk: Uint8Array;
};

export type ResumableStreamAcquireOptions = {
  readonly ttlMs?: number;
};

export interface ResumableStreamStore {
  /**
   * Atomic election. The first caller for a given `streamId` observes
   * `"producer"`; every later caller observes `"consumer"`, including those
   * arriving after `finalize`.
   */
  acquire(
    streamId: string,
    options?: ResumableStreamAcquireOptions,
  ): Promise<ResumableStreamRole>;

  /** Implementations should refresh the TTL on each call. */
  append(streamId: string, chunk: Uint8Array): Promise<void>;

  finalize(
    streamId: string,
    status: "done" | "error",
    error?: string,
  ): Promise<void>;

  /**
   * Yields persisted entries strictly after `cursor` (`""` starts from the
   * beginning), then waits for new ones until the stream is finalized.
   * Aborting `signal` resolves the iterable without throwing.
   */
  read(
    streamId: string,
    cursor: string,
    signal: AbortSignal,
  ): AsyncIterable<ResumableStreamEntry>;

  status(streamId: string): Promise<ResumableStreamStatus>;

  /** Active readers terminate. No-op when the stream does not exist. */
  delete(streamId: string): Promise<void>;
}
