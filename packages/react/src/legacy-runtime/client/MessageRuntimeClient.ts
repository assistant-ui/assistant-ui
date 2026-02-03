import {
  withKey,
  resource,
  tapInlineResource,
  tapMemo,
  tapState,
} from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapClientLookup,
  tapClientResource,
} from "@assistant-ui/store";
import { MessageRuntime } from "../runtime/MessageRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { ComposerClient } from "./ComposerRuntimeClient";
import { MessagePartClient } from "./MessagePartRuntimeClient";
import { RefObject } from "react";
import { MessageState } from "../../types/scopes";
import { AttachmentRuntimeClient } from "./AttachmentRuntimeClient";

const MessageAttachmentClientByIndex = resource(
  ({ runtime, index }: { runtime: MessageRuntime; index: number }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index],
    );
    return tapInlineResource(
      AttachmentRuntimeClient({ runtime: attachmentRuntime }),
    );
  },
);

const MessagePartByIndex = resource(
  ({ runtime, index }: { runtime: MessageRuntime; index: number }) => {
    const partRuntime = tapMemo(
      () => runtime.getMessagePartByIndex(index),
      [runtime, index],
    );
    return tapInlineResource(MessagePartClient({ runtime: partRuntime }));
  },
);

export const MessageClient = resource(
  ({
    runtime,
    threadIdRef,
  }: {
    runtime: MessageRuntime;
    threadIdRef: RefObject<string>;
  }): ClientOutput<"message"> => {
    const runtimeState = tapSubscribable(runtime);

    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);

    const messageIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState().id;
        },
      }),
      [runtime],
    );

    const composer = tapClientResource(
      ComposerClient({
        runtime: runtime.composer,
        threadIdRef,
        messageIdRef,
      }),
    );

    const parts = tapClientLookup(() => {
      // Track seen toolCallIds to skip duplicates entirely
      // This prevents duplicate tool call UI rendering during HITL flows
      const seenToolCallIds = new Set<string>();
      return runtimeState.content
        .map((part, idx) => {
          if ("toolCallId" in part && part.toolCallId != null) {
            const toolCallId = part.toolCallId;
            if (seenToolCallIds.has(toolCallId)) {
              // Skip duplicate toolCallId entirely to prevent duplicate UI rendering
              return null;
            }
            seenToolCallIds.add(toolCallId);
            // Use original idx to preserve correct runtime index mapping
            return withKey(
              `toolCallId-${toolCallId}`,
              MessagePartByIndex({ runtime, index: idx }),
            );
          }
          return withKey(
            `index-${idx}`,
            MessagePartByIndex({ runtime, index: idx }),
          );
        })
        .filter((item) => item !== null);
    }, [runtimeState.content, runtime]);

    const attachments = tapClientLookup(
      () =>
        (runtimeState.attachments ?? []).map((attachment, idx) =>
          withKey(
            attachment.id,
            MessageAttachmentClientByIndex({ runtime, index: idx }),
          ),
        ),
      [runtimeState.attachments, runtime],
    );

    const state = tapMemo<MessageState>(() => {
      return {
        ...(runtimeState as MessageState),

        parts: parts.state,
        composer: composer.state,

        isCopied: isCopiedState,
        isHovering: isHoveringState,
      };
    }, [
      runtimeState,
      parts.state,
      composer.state,
      isCopiedState,
      isHoveringState,
    ]);

    return {
      state,
      methods: {
        getState: () => state,

        composer: composer.methods,

        reload: (config) => runtime.reload(config),
        speak: () => runtime.speak(),
        stopSpeaking: () => runtime.stopSpeaking(),
        submitFeedback: (feedback) => runtime.submitFeedback(feedback),
        switchToBranch: (options) => runtime.switchToBranch(options),
        getCopyText: () => runtime.unstable_getCopyText(),
        part: (selector) => {
          if ("index" in selector) {
            return parts.get({ index: selector.index });
          } else {
            return parts.get({ key: `toolCallId-${selector.toolCallId}` });
          }
        },

        attachment: (selector) => {
          if ("id" in selector) {
            return attachments.get({ key: selector.id });
          } else {
            return attachments.get(selector);
          }
        },

        setIsCopied,
        setIsHovering,

        __internal_getRuntime: () => runtime,
      },
    };
  },
);
