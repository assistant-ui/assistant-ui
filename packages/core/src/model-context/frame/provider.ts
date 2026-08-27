import type { ModelContextProvider, ModelContext } from "../types";
import type { Unsubscribe } from "../../types/unsubscribe";
import { type Tool, toJSONSchema } from "assistant-stream";
import {
  type FrameMessage,
  FRAME_MESSAGE_CHANNEL,
  type SerializedModelContext,
  type SerializedTool,
} from "./types";

const serializeTool = (tool: Tool<any, any>): SerializedTool => ({
  ...(tool.description && { description: tool.description }),
  parameters: tool.parameters ? toJSONSchema(tool.parameters) : undefined,
  ...(tool.disabled !== undefined && { disabled: tool.disabled }),
  ...(tool.type && { type: tool.type }),
});

const serializeModelContext = (
  context: ModelContext,
): SerializedModelContext => ({
  ...(context.system !== undefined && { system: context.system }),
  ...(context.tools && {
    tools: Object.fromEntries(
      Object.entries(context.tools).map(([name, tool]) => [
        name,
        serializeTool(tool),
      ]),
    ),
  }),
});

const getDefaultTargetOrigin = () => window.location.origin;

export class AssistantFrameProvider {
  private static _instance: AssistantFrameProvider | null = null;

  private _providers = new Map<symbol, ModelContextProvider>();
  private _providerUnsubscribes = new Map<symbol, Unsubscribe | undefined>();
  private _activeToolCalls = new Map<
    string,
    { abortController: AbortController; event: MessageEvent }
  >();
  private _targetOrigin: string;
  private _strictRegistrations = 0;
  private _wildcardRegistrations = 0;

  private constructor(targetOrigin: string = getDefaultTargetOrigin()) {
    this._targetOrigin = targetOrigin;
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);

