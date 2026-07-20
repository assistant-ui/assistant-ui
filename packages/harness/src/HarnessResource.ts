import { useEffect, useMemo, useState } from "react";
import { resource, useResource } from "@assistant-ui/tap";
import type { ResourceElement } from "@assistant-ui/tap";
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
import {
  applyOptimistic,
  buildViews,
  isEchoed,
  type HarnessSubagent,
} from "./views";

export type HarnessStatus = "submitted" | "streaming" | "ready" | "error";

export type HarnessOptions = {
  transport: ResourceElement<HarnessTransport>;
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

type Mutable = {
  snapshot: CoreSnapshot;
  queued: HarnessCommand[];
  abort: AbortController | null;
  scheduled: RunKind | null;
  followUp: RunKind | null;
  disposed: boolean;
  transport: HarnessTransport;
  onFinish: (() => void) | undefined;
  onError: ((error: Error) => void) | undefined;
};

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
  const [threadId] = useState(() => options.id ?? crypto.randomUUID());
  const transport = useResource(options.transport);
  const [self] = useState(
    (): Mutable => ({
      snapshot: {
        state: createInitialState(),
        optimistic: [],
        phase: "idle",
        error: null,
      },
      queued: [],
      abort: null,
      scheduled: null,
      followUp: null,
      disposed: false,
      transport: null as never,
      onFinish: undefined,
      onError: undefined,
    }),
  );
  const [snapshot, setSnapshot] = useState(self.snapshot);

  useEffect(() => {
    self.transport = transport;
    self.onFinish = options.onFinish;
    self.onError = options.onError;
  });

  const update = (patch: Partial<CoreSnapshot>): void => {
    self.snapshot = { ...self.snapshot, ...patch };
    if (!self.disposed) setSnapshot(self.snapshot);
  };

  /** The batch settled: every echo that will ever arrive has arrived. */
  const drop = (batch: readonly SendMessageCommand[]): void => {
    if (batch.length === 0) return;
    update({
      optimistic: self.snapshot.optimistic.filter((c) => !batch.includes(c)),
    });
  };

  const run = async (kind: RunKind): Promise<void> => {
    const { transport } = self;
    const commands = kind === "commands" ? self.queued.splice(0) : [];
    const batch = commands.filter(
      (c): c is SendMessageCommand => c.type === "send-message",
    );
    const abort = new AbortController();
    self.abort = abort;
    update({ phase: "submitted", error: null });

    try {
      const input = {
        threadId,
        state: self.snapshot.state,
        signal: abort.signal,
      };
      if (kind === "resume" && !transport.resume)
        throw new Error("Transport does not support resume");
      const stream =
        kind === "resume"
          ? transport.resume!(input)
          : transport.run({ ...input, commands });

      for await (const snapshot of stream) {
        const state = normalizeState(snapshot);
        update({
          state,
          optimistic: self.snapshot.optimistic.filter(
            (c) => !isEchoed(state, c),
          ),
          phase: "streaming",
        });
      }
      drop(batch);
      self.onFinish?.();
    } catch (e) {
      drop(batch);
      if (!abort.signal.aborted) {
        const error = e instanceof Error ? e : new Error(String(e));
        update({ error: { message: error.message } });
        self.onError?.(error);
      }
    } finally {
      self.abort = null;
      const followUp = self.followUp;
      self.followUp = null;
      if (followUp) void run(followUp);
      else update({ phase: "idle" });
    }
  };

  const schedule = (kind: RunKind): void => {
    if (self.disposed) return;
    if (self.scheduled) {
      if (kind === "commands") self.scheduled = kind;
      return;
    }
    if (self.abort) {
      if (self.followUp !== "commands") self.followUp = kind;
      return;
    }
    self.scheduled = kind;
    // Defer so same-tick commands batch into a single request.
    queueMicrotask(() => {
      const scheduled = self.scheduled;
      self.scheduled = null;
      if (scheduled) void run(scheduled);
    });
  };

  const send = (command: HarnessCommand): void => {
    if (self.disposed) return;
    self.queued.push(command);
    const optimistic =
      command.type === "send-message"
        ? [...self.snapshot.optimistic, command]
        : self.snapshot.optimistic;
    update({ optimistic, error: null });
    schedule("commands");
  };

  const stop = (): void => {
    if (self.abort) {
      self.queued.push({ type: "cancel" });
      schedule("commands");
      self.abort.abort();
      return;
    }
    // Nothing sent yet: drop the scheduled batch locally.
    self.scheduled = null;
    const batch = self.queued
      .splice(0)
      .filter((c): c is SendMessageCommand => c.type === "send-message");
    drop(batch);
  };

  useEffect(() => {
    self.disposed = false;
    return () => {
      self.disposed = true;
      self.scheduled = null;
      self.followUp = null;
      self.queued.length = 0;
      self.abort?.abort();
    };
  }, [self]);

  const resume = options.resume === true;
  useEffect(() => {
    if (resume) schedule("resume");
  }, [self, resume]);

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
    id: threadId,
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
    sendMessage: (input) => send(toSendMessageCommand(input)),
    addToolResult: ({ toolCallId, output, isError }) =>
      send({
        type: "add-tool-result",
        toolCallId,
        output,
        ...(isError !== undefined && { isError }),
      }),
    resume: (interruptId, value) =>
      send({ type: "resume", interruptId, value }),
    stop,
    cancelQueued: (id) => send({ type: "cancel-queued", id }),
    sendNow: (id) => send({ type: "send-now", id }),
    sendCommand: send,
  };
};

export const HarnessResource = resource(useHarnessImpl);
