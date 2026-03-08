import { ModelContextProvider, ModelContext } from "../types";
import type { Unsubscribe } from "../../types";
import { Tool } from "assistant-stream";
import {
  FrameMessage,
  FRAME_MESSAGE_CHANNEL,
  SerializedModelContext,
  SerializedTool,
} from "./types";

/**
 * Deserializes tools from JSON Schema format back to Tool objects
 */
const deserializeTool = (serializedTool: SerializedTool): Tool<any, any> =>
  ({
    parameters: serializedTool.parameters,
    ...(serializedTool.description && {
      description: serializedTool.description,
    }),
    ...(serializedTool.disabled !== undefined && {
      disabled: serializedTool.disabled,
    }),
    ...(serializedTool.type && { type: serializedTool.type }),
  }) as Tool<any, any>;

/**
 * Deserializes a ModelContext from transmission format
 */
const deserializeModelContext = (
  serialized: SerializedModelContext,
): ModelContext => ({
  ...(serialized.system !== undefined && { system: serialized.system }),
  ...(serialized.tools && {
    tools: Object.fromEntries(
      Object.entries(serialized.tools).map(([name, tool]) => [
        name,
        deserializeTool(tool),
      ]),
    ),
  }),
});

export class AssistantFrameHost implements ModelContextProvider {
  private _context: ModelContext = {};
  private _subscribers = new Set<() => void>();
  private _pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }
  >();
  private _requestCounter = 0;
  private _iframeWindow: Window;
  private _targetOrigin: string;

  constructor(iframeWindow: Window, targetOrigin: string = "*") {
    this._iframeWindow = iframeWindow;
    this._targetOrigin = targetOrigin;

    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);

    this.requestContext();
  }

  private handleMessage(event: MessageEvent) {
    if (this._targetOrigin !== "*" && event.origin !== this._targetOrigin)
      return;
    if (event.source !== this._iframeWindow) return;
    if (event.data?.channel !== FRAME_MESSAGE_CHANNEL) return;

    const message = event.data.message as FrameMessage;

    switch (message.type) {
      case "model-context-update": {
        this.updateContext(message.context);
        break;
      }

      case "tool-result": {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
          this._pendingRequests.delete(message.id);
        }
        break;
      }
    }
  }

  private updateContext(serializedContext: SerializedModelContext) {
    const context = deserializeModelContext(serializedContext);
    this._context = {
      ...context,
      tools:
        context.tools &&
        Object.fromEntries(
          Object.entries(context.tools).map(([name, tool]) => [
            name,
            {
              ...tool,
              execute: (args: any) => this.callTool(name, args),
            } as Tool<any, any>,
          ]),
        ),
    };
    this.notifySubscribers();
  }

  private callTool(toolName: string, args: any): Promise<any> {
    return this.sendRequest(
      {
        type: "tool-call",
        id: `tool-${this._requestCounter++}`,
        toolName,
        args,
      },
      30000,
      `Tool call "${toolName}" timed out`,
    );
  }

  private sendRequest<T extends FrameMessage & { id: string }>(
    message: T,
    timeout = 30000,
    timeoutMessage = "Request timed out",
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(message.id, { resolve, reject });

      this._iframeWindow.postMessage(
        { channel: FRAME_MESSAGE_CHANNEL, message },
        this._targetOrigin,
      );

      const timeoutId = setTimeout(() => {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          pending.reject(new Error(timeoutMessage));
          this._pendingRequests.delete(message.id);
        }
      }, timeout);

      const originalResolve = this._pendingRequests.get(message.id)!.resolve;
      const originalReject = this._pendingRequests.get(message.id)!.reject;

      this._pendingRequests.set(message.id, {
        resolve: (value: any) => {
          clearTimeout(timeoutId);
          originalResolve(value);
        },
        reject: (error: any) => {
          clearTimeout(timeoutId);
          originalReject(error);
        },
      });
    });
  }

  private requestContext() {
    this._iframeWindow.postMessage(
      {
        channel: FRAME_MESSAGE_CHANNEL,
        message: {
          type: "model-context-request",
        } as FrameMessage,
      },
      this._targetOrigin,
    );
  }

  private notifySubscribers() {
    this._subscribers.forEach((callback) => callback());
  }

  getModelContext(): ModelContext {
    return this._context;
  }

  subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  dispose() {
    window.removeEventListener("message", this.handleMessage);
    this._subscribers.clear();
    this._pendingRequests.clear();
  }
}
