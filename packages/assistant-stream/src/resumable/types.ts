export type ResumableStreamRole = "producer" | "consumer";

export type ResumableStreamStatus = "streaming" | "done" | "error" | "missing";

export type ResumableStreamEntry = {
  readonly cursor: string;
  readonly chunk: Uint8Array;
};

export type ResumableStreamAcquireOptions = {
  readonly ttlMs?: number;
};

/** Producer identity returned by `acquireLease`; opaque to callers. */
export type ResumableStreamLease = {
  readonly token: string;
};

export type ResumableStreamAcquisition =
  | { readonly role: "producer"; readonly lease: ResumableStreamLease }
  | { readonly role: "consumer" };

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

  /**
   * Like `acquire`, but a producer also receives a lease identifying this
   * acquisition. Pass it to `append`, `finalize`, and `delete` so a producer
   * superseded by a later acquisition (even on the same store instance) cannot
   * mutate the replacement stream. Optional for backwards compatibility;
   * `createResumableStreamContext` uses it when present.
   */
  acquireLease?(
    streamId: string,
    options?: ResumableStreamAcquireOptions,
  ): Promise<ResumableStreamAcquisition>;

  /**
   * Implementations should refresh the TTL on each call.
   * After the promise resolves, caller mutations must not change stored bytes.
   * @param lease When given, the mutation applies only while `lease` still owns
   * the stream; a superseded producer's append throws `ResumableStreamError("missing")`,
   * its finalize/delete are no-ops. Without a lease, behavior is unchanged
   * (Redis: instance-scoped fencing by the most recent acquisition on this
   * instance; in-memory: no fencing).
   */
  append(
    streamId: string,
    chunk: Uint8Array,
    lease?: ResumableStreamLease,
  ): Promise<void>;

  /** @param lease See {@link ResumableStreamStore.append}. */
  finalize(
    streamId: string,
    status: "done" | "error",
    error?: string,
    lease?: ResumableStreamLease,
  ): Promise<void>;

  /**
   * Yields persisted entries strictly after `cursor` (`""` starts from the
   * beginning), then waits for new ones until the stream is finalized.
   * Aborting `signal` resolves the iterable without throwing.
   * Caller mutations to yielded chunks must not affect other reads.
   */
  read(
    streamId: string,
    cursor: string,
    signal: AbortSignal,
  ): AsyncIterable<ResumableStreamEntry>;

  status(streamId: string): Promise<ResumableStreamStatus>;

  /**
   * Active readers terminate. No-op when the stream does not exist.
   * @param lease See {@link ResumableStreamStore.append}.
   */
  delete(streamId: string, lease?: ResumableStreamLease): Promise<void>;
}
