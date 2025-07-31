import {
  LanguageModelV1,
  LanguageModelV1ToolChoice,
  LanguageModelV1FunctionTool,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
} from "@ai-sdk/provider";
import { toLanguageModelMessages } from "../converters/toLanguageModelMessages";
import { toLanguageModelTools } from "../converters/toLanguageModelTools";
import { AssistantStreamChunk } from "assistant-stream";
import { LanguageModelV1StreamDecoder } from "assistant-stream/ai-sdk";
import { ThreadMessage, Tool } from "@assistant-ui/react";

export type LanguageModelV1CallSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  headers?: Record<string, string>;
};

export type LanguageModelConfig = {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
};

export type EdgeRuntimeRequestOptions = {
  system?: string | undefined;
  messages: readonly ThreadMessage[];
  runConfig?: {
    custom?: Record<string, unknown>;
  };
  tools?: any[];
  unstable_assistantMessageId?: string;
  state?: unknown;
} & LanguageModelV1CallSettings &
  LanguageModelConfig;

type LanguageModelCreator = (
  config: LanguageModelConfig,
) => Promise<LanguageModelV1> | LanguageModelV1;

type ThreadStep = {
  readonly messageId?: string;
  readonly usage?:
    | {
        readonly promptTokens: number;
        readonly completionTokens: number;
      }
    | undefined;
};

type FinishResult = {
  messages: readonly ThreadMessage[];
  metadata: {
    steps: readonly ThreadStep[];
  };
};

export type CreateEdgeRuntimeAPIOptions = LanguageModelV1CallSettings & {
  model: LanguageModelV1 | LanguageModelCreator;
  system?: string;
  tools?: Record<string, Tool<any, any>>;
  toolChoice?: LanguageModelV1ToolChoice;
  onFinish?: (result: FinishResult) => void;
};

type GetEdgeRuntimeStreamOptions = {
  abortSignal: AbortSignal;
  requestData: EdgeRuntimeRequestOptions;
  options: CreateEdgeRuntimeAPIOptions;
};

export const getEdgeRuntimeStream = async ({
  abortSignal,
  requestData: request,
  options: {
    model: modelOrCreator,
    system: serverSystem,
    tools: serverTools = {},
    toolChoice,
    onFinish,
    ...unsafeSettings
  },
}: GetEdgeRuntimeStreamOptions): Promise<
  ReadableStream<AssistantStreamChunk>
> => {
  const model =
    typeof modelOrCreator === "function"
      ? await modelOrCreator(request)
      : modelOrCreator;

  const messages: LanguageModelV1Prompt = toLanguageModelMessages(
    request.messages,
  );

  if (serverSystem || request.system) {
    messages.unshift({
      role: "system",
      content: serverSystem || request.system!,
    });
  }

  const allTools = serverTools || {};
  const tools: LanguageModelV1FunctionTool[] = toLanguageModelTools(allTools);
  const callOptions: LanguageModelV1CallOptions = {
    inputFormat: "messages",
    mode:
      tools.length > 0
        ? {
            type: "regular",
            tools,
            ...(toolChoice && { toolChoice }),
          }
        : { type: "regular" },
    prompt: messages,
    ...(request.maxTokens !== undefined && { maxTokens: request.maxTokens }),
    ...(request.temperature !== undefined && {
      temperature: request.temperature,
    }),
    ...(request.topP !== undefined && { topP: request.topP }),
    ...(request.presencePenalty !== undefined && {
      presencePenalty: request.presencePenalty,
    }),
    ...(request.frequencyPenalty !== undefined && {
      frequencyPenalty: request.frequencyPenalty,
    }),
    ...(request.seed !== undefined && { seed: request.seed }),
    ...(request.headers && {
      headers: Object.fromEntries(
        Object.entries(request.headers).filter(([_, v]) => v !== undefined),
      ) as Record<string, string>,
    }),
    abortSignal,
    ...Object.fromEntries(
      Object.entries(unsafeSettings).filter(([_, v]) => v !== undefined),
    ),
  };

  const result = await model.doStream(callOptions);
  return result.stream.pipeThrough(new LanguageModelV1StreamDecoder());
};
