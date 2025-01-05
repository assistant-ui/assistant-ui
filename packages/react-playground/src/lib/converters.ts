import {
  CoreMessage,
  EdgeRuntimeRequestOptions,
  fromLanguageModelMessages,
  toLanguageModelMessages,
} from "@assistant-ui/react";
import { OpenAI } from "openai";

import { fromOpenAIMessages } from "./openai/fromOpenAIMessages";
import { toOpenAIChatMessages } from "./openai/toOpenAIMessages";
import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";

export const requestOptionsFromOpenAI = (
  params: OpenAI.ChatCompletionCreateParams,
  options?: {
    strict?: boolean | undefined;
  },
): EdgeRuntimeRequestOptions => {
  const messages = threadMessagesFromOpenAI(params.messages, options);
  let tools: LanguageModelV1FunctionTool[] | undefined =
    params.tools?.map(
      (t) =>
        ({
          type: "function",
          name: t.function.name,
          description: t.function.description!,
          parameters: t.function.parameters ?? {},
        }) satisfies LanguageModelV1FunctionTool,
    ) ?? undefined;
  if (tools?.length === 0) tools = undefined;

  return {
    messages,
    tools,
    temperature: params.temperature ?? undefined,
    maxTokens: params.max_tokens ?? undefined,
    topP: params.top_p ?? undefined,
    presencePenalty: params.presence_penalty ?? undefined,
    frequencyPenalty: params.frequency_penalty ?? undefined,
  };
};

export const requestOptionsToOpenAI = ({
  apiKey, // ignore
  baseUrl, // ignore
  modelName,
  messages,
  tools,
  system,
  ...callOptions
}: EdgeRuntimeRequestOptions): OpenAI.ChatCompletionCreateParams => {
  const oaiMessages = threadMessagesToOpenAI(system, messages);
  let oaiTools = tools?.map(
    (t) =>
      ({
        type: t.type,
        function: {
          name: t.name,
          description: t.description!,
          parameters: t.parameters as Record<string, unknown>,
        },
      }) satisfies OpenAI.ChatCompletionTool,
  );
  if (oaiTools?.length === 0) oaiTools = undefined;

  return {
    model: modelName ?? "gpt-4o",
    temperature: callOptions.temperature,
    max_tokens: callOptions.maxTokens,
    top_p: callOptions.topP,
    presence_penalty: callOptions.presencePenalty,
    frequency_penalty: callOptions.frequencyPenalty,
    messages: oaiMessages,
    tools: oaiTools,
  } as OpenAI.ChatCompletionCreateParams;
};

const threadMessagesFromOpenAI = (
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: {
    strict?: boolean | undefined;
  },
) => {
  const lms = fromOpenAIMessages(messages, options);
  return fromLanguageModelMessages(lms, { mergeSteps: false });
};

const threadMessagesToOpenAI = (
  system: string | undefined,
  messages: readonly CoreMessage[],
) => {
  const systemMessage: CoreMessage | undefined = system
    ? { role: "system", content: [{ type: "text", text: system }] }
    : undefined;
  const withSystem: CoreMessage[] = [
    ...(systemMessage ? [systemMessage] : []),
    ...messages,
  ];
  const lms = toLanguageModelMessages(withSystem);
  return toOpenAIChatMessages(lms);
};
