import type {
  OpenAIAPI,
  OpenAIGlobals,
  IframeToParentMessage,
  ParentToIframeMessage,
  CallToolResponse,
  WidgetState,
  DisplayMode,
  ModalOptions,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
} from "../types";

export interface WorkbenchMessageHandlers {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  requestDisplayMode: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
  requestModal: (options: ModalOptions) => Promise<void>;
  uploadFile: (file: File) => Promise<UploadFileResponse>;
  getFileDownloadUrl: (args: {
    fileId: string;
  }) => Promise<GetFileDownloadUrlResponse>;
}

export class WorkbenchMessageBridge {
  private iframe: HTMLIFrameElement | null = null;
  private handlers: WorkbenchMessageHandlers;
  private boundHandleMessage: (event: MessageEvent) => void;

  constructor(handlers: WorkbenchMessageHandlers) {
    this.handlers = handlers;
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

  sendGlobals(globals: OpenAIGlobals) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "OPENAI_SET_GLOBALS",
      globals,
    };
    this.iframe.contentWindow.postMessage(message, window.location.origin);
  }

  private handleMessage(event: MessageEvent) {
    if (!this.iframe?.contentWindow) return;
    if (event.source !== this.iframe.contentWindow) return;

    const message = event.data as IframeToParentMessage;
    if (!message || typeof message !== "object") return;
    if (message.type !== "OPENAI_METHOD_CALL") return;

    this.processMethodCall(message);
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
    method: keyof OpenAIAPI,
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
      case "requestDisplayMode": {
        const [displayArgs] = args as [{ mode: DisplayMode }];
        return this.handlers.requestDisplayMode(displayArgs);
      }
      case "sendFollowUpMessage": {
        const [msgArgs] = args as [{ prompt: string }];
        return this.handlers.sendFollowUpMessage(msgArgs);
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
      case "requestModal": {
        const [options] = args as [ModalOptions];
        return this.handlers.requestModal(options);
      }
      case "uploadFile": {
        const [file] = args as [File];
        return this.handlers.uploadFile(file);
      }
      case "getFileDownloadUrl": {
        const [fileArgs] = args as [{ fileId: string }];
        return this.handlers.getFileDownloadUrl(fileArgs);
      }
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private sendResponse(id: string, result: unknown) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "OPENAI_METHOD_RESPONSE",
      id,
      result,
    };
    this.iframe.contentWindow.postMessage(message, window.location.origin);
  }

  private sendError(id: string, error: string) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "OPENAI_METHOD_RESPONSE",
      id,
      error,
    };
    this.iframe.contentWindow.postMessage(message, window.location.origin);
  }
}
