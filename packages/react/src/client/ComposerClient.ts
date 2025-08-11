import { resource, tapMemo } from "@assistant-ui/tap";
import { ComposerRuntime } from "../api/ComposerRuntime";
import { Attachment } from "../types";
import { MessageRole, RunConfig } from "../types/AssistantTypes";
import { tapRefValue } from "./util-hooks/tapRefValue";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapActions } from "@assistant-ui/react-core";

type AttachmentClientActions = {
  readonly remove: () => Promise<void>;
};

export type ComposerClientState = {
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
};

export type ComposerClientActions = {
  readonly setText: (text: string) => void;
  readonly setRole: (role: MessageRole) => void;
  readonly setRunConfig: (runConfig: RunConfig) => void;
  readonly addAttachment: (file: File) => Promise<void>;
  readonly clearAttachments: () => Promise<void>;
  readonly reset: () => Promise<void>;
  readonly send: () => void;
  readonly cancel: () => void;

  readonly attachment: (idx: number) => AttachmentClientActions;
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

      attachment: (idx: number) => {
        return {
          remove: runtimeRef.current.getAttachmentByIndex(idx).remove,
        };
      },
    });

    return {
      state,
      actions,
    };
  },
);
