import type { HarnessCommand, HarnessState } from "../types";

export type HarnessRunInput = {
  /** Thread id; keys the server-side checkpoint. */
  readonly threadId: string;
  readonly commands: readonly HarnessCommand[];
  /** The client's latest committed state, sent so stateless servers can continue from it. */
  readonly state: HarnessState;
  readonly signal: AbortSignal;
};

/**
 * Delivers a command batch and yields server-authoritative state snapshots
 * until the run settles. Each snapshot replaces the previous one.
 */
export type HarnessTransport = {
  run(input: HarnessRunInput): AsyncIterable<HarnessState>;
  /**
   * Reconnect to a thread: replay the current snapshot and stream any run
   * that is still active server-side.
   */
  resume?(
    input: Omit<HarnessRunInput, "commands">,
  ): AsyncIterable<HarnessState>;
};
