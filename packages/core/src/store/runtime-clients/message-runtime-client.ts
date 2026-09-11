import { useEffect, useMemo, useRef, useState } from "react";
import { useResource, withKey, resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  useAssistantEmit,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store/client";
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
  threadId,
  messageIdRef,
  reportedApprovalIds,
}: {
  runtime: MessageRuntime;
  index: number;
  threadId: string;
  messageIdRef: { current: string };
  reportedApprovalIds: Set<string>;
}) => {
  const partRuntime = useMemo(
    () => runtime.getMessagePartByIndex(index),
    [runtime, index],
  );
  return useResource(
    MessagePartClient({
      runtime: partRuntime,
      eventContext: { threadId, messageIdRef, reportedApprovalIds },
    }),
  );
};

const MessagePartByIndex = resource(useMessagePartByIndex);

const useMessageClient = ({
  runtime,
  threadIdRef,
  threadId,
  reportedApprovalIds,
}: {
  runtime: MessageRuntime;
  threadIdRef: { current: string };
  threadId: string;
  /** Approval ids already reported on this thread; owned by the thread client. */
  reportedApprovalIds: Set<string>;
}): ClientOutput<"message"> => {
  const runtimeState = useSubscribable(runtime);
  const emit = useAssistantEmit();

  const [isCopiedState, setIsCopied] = useState(false);
  const [isHoveringState, setIsHovering] = useState(false);

  const messageIdRef = useMemo(
    () => liveRef(() => runtime.getState().id),
    [runtime],
  );
  const previousStatus = useRef(runtimeState.status);
  const emitMessageEvent = (
    event:
      | "message.reload"
      | "message.speak"
      | "message.branchSwitched"
      | "message.copied",
  ) => {
    emit(event, { threadId, messageId: runtime.getState().id });
  };

  useEffect(() => {
    const status = runtimeState.status;
    const previous = previousStatus.current;
    previousStatus.current = status;
    if (
      status?.type === "incomplete" &&
      status.reason === "error" &&
      (previous?.type !== "incomplete" || previous.reason !== "error")
    ) {
      emit("message.error", {
        threadId,
        messageId: runtimeState.id,
        reason: "error",
      });
    }
  }, [runtimeState.status, runtimeState.id, emit, threadId]);

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
        MessagePartByIndex({
          runtime,
          index: idx,
          threadId,
          messageIdRef,
          reportedApprovalIds,
        }),
        [runtime, idx],
      ),
    ),
  );

  const attachments = useClientLookup(
    (runtimeState.attachments ?? []).map((attachment, idx) =>
      withKey(
        attachment.id,
        MessageAttachmentClientByIndex({ runtime, index: idx }),
        [runtime, idx],
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
    reload: (config) => {
      emitMessageEvent("message.reload");
      return runtime.reload(config);
    },
    speak: () => {
      emitMessageEvent("message.speak");
      return runtime.speak();
    },
    stopSpeaking: () => runtime.stopSpeaking(),
    submitFeedback: (feedback) => runtime.submitFeedback(feedback),
    switchToBranch: (options) => {
      emitMessageEvent("message.branchSwitched");
      return runtime.switchToBranch(options);
    },
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

    setIsCopied: (value) => {
      if (value) {
        emitMessageEvent("message.copied");
      }
      setIsCopied(value);
    },
    setIsHovering,

    __internal_getRuntime: () => runtime,
  };
};

export const MessageClient = resource(useMessageClient);
