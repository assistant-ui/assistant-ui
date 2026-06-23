import {
  convertToModelMessages,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamOptions,
} from "ai";
import type { ToolJSONSchema } from "assistant-stream";
import type { Toolkit } from "@assistant-ui/core/react";
import { AISDKToolkit } from "./generativeTools";

type Awaitable<T> = T | Promise<T>;
type StreamTextOptions = Parameters<typeof streamText>[0];
type StreamTextResult = ReturnType<typeof streamText>;

export type AISDKRouteCallSettings = {
  maxTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;
  maxRetries?: number;
  timeout?: StreamTextOptions["timeout"];
  headers?: Record<string, string | undefined>;
};

export type AISDKRouteBody<
  UI_MESSAGE extends UIMessage = UIMessage,
  TConfig = unknown,
> = {
  id?: string;
  messages: UI_MESSAGE[];
  system?: string;
  tools?: Record<string, ToolJSONSchema>;
  callSettings?: AISDKRouteCallSettings;
  config?: TConfig;
  trigger?: string;
  messageId?: string;
  metadata?: unknown;
  [key: string]: unknown;
};

type AISDKRouteResponseInit = ResponseInit & {
  consumeSseStream?: (options: {
    stream: ReadableStream<string>;
  }) => PromiseLike<void> | void;
};

export type AISDKRouteResponseOptions<UI_MESSAGE extends UIMessage> =
  AISDKRouteResponseInit & UIMessageStreamOptions<UI_MESSAGE>;

type RouteValue<TValue, TArgs> = TValue | ((args: TArgs) => Awaitable<TValue>);

type BaseRouteArgs<TBody, TContext> = {
  req: Request;
  body: TBody;
  ctx: TContext;
  aiToolkit: AISDKToolkit;
};

type PreparedRouteArgs<TBody, TContext> = BaseRouteArgs<TBody, TContext> & {
  model: LanguageModel;
  tools: ToolSet;
  messages: ModelMessage[];
  system: StreamTextOptions["system"] | undefined;
};

type ResultRouteArgs<
  TBody,
  TContext,
  UI_MESSAGE extends UIMessage,
> = PreparedRouteArgs<TBody, TContext> & {
  result: StreamTextResult;
  streamTextOptions: StreamTextOptions;
  responseOptions: AISDKRouteResponseOptions<UI_MESSAGE> | undefined;
};

type AISDKRouteBodyMessage<TBody> =
  TBody extends AISDKRouteBody<infer UI_MESSAGE, unknown>
    ? UI_MESSAGE
    : UIMessage;

export type CreateAISDKRouteOptions<
  TBody extends AISDKRouteBody = AISDKRouteBody,
  TContext = undefined,
  UI_MESSAGE extends UIMessage = AISDKRouteBodyMessage<TBody>,
> = {
  toolkit: Toolkit;
  model: RouteValue<LanguageModel, BaseRouteArgs<TBody, TContext>>;
  parseBody?: (req: Request) => Awaitable<TBody>;
  context?: (args: { req: Request; body: TBody }) => Awaitable<TContext>;
  system?: RouteValue<
    StreamTextOptions["system"] | undefined,
    BaseRouteArgs<TBody, TContext>
  >;
  messages?: (
    args: BaseRouteArgs<TBody, TContext> & {
      tools: ToolSet;
    },
  ) => Awaitable<ModelMessage[]>;
  tools?: (
    args: BaseRouteArgs<TBody, TContext> & {
      defaultTools: ToolSet;
    },
  ) => Awaitable<ToolSet>;
  streamText?: RouteValue<
    Partial<StreamTextOptions>,
    PreparedRouteArgs<TBody, TContext>
  >;
  prepareStreamText?: (
    args: PreparedRouteArgs<TBody, TContext> & {
      defaults: StreamTextOptions;
    },
  ) => Awaitable<StreamTextOptions>;
  response?: RouteValue<
    AISDKRouteResponseOptions<UI_MESSAGE> | undefined,
    PreparedRouteArgs<TBody, TContext> & {
      result: StreamTextResult;
      streamTextOptions: StreamTextOptions;
    }
  >;
  toResponse?: (
    args: ResultRouteArgs<TBody, TContext, UI_MESSAGE>,
  ) => Awaitable<Response>;
  onError?: (args: {
    error: unknown;
    req: Request;
    body?: TBody;
    ctx?: TContext;
  }) => Awaitable<Response | void>;
};

