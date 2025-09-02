import { resource, tapMemo } from "@assistant-ui/tap";
import { ComposerRuntime, EditComposerRuntime } from "../api/ComposerRuntime";
import { Attachment } from "../types";
import { MessageRole, RunConfig } from "../types/AssistantTypes";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapApi } from "../utils/tap-store";
import {
  AttachmentClientActions,
  AttachmentClientState,
} from "./AttachmentClient";
import { StoreApi } from "../utils/tap-store/tap-store-api";

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
  attachment(selector: {
    index: number;
  }): StoreApi<AttachmentClientState, AttachmentClientActions>;
  reset(): Promise<void>;
  send(): void;
  cancel(): void;
  beginEdit(): void;

  __internal_getRuntime(): ComposerRuntime;
};

export const ComposerClient = resource(
  ({ runtime }: { runtime: ComposerRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

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

    const api = tapApi<ComposerClientState, ComposerClientActions>(state, {
      setText: runtime.setText,
      setRole: runtime.setRole,
      setRunConfig: runtime.setRunConfig,
      addAttachment: runtime.addAttachment,
      reset: runtime.reset,

      clearAttachments: runtime.clearAttachments,
      send: runtime.send,
      cancel: runtime.cancel,
      beginEdit:
        (runtime as EditComposerRuntime).beginEdit ??
        (() => {
          throw new Error("beginEdit is not supported in this runtime");
        }),

      attachment: ({ index }) => {
        const attachmentRuntime = runtime.getAttachmentByIndex(index);
        return {
          getState: attachmentRuntime.getState,

          remove: attachmentRuntime.remove,

          __internal_getRuntime: () => runtime.getAttachmentByIndex(index),
        };
      },

      __internal_getRuntime: () => runtime,
    });

    return {
      state,
      api,
    };
  },
);
