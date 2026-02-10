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
import {
  ComposerRuntime,
  EditComposerRuntime,
} from "../runtime/ComposerRuntime";
import { Unsubscribe } from "../../types";
import { ComposerRuntimeEventType } from "../runtime-cores/core/ComposerRuntimeCore";
import { ComposerState } from "../../types/scopes";
import { AttachmentRuntimeClient } from "./AttachmentRuntimeClient";
import { tapSubscribable } from "../util-hooks/tapSubscribable";

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
      const composerEvents: ComposerRuntimeEventType[] = [
        "send",
        "attachmentAdd",
      ];

      for (const event of composerEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          emit(`composer.${event}`, {
            threadId: threadIdRef.current,
            ...(messageIdRef && { messageId: messageIdRef.current }),
          });
        });
        unsubscribers.push(unsubscribe);
      }

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
      __internal_getRuntime: () => runtime,
    };
  },
);
