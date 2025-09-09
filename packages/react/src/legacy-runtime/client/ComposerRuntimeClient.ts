import { resource, tapMemo, tapEffect, RefObject } from "@assistant-ui/tap";
import {
  ComposerRuntime,
  EditComposerRuntime,
} from "../runtime/ComposerRuntime";
import { Unsubscribe } from "../../types";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { tapApi } from "../../utils/tap-store";
import { ComposerRuntimeEventType } from "../runtime-cores/core/ComposerRuntimeCore";
import { tapEvents } from "../../client/EventContext";
import {
  ComposerClientState,
  ComposerClientApi,
} from "../../client/types/Composer";

export const ComposerClient = resource(
  ({
    threadIdRef,
    messageIdRef,
    runtime,
  }: {
    threadIdRef: RefObject<string>;
    messageIdRef?: RefObject<string>;
    runtime: ComposerRuntime;
  }) => {
    const runtimeState = tapSubscribable(runtime);
    const events = tapEvents();

    // Bind composer events to event manager
    tapEffect(() => {
      const unsubscribers: Unsubscribe[] = [];

      // Subscribe to composer events
      const composerEvents: ComposerRuntimeEventType[] = [
        "send",
        "attachment-add",
      ];

      for (const event of composerEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          events.emit(`composer.${event}`, {
            threadId: threadIdRef.current,
            ...(messageIdRef && { messageId: messageIdRef.current }),
          });
        });
        unsubscribers.push(unsubscribe);
      }

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, events, threadIdRef, messageIdRef]);

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

    const api = tapApi<ComposerClientApi>({
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
