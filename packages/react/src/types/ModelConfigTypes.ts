import type { z } from "zod";
import type { JSONSchema7 } from "json-schema";

type ToolExecuteFunction<TArgs, TResult> = (
  args: TArgs,
) => TResult | Promise<TResult>;

export type Tool<TArgs = unknown, TResult = unknown> = {
  description?: string | undefined;
  parameters: z.ZodSchema<TArgs> | JSONSchema7;
  execute: ToolExecuteFunction<TArgs, TResult>;
};

export type ModelConfig = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
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
    return acc;
  }, {} as ModelConfig);
};
