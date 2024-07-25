import {
  MessageStatus,
  TextContentPart,
  ImageContentPart,
  ToolCallContentPart,
  UIContentPart,
  ThreadMessage,
  ThreadAssistantContentPart,
  ThreadAssistantMessage,
  ThreadUserContentPart,
  ThreadUserMessage,
  ThreadSystemMessage,
} from "../../types";
import { CoreToolCallContentPart } from "../../types/AssistantTypes";

export type ThreadMessageLike = {
  role: "assistant" | "user" | "system";
  content: (
    | TextContentPart
    | ImageContentPart
    | ToolCallContentPart<any, any>
    | CoreToolCallContentPart<any, any>
    | UIContentPart
  )[];
  id?: string;
  createdAt?: Date;
  status?: MessageStatus;
};

export const fromThreadMessageLike = (
  like: ThreadMessageLike,
  fallbackId: string,
  fallbackStatus: MessageStatus,
): ThreadMessage => {
  const { role, content, id, createdAt, status } = like;
  const common = {
    id: id ?? fallbackId,
    createdAt: createdAt ?? new Date(),
  };
  switch (role) {
    case "assistant":
      return {
        ...common,
        role,
        content: content.map((part): ThreadAssistantContentPart => {
          const type = part.type;
          switch (type) {
            case "text":
            case "ui":
              return part;

            case "tool-call": {
              if ("argsText" in part) return part;
              return {
                ...part,
                argsText: JSON.stringify(part.args),
              };
            }

            default: {
              const unhandledType: "image" = type;
              throw new Error(`Unknown content part type: ${unhandledType}`);
            }
          }
        }),
        status: status ?? fallbackStatus,
      } satisfies ThreadAssistantMessage;

    case "user":
      return {
        ...common,
        role,
        content: content.map((part): ThreadUserContentPart => {
          const type = part.type;
          switch (type) {
            case "text":
            case "ui":
            case "image":
              return part;

            default: {
              const unhandledType: "tool-call" = type;
              throw new Error(`Unknown content part type: ${unhandledType}`);
            }
          }
        }),
      } satisfies ThreadUserMessage;

    case "system":
      if (content.length !== 1 || content[0]!.type !== "text")
        throw new Error(
          "System messages must have exactly one text content part.",
        );

      return {
        ...common,
        role,
        content: content as [TextContentPart],
      } satisfies ThreadSystemMessage;

    default: {
      const unsupportedRole: never = role;
      throw new Error(`Unknown message role: ${unsupportedRole}`);
    }
  }
};
