import {
  resource,
  tapMemo,
  tapEffect,
  RefObject,
  tapInlineResource,
} from "@assistant-ui/tap";
import {
  ComposerRuntime,
  EditComposerRuntime,
} from "../runtime/ComposerRuntime";
import { Unsubscribe } from "../../types";

import { tapApi } from "../../utils/tap-store";
import { ComposerRuntimeEventType } from "../runtime-cores/core/ComposerRuntimeCore";
import { tapEvents } from "../../client/EventContext";
import {
  ComposerClientState,
  ComposerClientApi,
} from "../../client/types/Composer";
import { tapLookupResources } from "../../client/util-hooks/tapLookupResources";
import { AttachmentRuntimeClient } from "./AttachmentRuntimeClient";
import { tapSubscribable } from "../util-hooks/tapSubscribable";

const ComposerAttachmentClientByIndex = resource(
  ({ runtime, index }: { runtime: ComposerRuntime; index: number }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index],
    );

    return tapInlineResource(
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

    const attachments = tapLookupResources(
      runtimeState.attachments.map((_, idx) =>
        ComposerAttachmentClientByIndex(
          { runtime: runtime, index: idx },
          { key: idx },
        ),
      ),
    );

    const state = tapMemo<ComposerClientState>(() => {
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
      };
    }, [runtimeState, attachments.state]);

    return tapApi<ComposerClientApi>({
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

      attachment: (selector) => {
        if ("id" in selector) {
          return attachments.api({ key: selector.id });
        } else {
          return attachments.api(selector);
        }
      },

      __internal_getRuntime: () => runtime,
    });
  },
);
