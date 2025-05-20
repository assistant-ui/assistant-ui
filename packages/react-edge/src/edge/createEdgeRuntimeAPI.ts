import {
  LanguageModelV1,
  LanguageModelV1ToolChoice,
  LanguageModelV1FunctionTool,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
} from "@ai-sdk/provider";
import { EdgeRuntimeRequestOptionsSchema } from "./EdgeRuntimeRequestOptions";
import { toLanguageModelMessages } from "../converters/toLanguageModelMessages";
import { toLanguageModelTools } from "../converters/toLanguageModelTools";
import { z } from "zod";
import {
  AssistantMessage,
  AssistantMessageAccumulator,
  AssistantStreamChunk,
  DataStreamEncoder,
  unstable_toolResultStream,
} from "assistant-stream";
import { LanguageModelV1StreamDecoder } from "assistant-stream/ai-sdk";
import { ThreadMessage, Tool } from "@assistant-ui/react";
import { CoreMessage } from "./CoreTypes";
import {
  LanguageModelConfigSchema,
  LanguageModelV1CallSettingsSchema,
} from "./schemas";

export type LanguageModelV1CallSettings = z.infer<
  typeof LanguageModelV1CallSettingsSchema
>;
export type LanguageModelConfig = z.infer<typeof LanguageModelConfigSchema>;

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
  messages: readonly (CoreMessage | ThreadMessage)[];
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
  requestData: z.infer<typeof EdgeRuntimeRequestOptionsSchema>;
  options: CreateEdgeRuntimeAPIOptions;
};

export const getEdgeRuntimeStream = async ({
  abortSignal,
  requestData: unsafeRequest,
  options: {
    model: modelOrCreator,
    system: serverSystem,
    tools: serverTools = {},
    toolChoice,
    onFinish,
    ...unsafeSettings
  },
}: GetEdgeRuntimeStreamOptions) => {
  const settings = LanguageModelV1CallSettingsSchema.parse(unsafeSettings);
  const lmServerTools = toLanguageModelTools(serverTools);
  const hasServerTools = Object.values(serverTools).some((v) => !!v.execute);

  const {
    system: clientSystem,
    tools: clientTools = [],
    messages,
    apiKey,
    baseUrl,
    modelName,
    ...callSettings
  } = EdgeRuntimeRequestOptionsSchema.parse(unsafeRequest);

  const systemMessages = [];
  if (serverSystem) systemMessages.push(serverSystem);
  if (clientSystem) systemMessages.push(clientSystem);
  const system = systemMessages.join("\n\n");

  for (const clientTool of clientTools) {
    if (serverTools?.[clientTool.name]) {
      throw new Error(
        `Tool ${clientTool.name} was defined in both the client and server tools. This is not allowed.`,
      );
    }
  }

  const model =
    typeof modelOrCreator === "function"
      ? await modelOrCreator({ apiKey, baseUrl, modelName })
      : modelOrCreator;

  let stream: ReadableStream<AssistantStreamChunk>;
  const streamResult = await streamMessage({
    ...(settings as Partial<StreamMessageOptions>),
    ...callSettings,

    model,
    abortSignal,

    ...(!!system ? { system } : undefined),
    messages,
    tools: lmServerTools.concat(clientTools as LanguageModelV1FunctionTool[]),
    ...(toolChoice ? { toolChoice } : undefined),
  });
  stream = streamResult.stream.pipeThrough(new LanguageModelV1StreamDecoder());

  // add tool results if we have server tools
  const canExecuteTools = hasServerTools && toolChoice?.type !== "none";
  if (canExecuteTools) {
    stream = stream.pipeThrough(
      unstable_toolResultStream(serverTools, abortSignal),
    );
  }

  if (canExecuteTools || onFinish) {
    // tee the stream to process server tools and onFinish asap
    const tees = stream.tee();
    stream = tees[0];
    const serverStream = tees[1];

    if (onFinish) {
      let lastChunk: AssistantMessage | undefined;
      serverStream.pipeThrough(new AssistantMessageAccumulator()).pipeTo(
        new WritableStream({
          write(chunk) {
            lastChunk = chunk;
          },
          close() {
            if (!lastChunk?.status || lastChunk.status.type === "running")
              return;

            const resultingMessages = [
              ...messages,
              {
                id: "DEFAULT",
                createdAt: new Date(),
                role: "assistant",
                content: lastChunk.content,
                status: lastChunk.status,
                metadata: lastChunk.metadata,
              } satisfies ThreadMessage,
            ];
            onFinish({
              messages: resultingMessages,
              metadata: {
                steps: lastChunk.metadata.steps,
              },
            });
          },
          abort(e) {
            console.error("Server stream processing error:", e);
          },
        }),
      );
    }
  }

  return stream;
};

export declare namespace getEdgeRuntimeResponse {
  export type { GetEdgeRuntimeStreamOptions as Options };
}

export const getEdgeRuntimeResponse = async (
  options: getEdgeRuntimeResponse.Options,
) => {
  const stream = await getEdgeRuntimeStream(options);
  return new Response(stream.pipeThrough(new DataStreamEncoder()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
};

export const createEdgeRuntimeAPI = (options: CreateEdgeRuntimeAPIOptions) => ({
  POST: async (request: Request) =>
    getEdgeRuntimeResponse({
      abortSignal: request.signal,
      requestData: await request.json(),
      options,
    }),
});

type StreamMessageOptions = LanguageModelV1CallSettings & {
  model: LanguageModelV1;
  system?: string;
  messages: readonly CoreMessage[];
  tools?: LanguageModelV1FunctionTool[];
  toolChoice?: LanguageModelV1ToolChoice;
  abortSignal: AbortSignal;
};

async function streamMessage({
  model,
  system,
  messages,
  tools,
  toolChoice,
  ...options
}: StreamMessageOptions) {
  return model.doStream({
    inputFormat: "messages",
    mode: {
      type: "regular",
      ...(tools ? { tools } : undefined),
      ...(toolChoice ? { toolChoice } : undefined),
    },
    prompt: convertToLanguageModelPrompt(system, messages),
    ...(options as Partial<LanguageModelV1CallOptions>),
  });
}

export function convertToLanguageModelPrompt(
  system: string | undefined,
  messages: readonly CoreMessage[],
): LanguageModelV1Prompt {
  const languageModelMessages: LanguageModelV1Prompt = [];

  if (system != null) {
    languageModelMessages.push({ role: "system", content: system });
  }
  languageModelMessages.push(...toLanguageModelMessages(messages));

  return languageModelMessages;
}
