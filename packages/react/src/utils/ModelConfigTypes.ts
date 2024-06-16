"use client";
import type { z } from "zod";

export type Tool<TArgs> = {
  description: string;
  parameters: z.ZodSchema<TArgs>;
  execute: (args: TArgs) => unknown; // TODO return type
};

export type ModelConfig = {
  system?: string;
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  tools?: Record<string, Tool<any>>;
};

export type ModelConfigProvider = () => ModelConfig;

export const mergeModelConfigs = (configs: ModelConfig[]): ModelConfig => {
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
      acc.tools = { ...acc.tools, ...config.tools };
    }
    return acc;
  }, {} as ModelConfig);
};
