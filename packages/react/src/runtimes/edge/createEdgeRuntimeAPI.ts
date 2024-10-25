import {
  LanguageModelV1,
  LanguageModelV1ToolChoice,
  LanguageModelV1FunctionTool,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
} from "@ai-sdk/provider";
import {
  CoreMessage,
  ThreadMessage,
  ThreadStep,
} from "../../types/AssistantTypes";
import { assistantEncoderStream } from "./streams/assistantEncoderStream";
import { EdgeRuntimeRequestOptionsSchema } from "./EdgeRuntimeRequestOptions";
import { toLanguageModelMessages } from "./converters/toLanguageModelMessages";
import { Tool } from "../../types";
import { toLanguageModelTools } from "./converters/toLanguageModelTools";
import {
  toolResultStream,
  ToolResultStreamPart,
} from "./streams/toolResultStream";
import { runResultStream } from "./streams/runResultStream";
import {
  LanguageModelConfig,
  LanguageModelV1CallSettings,
  LanguageModelV1CallSettingsSchema,
} from "../../types/ModelConfigTypes";
import { ChatModelRunResult } from "../local/ChatModelAdapter";
import { toCoreMessage } from "./converters/toCoreMessages";
import { streamPartEncoderStream } from "./streams/utils/streamPartEncoderStream";
import { z } from "zod";

type FinishResult = {
  messages: CoreMessage[];
  metadata: {
    /**
     * @deprecated Use `steps` instead. This field will be removed in v0.6.
     */
    roundtrips: ThreadStep[];
    steps: ThreadStep[];
  };
};

type LanguageModelCreator = (
  config: LanguageModelConfig,
) => Promise<LanguageModelV1> | LanguageModelV1;

export type CreateEdgeRuntimeAPIOptions = LanguageModelV1CallSettings & {
  model: LanguageModelV1 | LanguageModelCreator;
  system?: string;
  tools?: Record<string, Tool<any, any>>;
  toolChoice?: LanguageModelV1ToolChoice;
  onFinish?: (result: FinishResult) => void;
};

const voidStream = () => {
  return new WritableStream({
    abort(reason) {
      console.error("Server stream processing aborted:", reason);
    },
  });
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

  let stream: ReadableStream<ToolResultStreamPart>;
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
  stream = streamResult.stream;

  // add tool results if we have server tools
  const canExecuteTools = hasServerTools && toolChoice?.type !== "none";
  if (canExecuteTools) {
    stream = stream.pipeThrough(toolResultStream(serverTools, abortSignal));
  }

  if (canExecuteTools || onFinish) {
    // tee the stream to process server tools and onFinish asap
    const tees = stream.tee();
    stream = tees[0];
    let serverStream = tees[1];

    if (onFinish) {
      let lastChunk: ChatModelRunResult;
      serverStream = serverStream.pipeThrough(runResultStream()).pipeThrough(
        new TransformStream({
          transform(chunk) {
            lastChunk = chunk;
          },
          flush() {
            if (!lastChunk?.status || lastChunk.status.type === "running")
              return;

            const resultingMessages = [
              ...messages,
              toCoreMessage({
                role: "assistant",
                content: lastChunk.content,
              } as ThreadMessage),
            ];
            onFinish({
              messages: resultingMessages,
              metadata: {
                // TODO
                // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                roundtrips: lastChunk.metadata?.steps!,
                // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                steps: lastChunk.metadata?.steps!,
              },
            });
          },
        }),
      );
    }

    // drain the server stream
    serverStream.pipeTo(voidStream()).catch((e) => {
      console.error("Server stream processing error:", e);
    });
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
  return new Response(
    stream
      .pipeThrough(assistantEncoderStream())
      .pipeThrough(streamPartEncoderStream()),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
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
  messages: CoreMessage[];
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
  messages: CoreMessage[],
): LanguageModelV1Prompt {
  const languageModelMessages: LanguageModelV1Prompt = [];

  if (system != null) {
    languageModelMessages.push({ role: "system", content: system });
  }
  languageModelMessages.push(...toLanguageModelMessages(messages));

  return languageModelMessages;
}
