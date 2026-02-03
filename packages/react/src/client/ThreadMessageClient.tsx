"use client";
import {
  resource,
  tapMemo,
  tapState,
  tapInlineResource,
  withKey,
} from "@assistant-ui/tap";
import { type ClientOutput, tapClientLookup } from "@assistant-ui/store";
import { MessageState, PartState } from "../types/scopes";
import {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  Attachment,
  ThreadMessage,
} from "../types";
import { NoOpComposerClient } from "./NoOpComposerClient";

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
      state,
      methods: {
        getState: () => state,
        addToolResult: () => {
          throw new Error("Not supported");
        },
        resumeToolCall: () => {
          throw new Error("Not supported");
        },
      },
    };
  },
);

const ThreadMessageAttachmentClient = resource(
  ({ attachment }: { attachment: Attachment }): ClientOutput<"attachment"> => {
    return {
      state: attachment,
      methods: {
        getState: () => attachment,
        remove: () => {
          throw new Error("Not supported");
        },
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

    const parts = tapClientLookup(() => {
      // Track seen toolCallIds to skip duplicates entirely.
      // This prevents duplicate tool call UI rendering during HITL flows where
      // the same toolCallId may appear multiple times in message.content.
      // Note: After filtering, part({ index: N }) returns the Nth non-duplicate part,
      // not necessarily message.content[N]. Use part({ toolCallId }) for tool calls.
      const seenToolCallIds = new Set<string>();
      return message.content
        .map((part, idx) => {
          if ("toolCallId" in part && part.toolCallId != null) {
            const toolCallId = part.toolCallId;
            if (seenToolCallIds.has(toolCallId)) {
              // Skip duplicate toolCallId - only render the first occurrence
              return null;
            }
            seenToolCallIds.add(toolCallId);
            return withKey(
              `toolCallId-${toolCallId}`,
              ThreadMessagePartClient({ part }),
            );
          }
          return withKey(`index-${idx}`, ThreadMessagePartClient({ part }));
        })
        .filter((item) => item !== null);
    }, [message.content]);

    const attachments = tapClientLookup(
      () =>
        (message.attachments ?? []).map((attachment) =>
          withKey(attachment.id, ThreadMessageAttachmentClient({ attachment })),
        ),
      [message.attachments],
    );

    const composer = tapInlineResource(NoOpComposerClient({ type: "edit" }));

    const state = tapMemo<MessageState>(() => {
      return {
        ...message,
        parts: parts.state,
        composer: composer.state,
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
      composer.state,
      branchNumber,
      branchCount,
    ]);

    return {
      state,
      methods: {
        getState: () => state,
        composer: composer.methods,
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
      },
    };
  },
);
