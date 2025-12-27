import { ComposerClientState, ComposerClientApi } from "./Composer";
import { MessagePartClientApi, MessagePartClientState } from "./Part";
import { MessageRuntime } from "../../legacy-runtime/runtime";
import {
  SpeechState,
  SubmittedFeedback,
} from "../../legacy-runtime/runtime-cores/core/ThreadRuntimeCore";
import { ThreadMessage } from "../../types";
import { RunConfig } from "../../types/AssistantTypes";
import { AttachmentClientApi } from "./Attachment";

export type MessageClientState = ThreadMessage & {
  readonly parentId: string | null;
  readonly isLast: boolean;

  readonly branchNumber: number;
  readonly branchCount: number;

  /**
   * @deprecated The `speech` property is deprecated and will be removed in a future version.
   *
   * To enable text-to-speech, provide a `SpeechSynthesisAdapter` to the runtime.
   *
   * @example, using `useChatRuntime`:
   *
   * import { WebSpeechSynthesisAdapter } from "@assistant-ui/react";
   * import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
   * const runtime = useChatRuntime({
   *   adapters: {
   *     speech: new WebSpeechSynthesisAdapter(),
   *   },
   * });
   */
  readonly speech: SpeechState | undefined;
  /**
   * @deprecated Use `message.metadata.submittedFeedback` instead. This will be removed in 0.12.0.
   */
  readonly submittedFeedback: SubmittedFeedback | undefined;

  readonly composer: ComposerClientState;
  readonly parts: readonly MessagePartClientState[];

  readonly isCopied: boolean;
  readonly isHovering: boolean;

  /** The position of this message in the thread (0 for first message) */
  readonly index: number;
};

export type MessageClientApi = {
  /**
   * Get the current state of the message.
   */
  getState(): MessageClientState;

  readonly composer: ComposerClientApi;

  reload(config?: { runConfig?: RunConfig }): void;
  /**
   * @deprecated The `speak()` method is deprecated. Use the `AssistantActionBar.Speak` component instead.
   */
  speak(): void;
  /**
   * @deprecated The `stopSpeaking()` method is deprecated. Use the `AssistantActionBar.StopSpeaking` component instead.
   */
  stopSpeaking(): void;
  submitFeedback(feedback: { type: "positive" | "negative" }): void;
  switchToBranch(options: {
    position?: "previous" | "next";
    branchId?: string;
  }): void;
  getCopyText(): string;

  part: (
    selector: { index: number } | { toolCallId: string },
  ) => MessagePartClientApi;
  attachment(selector: { index: number } | { id: string }): AttachmentClientApi;

  setIsCopied(value: boolean): void;
  setIsHovering(value: boolean): void;

  /** @internal */
  __internal_getRuntime?(): MessageRuntime;
};
