import type { Attachment, MessageRole, RunConfig } from "@assistant-ui/core";
import { ComposerRuntime } from "../../legacy-runtime/runtime";
import { AttachmentClientApi } from "./Attachment";

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

  /** @internal */
  __internal_getRuntime?(): ComposerRuntime;
};
