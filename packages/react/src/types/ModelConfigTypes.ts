import { z } from "zod";
import type { JSONSchema7 } from "json-schema";

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

type ToolExecuteFunction<TArgs, TResult> = (
  args: TArgs,
  context: {
    abortSignal: AbortSignal;
  },
) => TResult | Promise<TResult>;

export type Tool<
  TArgs extends Record<string, unknown> = Record<string | number, unknown>,
  TResult = unknown,
> = {
  description?: string | undefined;
  parameters: z.ZodSchema<TArgs> | JSONSchema7;
  execute?: ToolExecuteFunction<TArgs, TResult>;
};

export type ModelConfig = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
};

export type ModelConfigProvider = { getModelConfig: () => ModelConfig };

export const mergeModelConfigs = (
  configSet: Set<ModelConfigProvider>,
): ModelConfig => {
  const configs = Array.from(configSet)
    .map((c) => c.getModelConfig())
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
        if (acc.tools?.[name]) {
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
  }, {} as ModelConfig);
};
