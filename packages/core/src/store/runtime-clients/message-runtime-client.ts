import { useMemo, useState } from "react";
import { useResource, withKey, resource } from "@assistant-ui/tap";
import {
  type ClientOutput,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store";
import type { MessageRuntime } from "../../runtime/api/message-runtime";
import { useSubscribable } from "./useSubscribable";
import { liveRef } from "./liveRef";
import { ComposerClient } from "./composer-runtime-client";
import { MessagePartClient } from "./message-part-runtime-client";
import type { MessageState } from "../scopes/message";
import { AttachmentRuntimeClient } from "./attachment-runtime-client";

const useMessageAttachmentClientByIndex = ({
  runtime,
  index,
}: {
  runtime: MessageRuntime;
  index: number;
}) => {
  const attachmentRuntime = useMemo(
    () => runtime.getAttachmentByIndex(index),
    [runtime, index],
  );
  return useResource(AttachmentRuntimeClient({ runtime: attachmentRuntime }));
};

const MessageAttachmentClientByIndex = resource(
  useMessageAttachmentClientByIndex,
);

const useMessagePartByIndex = ({
  runtime,
  index,
}: {
  runtime: MessageRuntime;
  index: number;
}) => {
  const partRuntime = useMemo(
    () => runtime.getMessagePartByIndex(index),
    [runtime, index],
  );
  return useResource(MessagePartClient({ runtime: partRuntime }));
};

const MessagePartByIndex = resource(useMessagePartByIndex);

const useMessageClient = ({
  runtime,
  threadIdRef,
}: {
  runtime: MessageRuntime;
  threadIdRef: { current: string };
}): ClientOutput<"message"> => {
  const runtimeState = useSubscribable(runtime);

  const [isCopiedState, setIsCopied] = useState(false);
  const [isHoveringState, setIsHovering] = useState(false);

  const messageIdRef = useMemo(
    () => liveRef(() => runtime.getState().id),
    [runtime],
  );

  const composer = useClientResource(
    ComposerClient({
      runtime: runtime.composer,
      threadIdRef,
      messageIdRef,
    }),
  );
  const parts = useClientLookup(
    runtimeState.content.map((part, idx) =>
      withKey(
        "toolCallId" in part && part.toolCallId != null
          ? `toolCallId-${part.toolCallId}`
          : `index-${idx}`,
        MessagePartByIndex({ runtime, index: idx }),
      ),
    ),
  );

  const attachments = useClientLookup(
    (runtimeState.attachments ?? []).map((attachment, idx) =>
      withKey(
        attachment.id,
        MessageAttachmentClientByIndex({ runtime, index: idx }),
      ),
    ),
  );

  const state = useMemo<MessageState>(() => {
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
    getState: () => state,

    composer: () => composer.methods,

    delete: () => runtime.delete(),
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
  };
};

export const MessageClient = resource(useMessageClient);
