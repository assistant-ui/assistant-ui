import {
  LanguageModelV1,
  LanguageModelV1ToolChoice,
  LanguageModelV1FunctionTool,
  LanguageModelV1Message,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
  LanguageModelV1TextPart,
  LanguageModelV1CallWarning,
  LanguageModelV1ToolCallPart,
  LanguageModelV1ToolResultPart,
} from "@ai-sdk/provider";
import { CoreThreadMessage } from "../../types/AssistantTypes";
import { assistantStream } from "../streams/assistantStream";
import { assistantEncoderStream } from "../streams/assistantEncoderStream";

export const createEdgeRuntimeAPI = ({ model }: { model: LanguageModelV1 }) => {
  const POST = async (request: Request) => {
    const { system, messages, tools } = await request.json();

    const { stream } = await streamMessage({
      model,
      abortSignal: request.signal,

      system,
      messages,
      tools,
    });

    return new Response(stream, {
      headers: {
        contentType: "text/plain; charset=utf-8",
      },
    });
  };
  return { POST };
};

type StreamMessageResult = {
  stream: ReadableStream<Uint8Array>;
  warnings: LanguageModelV1CallWarning[] | undefined;
  rawResponse: unknown;
};

async function streamMessage({
  model,
  system,
  messages,
  tools,
  toolChoice,
  ...options
}: Omit<LanguageModelV1CallOptions, "inputFormat" | "mode" | "prompt"> & {
  model: LanguageModelV1;
  system?: string;
  messages: CoreThreadMessage[];
  tools?: LanguageModelV1FunctionTool[];
  toolChoice?: LanguageModelV1ToolChoice;
}): Promise<StreamMessageResult> {
  // TODO retry support
  const { stream, warnings, rawResponse } = await model.doStream({
    inputFormat: "messages",
    mode: {
      type: "regular",
      ...(tools ? { tools } : undefined),
      ...(toolChoice ? { toolChoice } : undefined),
    },
    prompt: convertToLanguageModelPrompt(system, messages),
    ...options,
  });

  return {
    stream: stream
      .pipeThrough(assistantStream())
      .pipeThrough(assistantEncoderStream())
      .pipeThrough(new TextEncoderStream()),
    warnings,
    rawResponse,
  };
}

export function convertToLanguageModelPrompt(
  system: string | undefined,
  messages: CoreThreadMessage[],
): LanguageModelV1Prompt {
  const languageModelMessages: LanguageModelV1Prompt = [];

  if (system != null) {
    languageModelMessages.push({ role: "system", content: system });
  }
  languageModelMessages.push(
    ...messages.flatMap(convertToLanguageModelMessage),
  );

  return languageModelMessages;
}

export function convertToLanguageModelMessage(
  message: CoreThreadMessage,
): LanguageModelV1Message[] {
  const role = message.role;
  switch (role) {
    case "system": {
      return [{ role: "system", content: message.content[0].text }];
    }

    case "user": {
      const msg: LanguageModelV1Message = {
        role: "user",
        content:
          // TODO testing
          typeof message.content === "string"
            ? [
                {
                  type: "text",
                  text: message.content,
                },
              ]
            : message.content.map((part): LanguageModelV1TextPart => {
                switch (part.type) {
                  case "text": {
                    return part;
                  }

                  // TODO support image parts
                  default: {
                    throw new Error(
                      `Unspported content part type: ${part.type}`,
                    );
                  }
                }
              }),
      };
      return [msg];
    }

    case "assistant": {
      const stash: LanguageModelV1Message[] = [];
      let assistantMessage = {
        role: "assistant" as const,
        content: [] as (
          | LanguageModelV1TextPart
          | LanguageModelV1ToolCallPart
        )[],
      };
      let toolMessage = {
        role: "tool" as const,
        content: [] as LanguageModelV1ToolResultPart[],
      };

      for (const part of message.content) {
        const type = part.type;
        switch (type) {
          case "text": {
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
            break;
          }
          case "tool-call": {
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
            break;
          }
          default: {
            const _exhaustiveCheck: never = type;
            throw new Error(`Unhandled content part type: ${_exhaustiveCheck}`);
          }
        }
      }
      if (toolMessage.content.length > 0) {
        return [...stash, assistantMessage, toolMessage];
      }

      return [...stash, assistantMessage];
    }

    default: {
      const _exhaustiveCheck: never = role;
      throw new Error(`Invalid message role: ${_exhaustiveCheck}`);
    }
  }
}
