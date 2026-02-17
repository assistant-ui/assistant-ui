import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  Attachment,
  ThreadMessage,
} from "../../types";
import {
  resource,
  tapMemo,
  tapState,
  tapResource,
  withKey,
} from "@assistant-ui/tap";
import type { ClientOutput } from "../types/client";
import { tapClientLookup } from "../tap-client-lookup";
import type { MessageState, PartState } from "../scopes";
import { NoOpComposerClient } from "./no-op-composer-client";

const ThreadMessagePartClient = resource(
  ({
    part,
  }: {
    part: ThreadAssistantMessagePart | ThreadUserMessagePart;
  }): ClientOutput<"part"> => {
    const state = tapMemo<PartState>(() => {
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
    };
  },
);

const ThreadMessageAttachmentClient = resource(
  ({ attachment }: { attachment: Attachment }): ClientOutput<"attachment"> => {
    return {
      getState: () => attachment,
      remove: () => {
        throw new Error("Not supported");
      },
    };
  },
);
export type ThreadMessageClientProps = {
  message: ThreadMessage;
  index: number;
  isLast?: boolean;
  branchNumber?: number;
  branchCount?: number;
};

export const ThreadMessageClient = resource(
  ({
    message,
    index,
    isLast = true,
    branchNumber = 1,
    branchCount = 1,
  }: ThreadMessageClientProps): ClientOutput<"message"> => {
    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);

    const parts = tapClientLookup(
      () =>
        message.content.map((part, idx) =>
          withKey(
            "toolCallId" in part && part.toolCallId != null
              ? `toolCallId-${part.toolCallId}`
              : `index-${idx}`,
            ThreadMessagePartClient({ part }),
          ),
        ),
      [message.content],
    );

    const attachments = tapClientLookup(
      () =>
        (message.attachments ?? []).map((attachment) =>
          withKey(attachment.id, ThreadMessageAttachmentClient({ attachment })),
        ),
      [message.attachments],
    );

    const composer = tapResource(NoOpComposerClient({ type: "edit" }));
    const composerState = composer.getState();

    const state = tapMemo<MessageState>(() => {
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
        submittedFeedback: message.metadata.submittedFeedback,
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
        return message.content
          .map((part) => {
            if ("text" in part && typeof part.text === "string") {
              return part.text;
            }
            return "";
          })
          .join("\n");
      },
      setIsCopied,
      setIsHovering,
    };
  },
);
