import {
  LanguageModelV1,
  LanguageModelV1ToolChoice,
  LanguageModelV1FunctionTool,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1LogProbs,
} from "@ai-sdk/provider";
import { CoreAssistantMessage, CoreMessage } from "../../types/AssistantTypes";
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

type FinishResult = {
  finishReason: LanguageModelV1FinishReason;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  logProbs?: LanguageModelV1LogProbs | undefined;
  messages: CoreMessage[];
  rawCall: {
    rawPrompt: unknown;
    rawSettings: Record<string, unknown>;
  };
  warnings?: LanguageModelV1CallWarning[] | undefined;
  rawResponse?:
    | {
        headers?: Record<string, string>;
      }
    | undefined;
};

type LanguageModelCreator = (
  config: LanguageModelConfig,
) => Promise<LanguageModelV1> | LanguageModelV1;

type CreateEdgeRuntimeAPIOptions = LanguageModelV1CallSettings & {
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

export const createEdgeRuntimeAPI = ({
  model: modelOrCreator,
  system: serverSystem,
  tools: serverTools = {},
  toolChoice,
  onFinish,
  ...unsafeSettings
}: CreateEdgeRuntimeAPIOptions) => {
  const settings = LanguageModelV1CallSettingsSchema.parse(unsafeSettings);
  const lmServerTools = toLanguageModelTools(serverTools);
  const hasServerTools = Object.values(serverTools).some((v) => !!v.execute);

  const POST = async (request: Request) => {
    const {
      system: clientSystem,
      tools: clientTools,
      messages,
      apiKey,
      baseUrl,
      modelName,
      ...callSettings
    } = EdgeRuntimeRequestOptionsSchema.parse(await request.json());

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
      abortSignal: request.signal,

      ...(!!system ? { system } : undefined),
      messages,
      tools: lmServerTools.concat(clientTools as LanguageModelV1FunctionTool[]),
      ...(toolChoice ? { toolChoice } : undefined),
    });
    stream = streamResult.stream;

    // add tool results if we have server tools
    const canExecuteTools = hasServerTools && toolChoice?.type !== "none";
    if (canExecuteTools) {
      stream = stream.pipeThrough(toolResultStream(serverTools));
    }

    if (canExecuteTools || onFinish) {
      // tee the stream to process server tools and onFinish asap
      const tees = stream.tee();
      stream = tees[0];
      let serverStream = tees[1];

      if (onFinish) {
        serverStream = serverStream
          .pipeThrough(runResultStream([]))
          .pipeThrough(
            new TransformStream({
              transform(chunk) {
                if (chunk.status?.type !== "done") return;
                const resultingMessages = [
                  ...messages,
                  {
                    role: "assistant",
                    content: chunk.content,
                  } as CoreAssistantMessage,
                ];
                onFinish({
                  finishReason: chunk.status.finishReason!,
                  usage: chunk.status.usage!,
                  messages: resultingMessages,
                  logProbs: chunk.status.logprops,
                  warnings: streamResult.warnings,
                  rawCall: streamResult.rawCall,
                  rawResponse: streamResult.rawResponse,
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

    return new Response(
      stream
        .pipeThrough(assistantEncoderStream())
        .pipeThrough(new TextEncoderStream()),
      {
        headers: {
          contentType: "text/plain; charset=utf-8",
        },
      },
    );
  };
  return { POST };
};

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
