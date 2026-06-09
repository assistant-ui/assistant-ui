import type { Unsubscribe } from "../types/unsubscribe";
import type { Tool } from "assistant-stream";

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
  reasoningEffort?: string;
};

export type ModelContext = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
  /**
   * Persisted message metadata pulled at send time and merged into the outgoing
   * user message's `metadata.custom` (not forwarded to the model directly).
   * Ignored by the transport, which only reads system/tools/callSettings/config.
   */
  unstable_composerMetadata?: Record<string, unknown> | undefined;
};

export type ModelContextProvider = {
  getModelContext: () => ModelContext;
  subscribe?: (callback: () => void) => Unsubscribe;
};

export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: unknown;
};

export type AssistantInstructionsConfig = {
  disabled?: boolean | undefined;
  instruction: string;
};

export type AssistantContextConfig = {
  getContext: () => string;
  disabled?: boolean | undefined;
};

export const mergeModelContexts = (
  configSet: Set<ModelContextProvider>,
): ModelContext => {
  const configs = Array.from(configSet)
    .map((c) => c.getModelContext())
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const toolPriorities: Record<string, number> = {};

  return configs.reduce((acc, config) => {
    const priority = config.priority ?? 0;
    if (config.system) {
      if (acc.system) {
        acc.system += `\n\n${config.system}`;
      } else {
        acc.system = config.system;
      }
    }
    if (config.tools) {
      for (const [name, tool] of Object.entries(config.tools)) {
        const existing = acc.tools?.[name];
        if (existing && existing !== tool) {
          const existingPriority = toolPriorities[name]!;
          if (existingPriority === priority) {
            throw new Error(
              `You tried to define a tool with the name ${name}, but it already exists.`,
            );
          }

          const higherPriorityTool =
            existingPriority > priority ? existing : tool;
          const lowerPriorityTool =
            existingPriority > priority ? tool : existing;
          acc.tools![name] = {
            ...lowerPriorityTool,
            ...higherPriorityTool,
          } as Tool<any, any>;
          toolPriorities[name] = Math.max(existingPriority, priority);
          continue;
        }

        if (!acc.tools) acc.tools = {};
        acc.tools[name] = tool;
        toolPriorities[name] ??= priority;
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
    if (config.unstable_composerMetadata) {
      acc.unstable_composerMetadata = {
        ...acc.unstable_composerMetadata,
        ...config.unstable_composerMetadata,
      };
    }
    return acc;
  }, {} as ModelContext);
};
