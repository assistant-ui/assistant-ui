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
  content:
    | string
    | (
        | TextContentPart
        | ImageContentPart
        | ToolCallContentPart<any, any>
        | CoreToolCallContentPart<any, any>
        | UIContentPart
      )[];
  id?: string | undefined;
  createdAt?: Date | undefined;
  status?: MessageStatus | undefined;
};

export const fromThreadMessageLike = (
  like: ThreadMessageLike,
  fallbackId: string,
  fallbackStatus: MessageStatus,
): ThreadMessage => {
  const { role, id, createdAt, status } = like;
  const common = {
    id: id ?? fallbackId,
    createdAt: createdAt ?? new Date(),
  };

  const content =
    typeof like.content === "string"
      ? [{ type: "text" as const, text: like.content }]
      : like.content;

  switch (role) {
    case "assistant":
      return {
        ...common,
        role,
        content: content
          .map((part): ThreadAssistantContentPart | null => {
            const type = part.type;
            switch (type) {
              case "text":
                if (part.text.trim().length === 0) return null;
                return part;

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
          })
          .filter((c) => !!c),
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
