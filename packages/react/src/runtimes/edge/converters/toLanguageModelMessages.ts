import {
  LanguageModelV1ImagePart,
  LanguageModelV1Message,
  LanguageModelV1TextPart,
  LanguageModelV1ToolCallPart,
  LanguageModelV1ToolResultPart,
} from "@ai-sdk/provider";
import {
  CoreMessage,
  ThreadMessage,
  TextContentPart,
  CoreToolCallContentPart,
} from "../../../types/AssistantTypes";

const assistantMessageSplitter = () => {
  const stash: LanguageModelV1Message[] = [];
  let assistantMessage = {
    role: "assistant" as const,
    content: [] as (LanguageModelV1TextPart | LanguageModelV1ToolCallPart)[],
  };
  let toolMessage = {
    role: "tool" as const,
    content: [] as LanguageModelV1ToolResultPart[],
  };

  return {
    addTextContentPart: (part: TextContentPart) => {
      if (toolMessage.content.length > 0) {
        stash.push(assistantMessage);
        stash.push(toolMessage);

        assistantMessage = {
          role: "assistant" as const,
          content: [] as (
            | LanguageModelV1TextPart
            | LanguageModelV1ToolCallPart
          )[],
        };

        toolMessage = {
          role: "tool" as const,
          content: [] as LanguageModelV1ToolResultPart[],
        };
      }

      assistantMessage.content.push(part);
    },
    addToolCallPart: (part: CoreToolCallContentPart) => {
      assistantMessage.content.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
      });

      toolMessage.content.push({
        type: "tool-result",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        result: part.result ?? "<no result>",
        isError: part.isError ?? false,
      });
    },
    getMessages: () => {
      if (toolMessage.content.length > 0) {
        return [...stash, assistantMessage, toolMessage];
      }

      return [...stash, assistantMessage];
    },
  };
};

export function toLanguageModelMessages(
  message: readonly CoreMessage[] | readonly ThreadMessage[],
): LanguageModelV1Message[] {
  return message.flatMap((message) => {
    const role = message.role;
    switch (role) {
      case "system": {
        return [{ role: "system", content: message.content[0].text }];
      }

      case "user": {
        const msg: LanguageModelV1Message = {
          role: "user",
          content: message.content.map(
            (part): LanguageModelV1TextPart | LanguageModelV1ImagePart => {
              const type = part.type;
              switch (type) {
                case "text": {
                  return part;
                }

                case "image": {
                  return {
                    type: "image",
                    image: new URL(part.image),
                  };
                }

                default: {
                  const unhandledType: "ui" = type;
                  throw new Error(
                    `Unspported content part type: ${unhandledType}`,
                  );
                }
              }
            },
          ),
        };
        return [msg];
      }

      case "assistant": {
        const splitter = assistantMessageSplitter();
        for (const part of message.content) {
          const type = part.type;
          switch (type) {
            case "text": {
              splitter.addTextContentPart(part);
              break;
            }
            case "tool-call": {
              splitter.addToolCallPart(part);
              break;
            }
            default: {
              const unhandledType: "ui" = type;
              throw new Error(`Unhandled content part type: ${unhandledType}`);
            }
          }
        }
        return splitter.getMessages();
      }

      default: {
        const unhandledRole: never = role;
        throw new Error(`Unknown message role: ${unhandledRole}`);
      }
    }
  });
}
