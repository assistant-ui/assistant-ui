import {
  resource,
  tapInlineResource,
  tapMemo,
  tapState,
} from "@assistant-ui/tap";
import { tapApi } from "../../utils/tap-store";
import { MessageRuntime } from "../runtime/MessageRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { ComposerClient } from "./ComposerRuntimeClient";
import { MessagePartClient } from "./MessagePartRuntimeClient";
import { tapLookupResources } from "../../client/util-hooks/tapLookupResources";
import { RefObject } from "react";
import {
  MessageClientState,
  MessageClientApi,
} from "../../client/types/Message";
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
  }) => {
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

    const composer = tapInlineResource(
      ComposerClient({
        runtime: runtime.composer,
        threadIdRef,
        messageIdRef,
      }),
    );

    const parts = tapLookupResources(
      runtimeState.content.map((_, idx) =>
        MessagePartByIndex({ runtime, index: idx }, { key: idx }),
      ),
    );

    const attachments = tapLookupResources(
      runtimeState.attachments?.map((_, idx) =>
        MessageAttachmentClientByIndex({ runtime, index: idx }, { key: idx }),
      ) ?? [],
    );

    const state = tapMemo<MessageClientState>(() => {
      return {
        ...(runtimeState as MessageClientState),

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

    return tapApi<MessageClientApi>(
      {
        getState: () => state,

        composer: composer.api,

        reload: (config) => runtime.reload(config),
        speak: () => runtime.speak(),
        stopSpeaking: () => runtime.stopSpeaking(),
        submitFeedback: (feedback) => runtime.submitFeedback(feedback),
        switchToBranch: (options) => runtime.switchToBranch(options),
        getCopyText: () => runtime.unstable_getCopyText(),

        part: (selector) => {
          if ("index" in selector) {
            return parts.api({ index: selector.index });
          } else {
            return parts.api({ key: "toolCallId-" + selector.toolCallId });
          }
        },

        attachment: (selector) => {
          if ("id" in selector) {
            return attachments.api({ key: selector.id });
          } else {
            return attachments.api(selector);
          }
        },

        setIsCopied,
        setIsHovering,

        __internal_getRuntime: () => runtime,
      },
      {
        key: runtimeState.id,
      },
    );
  },
);