    setTimeout(() => this.broadcastUpdate(), 0);
  }

  private static getInstance(targetOrigin?: string): AssistantFrameProvider {
    if (!AssistantFrameProvider._instance) {
      AssistantFrameProvider._instance = new AssistantFrameProvider(
        targetOrigin,
      );
    } else {
      AssistantFrameProvider._instance.reconcileTargetOrigin(targetOrigin);
    }
    return AssistantFrameProvider._instance;
  }

  private reconcileTargetOrigin(
    targetOrigin: string = getDefaultTargetOrigin(),
  ) {
    if (targetOrigin === this._targetOrigin) return;

    if (this._providers.size === 0) {
      this._targetOrigin = targetOrigin;
      return;
    }

    if (targetOrigin === "*") return;

    if (this._targetOrigin === "*") {
      this._targetOrigin = targetOrigin;
      return;
    }

    throw new Error(
      `AssistantFrameProvider cannot register conflicting target origins: "${this._targetOrigin}" and "${targetOrigin}"`,
    );
  }

  private handleMessage(event: MessageEvent) {
    if (this._targetOrigin !== "*" && event.origin !== this._targetOrigin)
      return;
    if (event.source !== window.parent) return;
    if (event.data?.channel !== FRAME_MESSAGE_CHANNEL) return;

    const message = event.data.message as FrameMessage;

    switch (message.type) {
      case "model-context-request":
        this.sendMessage(event, {
          type: "model-context-update",
          context: serializeModelContext(this.getModelContext()),
        });
        break;

      case "tool-call":
        this.handleToolCall(message, event);
        break;

      case "tool-cancel":
        this.cancelToolCall(message.id);
        break;
    }
  }

  private async handleToolCall(
    message: Extract<FrameMessage, { type: "tool-call" }>,
    event: MessageEvent,
  ) {
    const tool = this.getModelContext().tools?.[message.toolName];
    const abortController = new AbortController();
    this._activeToolCalls.get(message.id)?.abortController.abort();
    const activeCall = { abortController, event };
    this._activeToolCalls.set(message.id, activeCall);

    let result: any;
    let error: string | undefined;

    if (!tool) {
      error = `Tool "${message.toolName}" not found`;
    } else {
      try {
        result = tool.execute
          ? await tool.execute(message.args, {
              toolCallId: message.id,
              abortSignal: abortController.signal,
              human: async () => {
                throw new Error(
                  "Tool human input is not supported in frame context",
                );
              },
            })
          : undefined;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }

    if (this._activeToolCalls.get(message.id) !== activeCall) return;
    this._activeToolCalls.delete(message.id);

    this.sendMessage(event, {
      type: "tool-result",
      id: message.id,
      ...(error !== undefined ? { error } : { result }),
    });
  }

  private cancelToolCall(id: string) {
    const activeCall = this._activeToolCalls.get(id);
    if (!activeCall) return;
    this._activeToolCalls.delete(id);
    activeCall.abortController.abort();
  }

  private sendMessage(event: MessageEvent, message: FrameMessage) {
    event.source?.postMessage(
      { channel: FRAME_MESSAGE_CHANNEL, message },
      { targetOrigin: event.origin },
    );
  }

  private getModelContext(): ModelContext {
    const contexts = Array.from(new Set(this._providers.values())).map((p) =>
      p.getModelContext(),
    );

    return contexts.reduce(
      (merged, context) => ({
        system: context.system
          ? merged.system
            ? `${merged.system}\n\n${context.system}`
            : context.system
          : merged.system,
        tools: { ...(merged.tools || {}), ...(context.tools || {}) },
      }),
      {} as ModelContext,
    );
  }

  private broadcastUpdate() {
    if (window.parent && window.parent !== window) {
      const updateMessage: FrameMessage = {
        type: "model-context-update",
        context: serializeModelContext(this.getModelContext()),
      };

      window.parent.postMessage(
        { channel: FRAME_MESSAGE_CHANNEL, message: updateMessage },
        this._targetOrigin,
      );
    }
  }

  private removeProvider(id: symbol, origin: string): Unsubscribe | undefined {
    this._providers.delete(id);
    const unsubscribe = this._providerUnsubscribes.get(id);
    this._providerUnsubscribes.delete(id);
    if (origin === "*") {
      this._wildcardRegistrations -= 1;
      if (
        this._wildcardRegistrations === 0 &&
        this._strictRegistrations === 0
      ) {
        this._targetOrigin = getDefaultTargetOrigin();
      }
    } else {
      this._strictRegistrations -= 1;
      if (this._strictRegistrations === 0) {
        this._targetOrigin =
          this._wildcardRegistrations > 0 ? "*" : getDefaultTargetOrigin();
      }
    }
    return unsubscribe;
  }

  static addModelContextProvider(
    provider: ModelContextProvider,
    targetOrigin?: string,
  ): Unsubscribe {
    const origin = targetOrigin ?? getDefaultTargetOrigin();
    const instance = AssistantFrameProvider.getInstance(origin);
    const id = Symbol();
    instance._providers.set(id, provider);
    if (origin === "*") {
      instance._wildcardRegistrations += 1;
    } else {
      instance._strictRegistrations += 1;
    }

    try {
      const unsubscribe = provider.subscribe?.(() =>
        instance.broadcastUpdate(),
      );
      if (unsubscribe) {
        instance._providerUnsubscribes.set(id, unsubscribe);
      }

      instance.broadcastUpdate();
    } catch (error) {
      const unsubscribe = instance.removeProvider(id, origin);
      // Rollback failures must not replace the registration error.
      try {
        unsubscribe?.();
      } catch (unsubscribeError) {
        console.error(unsubscribeError);
      }
      try {
        instance.broadcastUpdate();
      } catch (broadcastError) {
        console.error(broadcastError);
      }
      throw error;
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const unsubscribe = instance.removeProvider(id, origin);
      let unsubscribeFailed = false;
      let unsubscribeError: unknown;
      try {
        unsubscribe?.();
      } catch (error) {
        unsubscribeFailed = true;
        unsubscribeError = error;
      }
      try {
        instance.broadcastUpdate();
      } catch (error) {
        if (!unsubscribeFailed) throw error;
        console.error(error);
      }
      if (unsubscribeFailed) throw unsubscribeError;
    };
  }

  static dispose() {
    if (AssistantFrameProvider._instance) {
      const instance = AssistantFrameProvider._instance;
      window.removeEventListener("message", instance.handleMessage);

      let cleanupFailed = false;
      let cleanupError: unknown;
      const runCleanup = (cleanup: () => void) => {
        try {
          cleanup();
        } catch (error) {
          if (cleanupFailed) {
            console.error(error);
          } else {
            cleanupFailed = true;
            cleanupError = error;
          }
        }
      };

      instance._providerUnsubscribes.forEach((unsubscribe) => {
        if (unsubscribe) runCleanup(unsubscribe);
      });
      instance._providerUnsubscribes.clear();
      instance._providers.clear();
      instance._activeToolCalls.forEach(({ abortController, event }, id) => {
        runCleanup(() => {
          abortController.abort();
          instance.sendMessage(event, {
            type: "tool-result",
            id,
            error: "AssistantFrameProvider has been disposed",
          });
        });
      });
      instance._activeToolCalls.clear();

      AssistantFrameProvider._instance = null;
      if (cleanupFailed) throw cleanupError;
    }
  }
}
