import type { ThreadMessage } from "../AssistantTypes";
import type {
  SpeechState,
  SubmittedFeedback,
} from "../../legacy-runtime/runtime-cores/core/ThreadRuntimeCore";
import type { RunConfig } from "../AssistantTypes";
import type { MessageRuntime } from "../../legacy-runtime/runtime";
import type { ComposerMethods, ComposerState } from "./composer";
import type { PartMethods, PartState } from "./part";
import type { AttachmentMethods } from "./attachment";

export type MessageState = ThreadMessage & {
  readonly parentId: string | null;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  /**
   * @deprecated This API is still under active development and might change without notice.
   *
   * To enable text-to-speech, provide a `SpeechSynthesisAdapter` to the runtime.
   *
   * @example
   * ```ts
   * import { WebSpeechSynthesisAdapter } from "@assistant-ui/react";
   * import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
   *
   * const runtime = useChatRuntime({
   *   adapters: {
   *     speech: new WebSpeechSynthesisAdapter(),
   *   },
   * });
   */
  readonly speech: SpeechState | undefined;
  /** @deprecated Use `message.metadata.submittedFeedback` instead. This will be removed in 0.12.0. */
  readonly submittedFeedback: SubmittedFeedback | undefined;
  readonly composer: ComposerState;
  readonly parts: readonly PartState[];
  readonly isCopied: boolean;
  readonly isHovering: boolean;
  /** The position of this message in the thread (0 for first message) */
  readonly index: number;
};

export type MessageMethods = {
  /**
   * Get the current state of the message.
   */
  getState(): MessageState;
  composer(): ComposerMethods;
  reload(config?: { runConfig?: RunConfig }): void;
  /** @deprecated This API is still under active development and might change without notice. */
  speak(): void;
  /** @deprecated This API is still under active development and might change without notice. */
  stopSpeaking(): void;
  submitFeedback(feedback: { type: "positive" | "negative" }): void;
  switchToBranch(options: {
    position?: "previous" | "next";
    branchId?: string;
  }): void;
  getCopyText(): string;
  part(selector: { index: number } | { toolCallId: string }): PartMethods;
  attachment(selector: { index: number } | { id: string }): AttachmentMethods;
  setIsCopied(value: boolean): void;
  setIsHovering(value: boolean): void;
  /** @internal */
  __internal_getRuntime?(): MessageRuntime;
};

export type MessageMeta = {
  source: "thread";
  query: { type: "id"; id: string } | { type: "index"; index: number };
};

export type MessageClientSchema = {
  methods: MessageMethods;
  meta: MessageMeta;
};
