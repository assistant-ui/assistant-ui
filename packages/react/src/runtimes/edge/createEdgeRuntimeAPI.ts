import {
  LanguageModelV1,
  LanguageModelV1ToolChoice,
  LanguageModelV1FunctionTool,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
} from "@ai-sdk/provider";
import { CoreMessage } from "../../types/AssistantTypes";
import { assistantEncoderStream } from "./streams/assistantEncoderStream";
import { EdgeRuntimeRequestOptions } from "./EdgeRuntimeRequestOptions";
import { toLanguageModelMessages } from "./converters/toLanguageModelMessages";

export const createEdgeRuntimeAPI = ({ model }: { model: LanguageModelV1 }) => {
  const POST = async (request: Request) => {
    const { system, messages, tools } =
      (await request.json()) as EdgeRuntimeRequestOptions;

    const { stream } = await streamMessage({
      model,
      abortSignal: request.signal,

      ...(system ? { system } : undefined),
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
  messages: CoreMessage[];
  tools?: LanguageModelV1FunctionTool[];
  toolChoice?: LanguageModelV1ToolChoice;
}): Promise<StreamMessageResult> {
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
      .pipeThrough(assistantEncoderStream())
      .pipeThrough(new TextEncoderStream()),
    warnings,
    rawResponse,
  };
}

export function convertToLanguageModelPrompt(
  system: string | undefined,
  messages: CoreMessage[],
): LanguageModelV1Prompt {
  const languageModelMessages: LanguageModelV1Prompt = [];

  if (system != null) {
    languageModelMessages.push({ role: "system", content: system });
  }
  languageModelMessages.push(...toLanguageModelMessages(messages));

  return languageModelMessages;
}
