import type {
  AUIAPI,
  AUIGlobals,
  IframeToParentMessage,
  ParentToIframeMessage,
  CallToolResponse,
  WidgetState,
  DisplayMode,
  ModalOptions,
} from "../types/protocol";

export interface MessageBridgeHandlers {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: ModalOptions) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
}

export class MessageBridge {
  private iframe: HTMLIFrameElement | null = null;
  private handlers: MessageBridgeHandlers;
  private boundHandleMessage: (event: MessageEvent) => void;
  private legacyHandlers?: {
    onReady?: () => void;
    onAction?: (actionId: string, payload?: unknown) => void;
    onAddResult?: (result: unknown) => void;
    onResize?: (height: number) => void;
    onError?: (error: string) => void;
  };

  constructor(
    handlers: MessageBridgeHandlers,
    legacyHandlers?: MessageBridge["legacyHandlers"],
  ) {
    this.handlers = handlers;
    this.legacyHandlers = legacyHandlers;
    this.boundHandleMessage = this.handleMessage.bind(this);
  }

  attach(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener("message", this.boundHandleMessage);
  }

  detach() {
    window.removeEventListener("message", this.boundHandleMessage);
    this.iframe = null;
  }

  sendGlobals(
    globals: AUIGlobals,
    options?: { toolName?: string; isInitial?: boolean },
  ) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "AUI_SET_GLOBALS",
      globals,
    };
    this.iframe.contentWindow.postMessage(message, "*");

    if (options?.isInitial) {
      const legacyProps = {
        result: globals.toolOutput,
        args: globals.toolInput,
      };
      this.iframe.contentWindow.postMessage(
        {
          type: "render",
          toolName: options?.toolName,
          props: legacyProps,
        },
        "*",
      );
    }
  }

  private handleMessage(event: MessageEvent) {
    if (!this.iframe?.contentWindow) return;
    if (event.source !== this.iframe.contentWindow) return;

    const message = event.data;
    if (!message || typeof message !== "object" || !message.type) return;

    if (message.type === "AUI_METHOD_CALL") {
      this.processMethodCall(message as IframeToParentMessage);
      return;
    }

    this.handleLegacyMessage(message);
  }

  private handleLegacyMessage(message: { type: string; payload?: unknown }) {
    switch (message.type) {
      case "ready":
        this.legacyHandlers?.onReady?.();
        break;
      case "action":
        this.legacyHandlers?.onAction?.(message.payload as string);
        break;
      case "addResult":
        this.legacyHandlers?.onAddResult?.(message.payload);
        break;
      case "resize":
        if (typeof message.payload === "number") {
          this.legacyHandlers?.onResize?.(message.payload);
          this.handlers.notifyIntrinsicHeight(message.payload);
        }
        break;
      case "error":
        this.legacyHandlers?.onError?.(message.payload as string);
        break;
    }
  }

  private async processMethodCall(message: IframeToParentMessage) {
    const { id, method, args } = message;

    try {
      const result = await this.executeMethod(method, args);
      this.sendResponse(id, result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.sendError(id, errorMessage);
    }
  }

  private async executeMethod(
    method: keyof AUIAPI,
    args: unknown[],
  ): Promise<unknown> {
    switch (method) {
      case "callTool": {
        const [name, toolArgs] = args as [string, Record<string, unknown>];
        return this.handlers.callTool(name, toolArgs);
      }
      case "setWidgetState": {
        const [state] = args as [WidgetState];
        this.handlers.setWidgetState(state);
        return undefined;
      }
      case "sendFollowUpMessage": {
        const [msgArgs] = args as [{ prompt: string }];
        return this.handlers.sendFollowUpMessage(msgArgs);
      }
      case "requestDisplayMode": {
        const [displayArgs] = args as [{ mode: DisplayMode }];
        return this.handlers.requestDisplayMode(displayArgs);
      }
      case "requestModal": {
        const [options] = args as [ModalOptions];
        return this.handlers.requestModal(options);
      }
      case "requestClose": {
        this.handlers.requestClose();
        return undefined;
      }
      case "openExternal": {
        const [payload] = args as [{ href: string }];
        this.handlers.openExternal(payload);
        return undefined;
      }
      case "notifyIntrinsicHeight": {
        const [height] = args as [number];
        this.handlers.notifyIntrinsicHeight(height);
        return undefined;
      }
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private sendResponse(id: string, result: unknown) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "AUI_METHOD_RESPONSE",
      id,
      result,
    };
    this.iframe.contentWindow.postMessage(message, "*");
  }

  private sendError(id: string, error: string) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "AUI_METHOD_RESPONSE",
      id,
      error,
    };
    this.iframe.contentWindow.postMessage(message, "*");
  }
}
