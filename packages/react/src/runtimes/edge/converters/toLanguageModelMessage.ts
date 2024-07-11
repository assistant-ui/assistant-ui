import {
  LanguageModelV1ImagePart,
  LanguageModelV1Message,
  LanguageModelV1TextPart,
  LanguageModelV1ToolCallPart,
  LanguageModelV1ToolResultPart,
} from "@ai-sdk/provider";
import { CoreMessage } from "../../../types";
import { TextContentPart, ToolCallContentPart } from "../../../types";

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
    addToolCallPart: (part: ToolCallContentPart) => {
      assistantMessage.content.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
      });
      if (part.result) {
        toolMessage.content.push({
          type: "tool-result",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result,
          // isError
        });
      }
    },
    getMessages: () => {
      if (toolMessage.content.length > 0) {
        return [...stash, assistantMessage, toolMessage];
      }

      return [...stash, assistantMessage];
    },
  };
};

export function toLanguageModelMessage(
  message: CoreMessage,
): LanguageModelV1Message[] {
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
                const unhandledType: never = type;
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
            const _exhaustiveCheck: never = type;
            throw new Error(`Unhandled content part type: ${_exhaustiveCheck}`);
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
}
