import { ModelContextProvider, ModelContext } from "../../model-context/ModelContextTypes";
import { Unsubscribe } from "../../types/Unsubscribe";
import { Tool } from "assistant-stream";
import {
  FrameMessage,
  FRAME_MESSAGE_CHANNEL,
  SerializedModelContext,
  SerializedTool,
} from "./AssistantFrameTypes";

/**
 * Deserializes tools from JSON Schema format back to Tool objects
 */
const deserializeTool = (serializedTool: SerializedTool): Tool<any, any> => ({
  parameters: serializedTool.parameters,
  ...(serializedTool.description && { description: serializedTool.description }),
  ...(serializedTool.disabled !== undefined && { disabled: serializedTool.disabled }),
  ...(serializedTool.type && { type: serializedTool.type }),
} as Tool<any, any>);

/**
 * Deserializes a ModelContext from transmission format
 */
const deserializeModelContext = (serialized: SerializedModelContext): ModelContext => ({
  ...(serialized.system !== undefined && { system: serialized.system }),
  ...(serialized.tools && {
    tools: Object.fromEntries(
      Object.entries(serialized.tools).map(([name, tool]) => [name, deserializeTool(tool)])
    ),
  }),
});

/**
 * AssistantFrameHost - Runs in the parent window and acts as a ModelContextProvider
 * that receives context from an iframe's AssistantFrameProvider.
 * 
 * Usage example:
 * ```typescript
 * // In parent window
 * const frameHost = new AssistantFrameHost(iframeWindow);
 * 
 * // Register with assistant runtime
 * const runtime = useAssistantRuntime();
 * runtime.registerModelContextProvider(frameHost);
 * 
 * // The assistant now has access to tools from the iframe
 * ```
 */
export class AssistantFrameHost implements ModelContextProvider {
  private _context: ModelContext = {};
  private _subscribers = new Set<() => void>();
  private _subscriptionId: string;
  private _pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private _requestCounter = 0;
  private _iframeWindow: Window;
  private _targetOrigin: string;

  constructor(iframeWindow: Window, targetOrigin: string = "*") {
    this._iframeWindow = iframeWindow;
    this._targetOrigin = targetOrigin;
    this._subscriptionId = `host-${Date.now()}-${Math.random()}`;
    
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);
    
    // Initialize connection
    this.connect();
  }

  private handleMessage(event: MessageEvent) {
    // Security: Validate origin and source
    if (this._targetOrigin !== "*" && event.origin !== this._targetOrigin) return;
    if (event.source !== this._iframeWindow) return;
    if (event.data?.channel !== FRAME_MESSAGE_CHANNEL) return;

    const message = event.data.message as FrameMessage;
    
    switch (message.type) {
      case "model-context-response":
      case "model-context-update": {
        this.updateContext(message.context);
        if (message.type === "model-context-response") {
          const pending = this._pendingRequests.get(message.id);
          if (pending) {
            pending.resolve(this._context);
            this._pendingRequests.delete(message.id);
          }
        }
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
      tools: context.tools && Object.fromEntries(
        Object.entries(context.tools).map(([name, tool]) => [
          name,
          { ...tool, execute: (args: any) => this.callTool(name, args) } as Tool<any, any>,
        ])
      ),
    };
    this.notifySubscribers();
  }

  private callTool(toolName: string, args: any): Promise<any> {
    return this.sendRequest({
      type: "tool-call",
      id: `tool-${this._requestCounter++}`,
      toolName,
      args,
    }, 30000, `Tool call "${toolName}" timed out`);
  }

  private sendRequest<T extends FrameMessage & { id: string }>(message: T, timeout = 30000, timeoutMessage = "Request timed out"): Promise<any> {
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(message.id, { resolve, reject });
      
      this._iframeWindow.postMessage(
        { channel: FRAME_MESSAGE_CHANNEL, message },
        { targetOrigin: this._targetOrigin }
      );
      
      setTimeout(() => {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          pending.reject(new Error(timeoutMessage));
          this._pendingRequests.delete(message.id);
        }
      }, timeout);
    });
  }

  private async connect() {
    try {
      await this.sendRequest({
        type: "model-context-request",
        id: `init-${this._requestCounter++}`,
      }, 5000);
    } catch {
      // Don't fail if initial request fails
    }
    
    // Subscribe to updates
    this._iframeWindow.postMessage(
      { 
        channel: FRAME_MESSAGE_CHANNEL, 
        message: {
          type: "model-context-subscribe",
          id: this._subscriptionId,
        } as FrameMessage
      },
      { targetOrigin: this._targetOrigin }
    );
  }

  private notifySubscribers() {
    this._subscribers.forEach(callback => callback());
  }

  getModelContext(): ModelContext {
    return this._context;
  }

  subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  dispose() {
    this._iframeWindow.postMessage(
      { 
        channel: FRAME_MESSAGE_CHANNEL, 
        message: {
          type: "model-context-unsubscribe",
          id: this._subscriptionId,
        } as FrameMessage
      },
      { targetOrigin: this._targetOrigin }
    );
    
    window.removeEventListener("message", this.handleMessage);
    this._subscribers.clear();
    this._pendingRequests.clear();
  }
}