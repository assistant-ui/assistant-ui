import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  ThreadMessage,
} from "../../types/message";
import type { Attachment } from "../../types/attachment";
import { useMemo, useState } from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useClientLookup } from "@assistant-ui/store";
import type { MessageState } from "../scopes/message";
import type { PartState } from "../scopes/part";
import { NoOpComposerClient } from "./no-op-composer-client";
import { getThreadMessageText } from "../../utils/text";

const useThreadMessagePartClient = ({
  part,
}: {
  part: ThreadAssistantMessagePart | ThreadUserMessagePart;
}): ClientOutput<"part"> => {
  const state = useMemo<PartState>(() => {
    return {
      ...part,
      status: { type: "complete" },
    };
  }, [part]);

  return {
    getState: () => state,
    addToolResult: () => {
      throw new Error("Not supported");
    },
    resumeToolCall: () => {
      throw new Error("Not supported");
    },
    respondToToolApproval: () => {
      throw new Error("Not supported");
    },
  };
};

const ThreadMessagePartClient = resource(useThreadMessagePartClient);

const useThreadMessageAttachmentClient = ({
  attachment,
}: {
  attachment: Attachment;
}): ClientOutput<"attachment"> => {
  return {
    getState: () => attachment,
    remove: () => {
      throw new Error("Not supported");
    },
  };
};

const ThreadMessageAttachmentClient = resource(
  useThreadMessageAttachmentClient,
);
export type ThreadMessageClientProps = {
  message: ThreadMessage;
  index: number;
  isLast?: boolean;
  branchNumber?: number;
  branchCount?: number;
};

const useThreadMessageClient = ({
  message,
  index,
  isLast = true,
  branchNumber = 1,
  branchCount = 1,
}: ThreadMessageClientProps): ClientOutput<"message"> => {
  const [isCopiedState, setIsCopied] = useState(false);
  const [isHoveringState, setIsHovering] = useState(false);

  const parts = useClientLookup(
    message.content.map((part, idx) =>
      withKey(
        "toolCallId" in part && part.toolCallId != null
          ? `toolCallId-${part.toolCallId}`
          : `index-${idx}`,
        ThreadMessagePartClient({ part }),
        [part],
      ),
    ),
  );

  const attachments = useClientLookup(
    (message.attachments ?? []).map((attachment) =>
      withKey(attachment.id, ThreadMessageAttachmentClient({ attachment }), [
        attachment,
      ]),
    ),
  );

  const composer = useResource(NoOpComposerClient({ type: "edit" }));
  const composerState = composer.getState();

  const state = useMemo<MessageState>(() => {
    return {
      ...message,
      parts: parts.state,
      composer: composerState,
      parentId: null,
      index,
      isLast,
      branchNumber,
      branchCount,
      speech: undefined,
      isCopied: isCopiedState,
      isHovering: isHoveringState,
    };
  }, [
    message,
    index,
    isCopiedState,
    isHoveringState,
    isLast,
    parts.state,
    composerState,
    branchNumber,
    branchCount,
  ]);

  return {
    getState: () => state,
    composer: () => composer,
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
    delete: () => {
      throw new Error("Not supported in ThreadMessageProvider");
    },
    reload: () => {
      throw new Error("Not supported in ThreadMessageProvider");
    },
    speak: () => {
      throw new Error("Not supported in ThreadMessageProvider");
    },
    stopSpeaking: () => {
      throw new Error("Not supported in ThreadMessageProvider");
    },
    submitFeedback: () => {
      throw new Error("Not supported in ThreadMessageProvider");
    },
    switchToBranch: () => {
      throw new Error("Not supported in ThreadMessageProvider");
    },
    getCopyText: () => {
      return getThreadMessageText(message);
    },
    setIsCopied,
    setIsHovering,
  };
};

export const ThreadMessageClient = resource(useThreadMessageClient);
