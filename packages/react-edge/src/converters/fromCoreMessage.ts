import {
  CompleteAttachment,
  INTERNAL,
  MessageStatus,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import { CoreMessage } from "../edge/CoreTypes";

const { generateId } = INTERNAL;

export const fromCoreMessages = (
  message: readonly CoreMessage[],
): ThreadMessage[] => {
  return message.map((message) => fromCoreMessage(message));
};

export const fromCoreMessage = (
  message: CoreMessage,
  {
    id = generateId(),
    status = { type: "complete", reason: "unknown" } as MessageStatus,
    attachments = [] as readonly CompleteAttachment[],
  } = {},
): ThreadMessage => {
  const commonProps = {
    id,
    createdAt: new Date(),
  };

  const role = message.role;
  switch (role) {
    case "assistant":
      return {
        ...commonProps,
        role,
        content: message.content.map((part) => {
          if (part.type === "tool-call") {
            return {
              ...part,
              args: part.args as any,
              argsText: JSON.stringify(part.args),
            } satisfies ToolCallMessagePart;
          }
          return part;
        }),
        status,

        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      } satisfies ThreadMessage;

    case "user":
      return {
        ...commonProps,
        role,
        content: message.content,
        attachments,
        metadata: { custom: {} },
      } satisfies ThreadMessage;

    case "system":
      return {
        ...commonProps,
        role,
        content: message.content,
        metadata: { custom: {} },
      } satisfies ThreadMessage;

    default: {
      const unsupportedRole: never = role;
      throw new Error(`Unknown message role: ${unsupportedRole}`);
    }
  }
};
