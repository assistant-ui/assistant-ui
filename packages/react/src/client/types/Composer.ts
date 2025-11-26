import type { ComposerRuntime } from "../../legacy-runtime/runtime";
import type { ListeningState } from "../../legacy-runtime/runtime-cores/core/ComposerRuntimeCore";
import type { Attachment } from "../../types";
import type { MessageRole, RunConfig } from "../../types/AssistantTypes";
import type { AttachmentClientApi } from "./Attachment";

export type ComposerClientState = {
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly isEditing: boolean;
  readonly canCancel: boolean;
  readonly attachmentAccept: string;
  readonly isEmpty: boolean;
  readonly type: "thread" | "edit";
  /**
   * The current state of speech recognition (dictation).
   * Undefined when not listening.
   */
  readonly listening: ListeningState | undefined;
};

export type ComposerClientApi = {
  getState(): ComposerClientState;

  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(file: File): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: { index: number } | { id: string }): AttachmentClientApi;
  reset(): Promise<void>;
  send(): void;
  cancel(): void;
  beginEdit(): void;

  /**
   * Start speech recognition to convert voice to text input.
   * Requires a SpeechRecognitionAdapter to be configured.
   */
  startListening(): void;

  /**
   * Stop the current speech recognition session.
   */
  stopListening(): void;

  /** @internal */
  __internal_getRuntime?(): ComposerRuntime;
};
