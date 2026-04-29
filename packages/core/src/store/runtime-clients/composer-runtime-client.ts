import type { Unsubscribe } from "../../types/unsubscribe";
import {
  resource,
  tapMemo,
  tapEffect,
  tapResource,
  type tapRef,
  withKey,
} from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapAssistantEmit,
  tapClientLookup,
} from "@assistant-ui/store";
import type {
  ComposerRuntime,
  EditComposerRuntime,
} from "../../runtime/api/composer-runtime";
import type { ComposerState } from "../scopes/composer";
import { AttachmentRuntimeClient } from "./attachment-runtime-client";
import { tapSubscribable } from "./tap-subscribable";

const ComposerAttachmentClientByIndex = resource(
  ({ runtime, index }: { runtime: ComposerRuntime; index: number }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index],
    );

    return tapResource(
      AttachmentRuntimeClient({
        runtime: attachmentRuntime,
      }),
    );
  },
);

export const ComposerClient = resource(
  ({
    threadIdRef,
    messageIdRef,
    runtime,
  }: {
    threadIdRef: tapRef.RefObject<string>;
    messageIdRef?: tapRef.RefObject<string>;
    runtime: ComposerRuntime;
  }): ClientOutput<"composer"> => {
    const runtimeState = tapSubscribable(runtime);
    const emit = tapAssistantEmit();

    // Bind composer events to event manager
    tapEffect(() => {
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

    const attachments = tapClientLookup(
      () =>
        runtimeState.attachments.map((attachment, idx) =>
          withKey(
            attachment.id,
            ComposerAttachmentClientByIndex({
              runtime,
              index: idx,
            }),
          ),
        ),
      [runtimeState.attachments, runtime],
    );

    const state = tapMemo<ComposerState>(() => {
      return {
        text: runtimeState.text,
        role: runtimeState.role,
        attachments: attachments.state,
        runConfig: runtimeState.runConfig,
        isEditing: runtimeState.isEditing,
        canCancel: runtimeState.canCancel,
        attachmentAccept: runtimeState.attachmentAccept,
        isEmpty: runtimeState.isEmpty,
        type: runtimeState.type ?? "thread",
        dictation: runtimeState.dictation,
        quote: runtimeState.quote,
        queue: [],
      };
    }, [runtimeState, attachments.state]);

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
      queueItem: () => {
        throw new Error("Queue is not supported in this runtime");
      },
      __internal_getRuntime: () => runtime,
    };
  },
);
