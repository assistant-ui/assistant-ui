import type { Unsubscribe } from "../../types/unsubscribe";
import { useMemo, useEffect, useRef } from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useAssistantEmit, useClientLookup } from "@assistant-ui/store/client";
import type {
  ComposerRuntime,
  ComposerRuntimeState,
  EditComposerRuntime,
} from "../../runtime/api/composer-runtime";
import type { ComposerState } from "../scopes/composer";
import { QueueItemClient } from "../clients/queue-item-client";
import { AttachmentRuntimeClient } from "./attachment-runtime-client";
import { useSubscribable } from "./useSubscribable";
import { runCleanups } from "../../subscribable/subscribable";

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

const toComposerState = (
  runtimeState: ComposerRuntimeState,
  attachments: ComposerState["attachments"],
  queue: ComposerState["queue"],
): ComposerState => ({
  text: runtimeState.text,
  role: runtimeState.role,
  attachments,
  runConfig: runtimeState.runConfig,
  isEditing: runtimeState.isEditing,
  canCancel: runtimeState.canCancel,
  canSend: runtimeState.canSend,
  attachmentAccept: runtimeState.attachmentAccept,
  isEmpty: runtimeState.isEmpty,
  type: runtimeState.type ?? "thread",
  dictation: runtimeState.dictation,
  quote: runtimeState.quote,
  queue,
  submission: runtimeState.submission,
  inTransit: runtimeState.inTransit,
});

const createGetState = (
  runtime: ComposerRuntime,
  runtimeState: ComposerRuntimeState,
  state: ComposerState,
) => {
  let overlaySnapshot: ComposerRuntimeState | undefined;
  let overlay: ComposerState | undefined;
  return () => {
    const snapshot = runtime.getState();
    if (snapshot === runtimeState) return state;
    if (snapshot !== overlaySnapshot) {
      overlaySnapshot = snapshot;
      overlay = toComposerState(snapshot, state.attachments, state.queue);
    }
    return overlay!;
  };
};

const useComposerClient = ({
  threadIdRef,
  messageIdRef,
  runtime,
  isSuggestion,
}: {
  threadIdRef: { current: string };
  messageIdRef?: { current: string };
  runtime: ComposerRuntime;
  isSuggestion?: ((text: string) => boolean) | undefined;
}): ClientOutput<"composer"> => {
  const runtimeState = useSubscribable(runtime, { live: true });
  const emit = useAssistantEmit();
  const pendingSuggestion = useRef(false);

  // Bind composer events to event manager
  useEffect(() => {
    const unsubscribers: Unsubscribe[] = [];

    // Subscribe to composer events
    const sendUnsubscribe = runtime.unstable_on("send", (payload) => {
      const suggestion = pendingSuggestion.current;
      pendingSuggestion.current = false;
      emit("composer.send", {
        threadId: threadIdRef.current,
        ...(messageIdRef && { messageId: messageIdRef.current }),
        chars: payload.chars,
        attachments: payload.attachments,
        ...(suggestion ? { suggestion: true } : undefined),
      });
    });
    unsubscribers.push(sendUnsubscribe);

    const attachmentUnsubscribe = runtime.unstable_on(
      "attachmentAdd",
      (payload) => {
        emit("composer.attachmentAdd", {
          threadId: threadIdRef.current,
          ...(messageIdRef && { messageId: messageIdRef.current }),
          ...(payload.contentType
            ? { contentType: payload.contentType }
            : undefined),
        });
      },
    );
    unsubscribers.push(attachmentUnsubscribe);

    unsubscribers.push(
      runtime.unstable_on("attachmentAddError", (payload) => {
        // payload.error omitted: raw Error is not store-serializable; use runtime.unstable_on for it.
        emit("composer.attachmentAddError", {
          threadId: threadIdRef.current,
          ...(messageIdRef && { messageId: messageIdRef.current }),
          ...(payload.attachmentId && { attachmentId: payload.attachmentId }),
          reason: payload.reason,
          message: payload.message,
          ...(payload.contentType
            ? { contentType: payload.contentType }
            : undefined),
        });
      }),
    );

    unsubscribers.push(
      runtime.unstable_on("textChange", (payload) => {
        emit("composer.textChange", {
          threadId: threadIdRef.current,
          ...(messageIdRef && { messageId: messageIdRef.current }),
          text: payload.text,
          origin: payload.origin,
        });
      }),
    );

    return () => runCleanups(unsubscribers);
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
          onMove: (placement) => runtime.moveQueueItem(item.id, placement),
          onRemove: () => runtime.removeQueueItem(item.id),
        }),
      ),
    ),
  );

  const state = useMemo(
    () => toComposerState(runtimeState, attachments.state, queue),
    [runtimeState, attachments.state, queue],
  );
  const getState = useMemo(
    () => createGetState(runtime, runtimeState, state),
    [runtime, runtimeState, state],
  );

  return {
    getState,
    setText: runtime.setText,
    setRole: runtime.setRole,
    setRunConfig: runtime.setRunConfig,
    addAttachment: runtime.addAttachment,
    reset: runtime.reset,
    clearAttachments: runtime.clearAttachments,
    send: (options) => {
      const state = runtime.getState();
      pendingSuggestion.current =
        state.canSend && (isSuggestion?.(state.text) ?? false);
      runtime.send(options);
    },
    cancel: () => {
      if (!messageIdRef && runtime.getState().canCancel) {
        emit("composer.cancel", { threadId: threadIdRef.current });
      }
      runtime.cancel();
    },
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
    queueItem: (selector) => {
      if ("id" in selector) {
        return queueItems.get({ key: selector.id });
      } else {
        return queueItems.get(selector);
      }
    },
    __internal_getRuntime: () => runtime,
  };
};

export const ComposerClient = resource(useComposerClient);
