import { useEffect, useMemo, useState } from "react";
import { resource } from "@assistant-ui/tap";
import type { HarnessTransport } from "./transport/HarnessTransport";
import {
  createInitialState,
  normalizeState,
  type HarnessCommand,
  type HarnessErrorInfo,
  type HarnessFile,
  type HarnessInterrupt,
  type HarnessMessage,
  type HarnessQueueItem,
  type HarnessState,
  type HarnessTodo,
  type HarnessUserPart,
  type SendMessageCommand,
} from "./types";
import { applyOptimistic, buildViews, type HarnessSubagent } from "./views";

export type HarnessStatus = "submitted" | "streaming" | "ready" | "error";

export type HarnessOptions = {
  transport: HarnessTransport;
  /** Thread id; keys the server-side checkpoint. Generated when omitted. */
  id?: string;
  /** Reconnect on mount via transport.resume (snapshot-on-connect). */
  resume?: boolean;
  onFinish?: (() => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
};

/** A bare string is shorthand for a single text part. */
export type SendMessageInput =
  | string
  | { parts: readonly HarnessUserPart[]; behavior?: "queue" | "steer" };

export type HarnessSnapshot<TExtras = unknown> = {
  readonly id: string;
  /** Canonical state with optimistic sends applied. */
  readonly state: HarnessState<TExtras>;
  /** The main transcript, flattened from the message tree. */
  readonly messages: readonly HarnessMessage[];
  /** Nested transcripts keyed by the dispatching tool call id, recursive. */
  readonly subagents: Readonly<Record<string, HarnessSubagent>>;
  readonly status: HarnessStatus;
  readonly error: HarnessErrorInfo | null;
  readonly queue: readonly HarnessQueueItem[];
  readonly files: Readonly<Record<string, HarnessFile>>;
  readonly todos: readonly HarnessTodo[];
  readonly interrupt: HarnessInterrupt | null;
  readonly title?: string | undefined;
};

export type HarnessMethods = {
  sendMessage(input: SendMessageInput): void;
  addToolResult(input: {
    toolCallId: string;
    output: unknown;
    isError?: boolean;
  }): void;
  resume(interruptId: string, value: unknown): void;
  /** Cooperative cancel: closes the stream and delivers a cancel command. */
  stop(): void;
  cancelQueued(id: string): void;
  sendNow(id: string): void;
  /** Typed escape hatch; augment HarnessCustomCommands for app commands. */
  sendCommand(command: HarnessCommand): void;
};

export type HarnessApi<TExtras = unknown> = HarnessSnapshot<TExtras> &
  HarnessMethods;

type RunKind = "commands" | "resume";
type RunPhase = "idle" | "submitted" | "streaming";

type CoreSnapshot = {
  readonly state: HarnessState;
  readonly optimistic: readonly SendMessageCommand[];
  readonly phase: RunPhase;
  readonly error: HarnessErrorInfo | null;
};

class HarnessCore {
  transport!: HarnessTransport;
  onFinish: (() => void) | undefined;
  onError: ((error: Error) => void) | undefined;

  snapshot: CoreSnapshot = {
    state: createInitialState(),
    optimistic: [],
    phase: "idle",
    error: null,
  };

  #queued: HarnessCommand[] = [];
  #abortController: AbortController | null = null;
  #scheduled: RunKind | null = null;
  #followUp: RunKind | null = null;
  readonly #listeners = new Set<() => void>();

  constructor(readonly threadId: string) {}

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  };

  send(command: HarnessCommand): void {
    this.#queued.push(command);
    const optimistic =
      command.type === "send-message"
        ? [...this.snapshot.optimistic, command]
        : this.snapshot.optimistic;
    this.#update({ optimistic, error: null });
    this.#schedule("commands");
  }

  stop(): void {
    if (this.#abortController) {
      this.#queued.push({ type: "cancel" });
      this.#schedule("commands");
      this.#abortController.abort();
      return;
    }
    // Nothing sent yet: drop the scheduled batch locally.
    this.#scheduled = null;
    const batch = this.#queued
      .splice(0)
      .filter((c): c is SendMessageCommand => c.type === "send-message");
    this.#drop(batch);
  }

  resumeRun(): void {
    this.#schedule("resume");
  }

  #update(patch: Partial<CoreSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.#listeners) listener();
  }

  #schedule(kind: RunKind): void {
    if (this.#scheduled) {
      if (kind === "commands") this.#scheduled = kind;
      return;
    }
    if (this.#abortController) {
      if (this.#followUp !== "commands") this.#followUp = kind;
      return;
    }
    this.#scheduled = kind;
    // Defer so same-tick commands batch into a single request.
    queueMicrotask(() => {
      const scheduled = this.#scheduled;
      this.#scheduled = null;
      if (scheduled) void this.#run(scheduled);
    });
  }

  async #run(kind: RunKind): Promise<void> {
    const { transport, onFinish, onError } = this;
    const commands = kind === "commands" ? this.#queued.splice(0) : [];
    const batch = commands.filter(
      (c): c is SendMessageCommand => c.type === "send-message",
    );
    const abortController = new AbortController();
    this.#abortController = abortController;
    this.#update({ phase: "submitted", error: null });

    try {
      const input = {
        threadId: this.threadId,
        state: this.snapshot.state,
        signal: abortController.signal,
      };
      if (kind === "resume" && !transport.resume)
        throw new Error("Transport does not support resume");
      const stream =
        kind === "resume"
          ? transport.resume!(input)
          : transport.run({ ...input, commands });

      for await (const snapshot of stream) {
        const state = normalizeState(snapshot);
        this.#update({
          state,
          optimistic: this.snapshot.optimistic.filter(
            (c) =>
              !(c.id in state.messages) &&
              !state.queue.some((q) => q.id === c.id),
          ),
          phase: "streaming",
        });
      }
      this.#drop(batch);
      onFinish?.();
    } catch (e) {
      this.#drop(batch);
      if (!abortController.signal.aborted) {
        const error = e instanceof Error ? e : new Error(String(e));
        this.#update({ error: { message: error.message } });
        onError?.(error);
      }
    } finally {
      this.#abortController = null;
      const followUp = this.#followUp;
      this.#followUp = null;
      if (followUp) void this.#run(followUp);
      else this.#update({ phase: "idle" });
    }
  }

  /** The batch settled: every echo that will ever arrive has arrived. */
  #drop(batch: readonly SendMessageCommand[]): void {
    if (batch.length === 0) return;
    this.#update({
      optimistic: this.snapshot.optimistic.filter((c) => !batch.includes(c)),
    });
  }
}

