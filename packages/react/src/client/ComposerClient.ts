import { resource, tapMemo } from "@assistant-ui/tap";
import { ComposerRuntime, EditComposerRuntime } from "../api/ComposerRuntime";
import { Attachment } from "../types";
import { MessageRole, RunConfig } from "../types/AssistantTypes";
import { tapRefValue } from "./util-hooks/tapRefValue";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapActions } from "../utils/tap-store";
import { AttachmentClientActions } from "./AttachmentClient";

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

export type ComposerClientActions = {
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(file: File): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: { index: number }): AttachmentClientActions;
  reset(): Promise<void>;
  send(): void;
  cancel(): void;
  beginEdit(): void;

  __internal_getRuntime(): ComposerRuntime;
};

export const ComposerClient = resource(
  ({ runtime }: { runtime: ComposerRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const state = tapMemo<ComposerClientState>(() => {
      return {
        text: runtimeState.text,
        role: runtimeState.role,
        attachments: runtimeState.attachments,
        runConfig: runtimeState.runConfig,
        isEditing: runtimeState.isEditing,
        canCancel: runtimeState.canCancel,
        attachmentAccept: runtimeState.attachmentAccept,
        isEmpty: runtimeState.isEmpty,
        type: runtimeState.type ?? "thread",
      };
    }, [runtimeState]);

    const actions = tapActions<ComposerClientActions>({
      setText: runtimeRef.current.setText,
      setRole: runtimeRef.current.setRole,
      setRunConfig: runtimeRef.current.setRunConfig,
      addAttachment: runtimeRef.current.addAttachment,
      reset: runtimeRef.current.reset,

      clearAttachments: runtimeRef.current.clearAttachments,
      send: runtimeRef.current.send,
      cancel: runtimeRef.current.cancel,
      beginEdit:
        (runtimeRef.current as EditComposerRuntime).beginEdit ??
        (() => {
          throw new Error("beginEdit is not supported in this runtime");
        }),

      attachment: ({ index }) => {
        return {
          remove: runtimeRef.current.getAttachmentByIndex(index).remove,

          __internal_getRuntime: () =>
            runtimeRef.current.getAttachmentByIndex(index),
        };
      },

      __internal_getRuntime: () => runtimeRef.current,
    });

    return {
      state,
      actions,
    };
  },
);
