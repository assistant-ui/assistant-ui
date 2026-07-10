import type { Unsubscribe } from "../../types/unsubscribe";
import { useMemo, useEffect } from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import {
  type ClientOutput,
  useAssistantEmit,
  useClientLookup,
} from "@assistant-ui/store";
import type {
  ComposerRuntime,
  EditComposerRuntime,
} from "../../runtime/api/composer-runtime";
import type { ComposerState } from "../scopes/composer";
import type { QueueItemState } from "../scopes/queue-item";
import { AttachmentRuntimeClient } from "./attachment-runtime-client";
import { useSubscribable } from "./useSubscribable";

const useComposerAttachmentClientByIndex = ({
  runtime,
  index,
}: {
  runtime: ComposerRuntime;
  index: number;
}) => {
  const attachmentRuntime = useMemo(
    () => runtime.getAttachmentByIndex(index),
    [runtime, index],
  );

  return useResource(
    AttachmentRuntimeClient({
      runtime: attachmentRuntime,
    }),
  );
};

const ComposerAttachmentClientByIndex = resource(
  useComposerAttachmentClientByIndex,
);

const useQueueItemClient = ({
  item,
  onSteer,
  onRemove,
}: {
  item: QueueItemState;
  onSteer: () => void;
  onRemove: () => void;
}): ClientOutput<"queueItem"> => {
  return {
    getState: () => item,
    steer: onSteer,
    remove: onRemove,
  };
};

const QueueItemClient = resource(useQueueItemClient);

const useComposerClient = ({
  threadIdRef,
  messageIdRef,
  runtime,
}: {
  threadIdRef: { current: string };
  messageIdRef?: { current: string };
  runtime: ComposerRuntime;
}): ClientOutput<"composer"> => {
  const runtimeState = useSubscribable(runtime);
  const emit = useAssistantEmit();

  // Bind composer events to event manager
  useEffect(() => {
    const unsubscribers: Unsubscribe[] = [];

    // Subscribe to composer events
    for (const event of ["send", "attachmentAdd"] as const) {
      const unsubscribe = runtime.unstable_on(event, () => {
        emit(`composer.${event}`, {
          threadId: threadIdRef.current,
          ...(messageIdRef && { messageId: messageIdRef.current }),
        });
      });
      unsubscribers.push(unsubscribe);
    }

    unsubscribers.push(
      runtime.unstable_on("attachmentAddError", (payload) => {
        // payload.error omitted: raw Error is not store-serializable; use runtime.unstable_on for it.
        emit("composer.attachmentAddError", {
          threadId: threadIdRef.current,
          ...(messageIdRef && { messageId: messageIdRef.current }),
          ...(payload.attachmentId && { attachmentId: payload.attachmentId }),
          reason: payload.reason,
          message: payload.message,
        });
      }),
    );

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [runtime, emit, threadIdRef, messageIdRef]);

  const attachments = useClientLookup(
    runtimeState.attachments.map((attachment, idx) =>
      withKey(
        attachment.id,
        ComposerAttachmentClientByIndex({
          runtime,
          index: idx,
        }),
        [runtime, idx],
      ),
    ),
  );

  const queue = runtimeState.queue;
  const queueItems = useClientLookup(
    queue.map((item) =>
      withKey(
        item.id,
        QueueItemClient({
          item,
          onSteer: () => runtime.steerQueueItem(item.id),
          onRemove: () => runtime.removeQueueItem(item.id),
        }),
      ),
    ),
  );

  const state = useMemo<ComposerState>(() => {
    return {
      text: runtimeState.text,
      role: runtimeState.role,
      attachments: attachments.state,
      runConfig: runtimeState.runConfig,
      isEditing: runtimeState.isEditing,
      isSending: runtimeState.isSending,
      canCancel: runtimeState.canCancel,
      canSend: runtimeState.canSend,
      attachmentAccept: runtimeState.attachmentAccept,
      isEmpty: runtimeState.isEmpty,
      type: runtimeState.type ?? "thread",
      dictation: runtimeState.dictation,
      quote: runtimeState.quote,
      queue,
    };
  }, [runtimeState, attachments.state, queue]);

  return {
    getState: () => state,
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
    startDictation: runtime.startDictation,
    stopDictation: runtime.stopDictation,
    setQuote: runtime.setQuote,
    attachment: (selector) => {
      if ("id" in selector) {
        return attachments.get({ key: selector.id });
      } else {
        return attachments.get(selector);
      }
    },
    queueItem: (selector) => queueItems.get(selector),
    __internal_getRuntime: () => runtime,
  };
};

export const ComposerClient = resource(useComposerClient);
