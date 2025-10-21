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
   * @deprecated This API is still under active development and might change without notice.
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
};

export type MessageClientApi = {
  /**
   * Get the current state of the message.
   */
  getState(): MessageClientState;

  readonly composer: ComposerClientApi;

  reload(config?: { runConfig?: RunConfig }): void;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  speak(): void;
  /**
   * @deprecated This API is still under active development and might change without notice.
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
