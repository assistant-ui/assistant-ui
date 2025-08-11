import { resource, tapMemo } from "@assistant-ui/tap";
import { AttachmentRuntime } from "../api/AttachmentRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { Attachment } from "../types";

export type AttachmentClientState = Attachment;

export const MessageAttachmentClient = resource(
  ({ runtime }: { runtime: AttachmentRuntime & { source: "message" } }) => {
    const runtimeState = tapSubscribable(runtime);

    const state = tapMemo<AttachmentClientState>(() => {
      return runtimeState as AttachmentClientState;
    }, [runtimeState]);

    return {
      state,
      actions: {} as const,
    };
  },
);
