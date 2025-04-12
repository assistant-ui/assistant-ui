import { LanguageModelV1Message } from "@ai-sdk/provider";
import { Writable } from "stream";
import { CoreMessage } from "../edge/CoreTypes";
import { ToolCallContentPart } from "@assistant-ui/react";

type fromLanguageModelMessagesOptions = {
  mergeSteps?: boolean;
};

/**
 * @deprecated This is an internal API and may change without notice.
 */
export const fromLanguageModelMessages = (
  lm: LanguageModelV1Message[],
  { mergeSteps }: fromLanguageModelMessagesOptions = {},
): CoreMessage[] => {
  const messages: CoreMessage[] = [];

  for (const lmMessage of lm) {
    const role = lmMessage.role;
    switch (role) {
      case "system": {
        messages.push({
          role: "system",
          content: [
            {
              type: "text",
              text: lmMessage.content,
            },
          ],
        });
        break;
      }
      case "user": {
        messages.push({
          role: "user",
          content: lmMessage.content.map((part) => {
            const type = part.type;
            switch (type) {
              case "text": {
                return {
                  type: "text",
                  text: part.text,
                };
              }
              case "image": {
                if (part.image instanceof URL) {
                  return {
                    type: "image",
                    image: part.image.href,
                  };
                }
                throw new Error("Only images with URL data are supported");
              }
              case "file": {
                if (part.data instanceof URL) {
                  return {
                    type: "file",
                    data: part.data.href,
                    mimeType: part.mimeType,
                  };
                }
                throw new Error("Only files with URL data are supported");
              }

              default: {
                const unhandledType: never = type;
                throw new Error(`Unknown content part type: ${unhandledType}`);
              }
            }
          }),
        });
        break;
      }
      case "assistant": {
        const newContent = lmMessage.content
          .map((part) => {
            if (part.type === "tool-call") {
              return {
                type: "tool-call",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                argsText: JSON.stringify(part.args),
                args: part.args as any,
              } satisfies ToolCallContentPart;
            }
            // TODO handle these
            if (
              part.type === "redacted-reasoning" ||
              part.type === "file" ||
              part.type === "reasoning"
            ) {
              return null;
            }
            return part;
          })
          .filter((p) => !!p);

        if (mergeSteps) {
          const previousMessage = messages[messages.length - 1];
          if (previousMessage?.role === "assistant") {
            previousMessage.content = [
              ...previousMessage.content,
              ...newContent,
            ];
            break;
          }
        }

        messages.push({
          role: "assistant",
          content: newContent,
        });
        break;
      }
      case "tool": {
        const previousMessage = messages[messages.length - 1];
        if (previousMessage?.role !== "assistant")
          throw new Error(
            "A tool message must be preceded by an assistant message.",
          );

        for (const tool of lmMessage.content) {
          const toolCall = previousMessage.content.find(
            (c): c is ToolCallContentPart =>
              c.type === "tool-call" && c.toolCallId === tool.toolCallId,
          );
          if (!toolCall)
            throw new Error("Received tool result for an unknown tool call.");
          if (toolCall.toolName !== tool.toolName)
            throw new Error("Tool call name mismatch.");

          type Writable<T> = { -readonly [P in keyof T]: T[P] };
          const writable = toolCall as Writable<ToolCallContentPart>;
          writable.result = tool.result;
          if (tool.isError) {
            writable.isError = true;
          }
        }

        break;
      }

      default: {
        const unhandledRole: never = role;
        throw new Error(`Unknown message role: ${unhandledRole}`);
      }
    }
  }

  return messages;
};
