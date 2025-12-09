import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { RuntimeCapabilities, SpeechState } from "../../legacy-runtime/runtime-cores/core/ThreadRuntimeCore";
import type { ThreadSuggestion, ExportedMessageRepository, ThreadMessageLike } from "../../legacy-runtime/runtime-cores";
import type { CreateAppendMessage, CreateStartRunConfig } from "../../legacy-runtime/runtime";
import type { CreateResumeRunConfig } from "../../legacy-runtime/runtime/ThreadRuntime";
import type { ModelContext } from "../../model-context";
import type { MessageState } from "./message";
import type { ComposerState } from "./composer";

export type ThreadState = {
  readonly isEmpty: boolean;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly capabilities: RuntimeCapabilities;
  readonly messages: readonly MessageState[];
  /** @deprecated This feature is experimental */
  readonly state: ReadonlyJSONValue;
  readonly suggestions: readonly ThreadSuggestion[];
  readonly extras: unknown;
  /** @deprecated This API is still under active development and might change without notice. */
  readonly speech: SpeechState | undefined;
  readonly composer: ComposerState;
};

export type ThreadMethods = {
  append(message: CreateAppendMessage): void;
  startRun(config: CreateStartRunConfig): void;
  unstable_resumeRun(config: CreateResumeRunConfig): void;
  cancelRun(): void;
  getModelContext(): ModelContext;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  /** @deprecated This API is still under active development and might change without notice. */
  stopSpeaking(): void;
  startVoice(): Promise<void>;
  stopVoice(): Promise<void>;
};

export type ThreadMeta = {
  source: "threads";
  query: { type: "main" };
};

export type ThreadEvents = {
  "thread.run-start": { threadId: string };
  "thread.run-end": { threadId: string };
  "thread.initialize": { threadId: string };
  "thread.model-context-update": { threadId: string };
};

export type ThreadClientSchema = {
  state: ThreadState;
  methods: ThreadMethods;
  meta: ThreadMeta;
  events: ThreadEvents;
};
