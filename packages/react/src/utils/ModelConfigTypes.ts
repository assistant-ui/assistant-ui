"use client";
import type { z } from "zod";

export type Tool<TArgs> = {
  description: string;
  parameters: z.ZodSchema<TArgs>;
  execute: (args: TArgs) => unknown; // TODO return type
};

export type ModelConfig = {
  priority?: number;
  system?: string;
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  tools?: Record<string, Tool<any>>;
};

export type ModelConfigProvider = () => ModelConfig;

export const mergeModelConfigs = (
  configSet: Set<ModelConfigProvider>,
): ModelConfig => {
  const configs = Array.from(configSet)
    .map((c) => c())
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

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