export type CreateAISDKRouteResult = {
  POST: (req: Request) => Promise<Response>;
  aiToolkit: AISDKToolkit;
};

export function createAISDKRoute<
  TBody extends AISDKRouteBody = AISDKRouteBody,
  TContext = undefined,
  UI_MESSAGE extends UIMessage = AISDKRouteBodyMessage<TBody>,
>(
  options: CreateAISDKRouteOptions<TBody, TContext, UI_MESSAGE>,
): CreateAISDKRouteResult {
  const aiToolkit = new AISDKToolkit({ toolkit: options.toolkit });

  return {
    aiToolkit,
    POST: async (req) => {
      let body: TBody | undefined;
      let ctx: TContext | undefined;

      try {
        body = options.parseBody
          ? await options.parseBody(req)
          : ((await req.json()) as TBody);
        ctx = options.context
          ? await options.context({ req, body })
          : (undefined as TContext);

        const baseArgs: BaseRouteArgs<TBody, TContext> = {
          req,
          body,
          ctx,
          aiToolkit,
        };

        const defaultTools = await aiToolkit.tools(
          body.tools ? { frontend: body.tools } : {},
        );
        const tools = options.tools
          ? await options.tools({ ...baseArgs, defaultTools })
          : defaultTools;
        const model = await resolveRouteValue(options.model, baseArgs);
        const system = options.system
          ? await resolveRouteValue(options.system, baseArgs)
          : body.system;
        const messages = options.messages
          ? await options.messages({ ...baseArgs, tools })
          : await convertToModelMessages(body.messages, { tools });

        const preparedArgs: PreparedRouteArgs<TBody, TContext> = {
          ...baseArgs,
          model,
          tools,
          messages,
          system,
        };
        const streamTextOverrides = options.streamText
          ? await resolveRouteValue(options.streamText, preparedArgs)
          : undefined;
        const defaults = {
          ...normalizeCallSettings(body.callSettings),
          model,
          messages,
          ...(system !== undefined && { system }),
          tools,
          ...streamTextOverrides,
        } as StreamTextOptions;
        const streamTextOptions = options.prepareStreamText
          ? await options.prepareStreamText({ ...preparedArgs, defaults })
          : defaults;
        const result = streamText(streamTextOptions);
        const responseOptions = options.response
          ? await resolveRouteValue(options.response, {
              ...preparedArgs,
              result,
              streamTextOptions,
            })
          : undefined;

        if (options.toResponse) {
          return await options.toResponse({
            ...preparedArgs,
            result,
            streamTextOptions,
            responseOptions,
          });
        }

        return result.toUIMessageStreamResponse(responseOptions);
      } catch (error) {
        if (error instanceof Response) return error;

        const handled = await options.onError?.({
          error,
          req,
          ...(body !== undefined && { body }),
          ...(ctx !== undefined && { ctx }),
        });
        if (handled) return handled;

        throw error;
      }
    },
  };
}

const resolveRouteValue = async <TValue, TArgs>(
  value: RouteValue<TValue, TArgs>,
  args: TArgs,
): Promise<TValue> => {
  if (typeof value === "function") {
    return await (value as (args: TArgs) => Awaitable<TValue>)(args);
  }
  return value;
};

const normalizeCallSettings = (
  callSettings: AISDKRouteCallSettings | undefined,
): Partial<StreamTextOptions> => {
  if (!callSettings) return {};

  const { maxTokens, maxOutputTokens, ...rest } = callSettings;
  const normalizedMaxOutputTokens = maxOutputTokens ?? maxTokens;
  const settings: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) settings[key] = value;
  }
  if (normalizedMaxOutputTokens !== undefined) {
    settings["maxOutputTokens"] = normalizedMaxOutputTokens;
  }

  return settings as Partial<StreamTextOptions>;
};
