import { z } from "zod";
import type { JSONSchema7 } from "json-schema";
import { Unsubscribe } from "../types/Unsubscribe";
import { TypePath, TypeAtPath, DeepPartial } from "./type-path-utils";

export const LanguageModelV1CallSettingsSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  seed: z.number().int().optional(),
  headers: z.record(z.string().optional()).optional(),
});

export type LanguageModelV1CallSettings = z.infer<
  typeof LanguageModelV1CallSettingsSchema
>;

export const LanguageModelConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  modelName: z.string().optional(),
});

export type LanguageModelConfig = z.infer<typeof LanguageModelConfigSchema>;

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
};

type ReadableStreamIterator<T> = ReadableStream<T> &
  AsyncGenerator<T, void, unknown>;

interface ToolCallReader<TArgs> {
  get<PathT extends TypePath<TArgs>>(
    ...fieldPath: PathT
  ): Promise<TypeAtPath<TArgs, PathT>>;

  stream<PathT extends TypePath<TArgs>>(
    ...fieldPath: PathT
  ): ReadableStreamIterator<DeepPartial<TypeAtPath<TArgs, PathT>>>;

  forEach<PathT extends TypePath<TArgs>>(
    ...fieldPath: PathT
  ): TypeAtPath<TArgs, PathT> extends Array<infer U>
    ? ReadableStreamIterator<U>
    : never;
}

export type ToolExecuteFunction<TArgs, TResult> = (
  args: TArgs,
  context: ToolExecutionContext,
) => TResult | Promise<TResult>;

export type ToolStreamCallFunction<TArgs, TResult> = (
  controller: ToolCallReader<TArgs>,
  context: ToolExecutionContext,
) => TResult | Promise<TResult>;

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<
  unknown,
  TResult
>;

export type Tool<TArgs = unknown, TResult = unknown> = {
  description?: string | undefined;
  parameters: z.ZodSchema<TArgs> | JSONSchema7;
  execute?: ToolExecuteFunction<TArgs, TResult>;
  /**
   * @deprecated TODO not yet implemented
   */
  experimental_streamCall?: ToolStreamCallFunction<TArgs, TResult>;
  experimental_onSchemaValidationError?: OnSchemaValidationErrorFunction<TResult>;
};

export type ModelContext = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
};

export type ModelContextProvider = {
  getModelContext: () => ModelContext;
  subscribe?: (callback: () => void) => Unsubscribe;
};

export const mergeModelContexts = (
  configSet: Set<ModelContextProvider>,
): ModelContext => {
  const configs = Array.from(configSet)
    .map((c) => c.getModelContext())
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return configs.reduce((acc, config) => {
    if (config.system) {
      if (acc.system) {
        // TODO should the separator be configurable?
        acc.system += `\n\n${config.system}`;
      } else {
        acc.system = config.system;
      }
    }
    if (config.tools) {
      for (const [name, tool] of Object.entries(config.tools)) {
        const existing = acc.tools?.[name];
        if (existing && existing !== tool) {
          throw new Error(
            `You tried to define a tool with the name ${name}, but it already exists.`,
          );
        }

        if (!acc.tools) acc.tools = {};
        acc.tools[name] = tool;
      }
    }
    if (config.config) {
      acc.config = {
        ...acc.config,
        ...config.config,
      };
    }
    if (config.callSettings) {
      acc.callSettings = {
        ...acc.callSettings,
        ...config.callSettings,
      };
    }
    return acc;
  }, {} as ModelContext);
};