const toSendMessageCommand = (input: SendMessageInput): SendMessageCommand => {
  const message =
    typeof input === "string"
      ? { parts: [{ type: "text" as const, text: input }] }
      : input;
  return {
    type: "send-message",
    id: crypto.randomUUID(),
    parts: message.parts,
    behavior: message.behavior ?? "queue",
  };
};

const useHarnessImpl = (options: HarnessOptions): HarnessApi => {
  const [core] = useState(
    () => new HarnessCore(options.id ?? crypto.randomUUID()),
  );
  const [snapshot, setSnapshot] = useState(core.snapshot);

  useEffect(() => {
    core.transport = options.transport;
    core.onFinish = options.onFinish;
    core.onError = options.onError;
  });

  useEffect(() => core.subscribe(() => setSnapshot(core.snapshot)), [core]);

  const resume = options.resume === true;
  useEffect(() => {
    if (resume) core.resumeRun();
  }, [core, resume]);

  const state = useMemo(
    () => applyOptimistic(snapshot.state, snapshot.optimistic),
    [snapshot.state, snapshot.optimistic],
  );
  const views = useMemo(() => buildViews(state), [state]);

  const status: HarnessStatus =
    snapshot.phase === "submitted"
      ? "submitted"
      : snapshot.phase === "streaming" || state.status.phase === "running"
        ? "streaming"
        : snapshot.optimistic.length > 0
          ? "submitted"
          : (snapshot.error ?? state.error)
            ? "error"
            : "ready";

  return {
    id: core.threadId,
    state,
    messages: views.messages,
    subagents: views.subagents,
    status,
    error: snapshot.error ?? state.error,
    queue: state.queue,
    files: state.files,
    todos: state.todos,
    interrupt: state.interrupt,
    title: state.title,
    sendMessage: (input) => core.send(toSendMessageCommand(input)),
    addToolResult: ({ toolCallId, output, isError }) =>
      core.send({
        type: "add-tool-result",
        toolCallId,
        output,
        ...(isError !== undefined && { isError }),
      }),
    resume: (interruptId, value) =>
      core.send({ type: "resume", interruptId, value }),
    stop: () => core.stop(),
    cancelQueued: (id) => core.send({ type: "cancel-queued", id }),
    sendNow: (id) => core.send({ type: "send-now", id }),
    sendCommand: (command) => core.send(command),
  };
};

export const HarnessResource = resource(useHarnessImpl);
