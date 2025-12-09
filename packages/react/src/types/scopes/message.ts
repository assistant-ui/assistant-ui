import type { ThreadMessage } from "../AssistantTypes";
import type { SpeechState, SubmittedFeedback } from "../../legacy-runtime/runtime-cores/core/ThreadRuntimeCore";
import type { RunConfig } from "../AssistantTypes";
import type { ComposerState } from "./composer";
import type { PartState } from "./part";

export type MessageState = ThreadMessage & {
  readonly parentId: string | null;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  /** @deprecated This API is still under active development and might change without notice. */
  readonly speech: SpeechState | undefined;
  /** @deprecated Use `message.metadata.submittedFeedback` instead. This will be removed in 0.12.0. */
  readonly submittedFeedback: SubmittedFeedback | undefined;
  readonly composer: ComposerState;
  readonly parts: readonly PartState[];
  readonly isCopied: boolean;
  readonly isHovering: boolean;
  readonly index: number;
};

export type MessageMethods = {
  reload(config?: { runConfig?: RunConfig }): void;
  /** @deprecated This API is still under active development and might change without notice. */
  speak(): void;
  /** @deprecated This API is still under active development and might change without notice. */
  stopSpeaking(): void;
  submitFeedback(feedback: { type: "positive" | "negative" }): void;
  switchToBranch(options: { position?: "previous" | "next"; branchId?: string }): void;
  getCopyText(): string;
  setIsCopied(value: boolean): void;
  setIsHovering(value: boolean): void;
};

export type MessageMeta = {
  source: "thread";
  query: { id: string } | { index: number };
};

export type MessageClientSchema = {
  state: MessageState;
  methods: MessageMethods;
  meta: MessageMeta;
};
