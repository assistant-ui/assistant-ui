import type { Tool } from "assistant-stream";
import {
  type ModelContext,
  type ModelContextProvider,
  type AssistantToolProps,
  type AssistantInstructionsConfig,
} from "./types";
import { notifySubscribers as notifyStateSubscribers } from "../subscribable/subscribable";
import { CompositeContextProvider } from "../utils/composite-context-provider";
import type { Unsubscribe } from "../types/unsubscribe";
import type {
  ModelContextRegistryToolHandle,
  ModelContextRegistryInstructionHandle,
  ModelContextRegistryProviderHandle,
} from "./registry-handles";
import { nullProtoRecord } from "../utils/record";

export class ModelContextRegistry implements ModelContextProvider {
  private _tools = new Map<symbol, AssistantToolProps<any, any>>();
  private _instructions = new Map<symbol, string>();
  private _contextProviders = new CompositeContextProvider();
  private _subscribers = new Set<() => void>();

  constructor() {
    this._contextProviders.subscribe(() => {
      this.notifySubscribers();
    });
  }

  getModelContext(): ModelContext {
    const instructions = Array.from(this._instructions.values()).filter(
      Boolean,
    );

    const system =
      instructions.length > 0 ? instructions.join("\n\n") : undefined;

    const tools = nullProtoRecord<Tool<any, any>>();
    for (const toolProps of this._tools.values()) {
      const { toolName, render, ...tool } = toolProps;
      tools[toolName] = tool;
    }

    const providerContexts = this._contextProviders.getModelContext();

    const context: ModelContext = {
      system,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
    };

    if (providerContexts.system) {
      context.system = context.system
        ? `${context.system}\n\n${providerContexts.system}`
        : providerContexts.system;
    }

    if (providerContexts.tools) {
      context.tools = nullProtoRecord(context.tools, providerContexts.tools);
    }

    if (providerContexts.callSettings) {
      context.callSettings = providerContexts.callSettings;
    }

    if (providerContexts.config) {
      context.config = providerContexts.config;
    }

    if (providerContexts.unstable_composerMetadata) {
      context.unstable_composerMetadata =
        providerContexts.unstable_composerMetadata;
    }

    return context;
  }

  subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    notifyStateSubscribers(this._subscribers);
  }

  addTool<TArgs extends Record<string, unknown>, TResult>(
    tool: AssistantToolProps<TArgs, TResult>,
  ): ModelContextRegistryToolHandle<TArgs, TResult> {
    const id = Symbol();

    this._tools.set(id, tool);
    this.notifySubscribers();

    return {
      update: (newTool: AssistantToolProps<TArgs, TResult>) => {
        if (this._tools.has(id)) {
          this._tools.set(id, newTool);
          this.notifySubscribers();
        }
      },
      remove: () => {
        this._tools.delete(id);
        this.notifySubscribers();
      },
    };
  }

  addInstruction(
    config: string | AssistantInstructionsConfig,
  ): ModelContextRegistryInstructionHandle {
    const id = Symbol();

    const instruction =
      typeof config === "string" ? config : config.instruction;
    const disabled = typeof config === "object" ? config.disabled : false;

    if (!disabled) {
      this._instructions.set(id, instruction);
      this.notifySubscribers();
    }

    return {
      update: (newConfig: string | AssistantInstructionsConfig) => {
        const newInstruction =
          typeof newConfig === "string" ? newConfig : newConfig.instruction;
        const newDisabled =
          typeof newConfig === "object" ? newConfig.disabled : false;

        if (newDisabled) {
          this._instructions.delete(id);
        } else {
          this._instructions.set(id, newInstruction);
        }
        this.notifySubscribers();
      },
      remove: () => {
        this._instructions.delete(id);
        this.notifySubscribers();
      },
    };
  }

  addProvider(
    provider: ModelContextProvider,
  ): ModelContextRegistryProviderHandle {
    const unregister =
      this._contextProviders.registerModelContextProvider(provider);

    return {
      remove: unregister,
    };
  }
}
