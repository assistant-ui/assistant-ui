import type { Unsubscribe } from "../types/Unsubscribe";

// Tool type will be defined in stream module
// For now, we use a generic type that matches the expected shape
export type Tool<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = {
  type?: "frontend" | "backend" | "human" | undefined;
  description?: string | undefined;
  parameters?: unknown;
  disabled?: boolean;
  execute?: (args: TArgs, context: unknown) => TResult | Promise<TResult>;
  experimental_onSchemaValidationError?: (
    args: unknown,
    context: unknown,
  ) => TResult | Promise<TResult>;
  streamCall?: (reader: unknown, context: unknown) => void;
};

export type LanguageModelV1CallSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  headers?: Record<string, string | undefined>;
};

export type LanguageModelConfig = {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
};

export type ModelContext = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<Record<string, unknown>, unknown>> | undefined;
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
