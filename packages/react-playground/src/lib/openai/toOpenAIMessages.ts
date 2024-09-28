import { LanguageModelV1Prompt } from "@ai-sdk/provider";
import OpenAI from "openai";

export function toOpenAIChatMessages(
  prompt: LanguageModelV1Prompt,
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        messages.push({ role: "system", content });
        break;
      }

      case "user": {
        if (content.length === 1 && content[0]!.type === "text") {
          messages.push({ role: "user", content: content[0]!.text });
          break;
        }

        messages.push({
          role: "user",
          content: content.map((part) => {
            const type = part.type;
            switch (type) {
              case "text": {
                return { type: "text", text: part.text };
              }
              case "image": {
                if (!(part.image instanceof URL))
                  throw new Error("Image must be a URL");

                return {
                  type: "image_url",
                  image_url: {
                    url: part.image.href,
                  },
                };
              }
              case "file": {
                throw new Error("File content parts are not supported");
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
        let text: string | undefined;
        const toolCalls: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }> = [];

        for (const part of content) {
          switch (part.type) {
            case "text": {
              if (text)
                throw new Error(
                  "Multiple text parts in assistant messages are not supported",
                );

              text = part.text;
              break;
            }
            case "tool-call": {
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args),
                },
              });
              break;
            }
            default: {
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
            }
          }
        }

        const hasTools = toolCalls.length > 0;
        messages.push({
          role: "assistant",
          ...(text ? { content: text } : undefined),
          ...(hasTools ? { tool_calls: toolCalls } : undefined),
        });

        break;
      }

      case "tool": {
        for (const toolResponse of content) {
          messages.push({
            role: "tool",
            tool_call_id: toolResponse.toolCallId,
            content:
              typeof toolResponse.result === "string"
                ? toolResponse.result
                : JSON.stringify(toolResponse.result),
          });
        }
        break;
      }

      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }

  return messages;
}
