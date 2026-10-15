import type { ModelContextProvider, ModelContext } from "../types";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { Tool } from "assistant-stream";
import { notifySubscribers as notifyStateSubscribers } from "../../subscribable/subscribable";
import { generateId } from "../../utils/id";
import { getAbortReason } from "../../utils/abortable-promise";
import {
  type FrameMessage,
  FRAME_MESSAGE_CHANNEL,
  type SerializedModelContext,
  type SerializedTool,
} from "./types";
import { isFrameMessage } from "./validate";

const getDefaultTargetOrigin = () => window.location.origin;
const FRAME_LOAD_GRACE_MS = 2000;

const logCancellationFailure = (error: unknown) => {
  console.error(
    "[assistant-ui] AssistantFrameHost tool cancellation could not be sent.",
    error,
  );
};

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
  private _iframeWindow: Window;
  private _targetOrigin: string;
  private _disposed = false;
  private _providerDisposed = false;
  private _documentId: string | undefined;
  private _previousDocumentIds = new Set<string>();
  private _frameLoadTimeout: ReturnType<typeof setTimeout> | undefined;
  private _frameLoadRequestId: string | undefined;
  private _frameLoadDocumentId: string | undefined;

  constructor(
    iframeWindow: Window,
    targetOrigin: string = getDefaultTargetOrigin(),
  ) {
    this._iframeWindow = iframeWindow;
    this._targetOrigin = targetOrigin;

    this.handleMessage = this.handleMessage.bind(this);
    // A posted message cannot be delivered before this constructor returns, so
    // requesting first means a failed request leaves no listener to clean up.
    this.requestContext();
    window.addEventListener("message", this.handleMessage);
  }

  private handleMessage(event: MessageEvent) {
    if (this._targetOrigin !== "*" && event.origin !== this._targetOrigin)
      return;
    if (event.source !== this._iframeWindow) return;
    if (event.data?.channel !== FRAME_MESSAGE_CHANNEL) return;

    const message = event.data.message;
    if (!isFrameMessage(message)) return;

    const isLoadResponse =
      this._frameLoadRequestId !== undefined &&
      message.type === "model-context-update" &&
      message.requestId === this._frameLoadRequestId;
    if (isLoadResponse) {
      if (message.documentId !== undefined)
        this._previousDocumentIds.delete(message.documentId);
      this._frameLoadRequestId = undefined;
    }

    if (
      message.documentId !== undefined &&
      this._previousDocumentIds.has(message.documentId)
    )
      return;

    if (
      this._frameLoadTimeout !== undefined &&
      (isLoadResponse ||
        (message.documentId !== undefined &&
          message.documentId !== this._frameLoadDocumentId) ||
        (message.type === "model-context-update" &&
          message.documentId === undefined))
    ) {
      clearTimeout(this._frameLoadTimeout);
      this._frameLoadTimeout = undefined;
    }

    if (message.documentId !== undefined) {
      if (message.documentId !== this._documentId) {
        if (this._documentId !== undefined)
          this._previousDocumentIds.add(this._documentId);
        this.clearDocument();
        this._documentId = message.documentId;
      }
    }

    switch (message.type) {
      case "model-context-update": {
        this._providerDisposed = false;
        this.updateContext(message.context, message.documentId);
        break;
      }

      case "provider-disposed": {
        this._providerDisposed = true;
        const error = new Error("AssistantFrameProvider has been disposed");
        for (const [id, pending] of this._pendingRequests) {
          this._pendingRequests.delete(id);
          this.cancelToolCall(id);
          pending.reject(error);
        }
        break;
      }

      case "tool-result": {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          if (typeof message.error === "string") {
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

  private clearDocument() {
    this._context = {};
    this._providerDisposed = true;
    this.notifySubscribers();
    const error = new Error("AssistantFrame document has changed");
    for (const [id, pending] of this._pendingRequests) {
      this._pendingRequests.delete(id);
      pending.reject(error);
    }
  }

  /** Request tools after each iframe load; clear the previous document if no provider answers within two seconds. */
  frameLoaded() {
    if (this._disposed) return;
    this._frameLoadRequestId = generateId();
    this._frameLoadDocumentId = this._documentId;
    if (this._frameLoadTimeout !== undefined)
      clearTimeout(this._frameLoadTimeout);
    this._frameLoadTimeout = setTimeout(() => {
      this._frameLoadTimeout = undefined;
      if (this._documentId !== undefined)
        this._previousDocumentIds.add(this._documentId);
      this._documentId = undefined;
      this.clearDocument();
    }, FRAME_LOAD_GRACE_MS);
    this.requestContext(this._frameLoadRequestId);
  }

  private updateContext(
    serializedContext: SerializedModelContext,
    documentId: string | undefined,
  ) {
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
              execute: (args: any, context: { abortSignal: AbortSignal }) =>
                this.callTool(name, args, context.abortSignal, documentId),
            } as Tool<any, any>,
          ]),
        ),
    };
    this.notifySubscribers();
  }

  private callTool(
    toolName: string,
    args: any,
    abortSignal: AbortSignal,
    documentId: string | undefined,
  ): Promise<any> {
    return this.sendRequest(
      {
        type: "tool-call",
        id: `tool-${generateId()}`,
        toolName,
        args,
        ...(documentId !== undefined && { documentId }),
      },
      30000,
      `Tool call "${toolName}" timed out`,
      abortSignal,
    );
  }

  private sendRequest<T extends FrameMessage & { id: string }>(
    message: T,
    timeout = 30000,
    timeoutMessage = "Request timed out",
    abortSignal?: AbortSignal,
  ): Promise<any> {
    if (this._disposed) {
      return Promise.reject(new Error("AssistantFrameHost has been disposed"));
    }
    if (this._providerDisposed) {
      return Promise.reject(
        new Error("AssistantFrameProvider has been disposed"),
      );
    }
    if (abortSignal?.aborted) {
      return Promise.reject(
        getAbortReason(abortSignal, "Tool call was aborted"),
      );
    }

    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => {
        if (!abortSignal) return;
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          this.cancelToolCall(message.id);
          pending.reject(getAbortReason(abortSignal, "Tool call was aborted"));
          this._pendingRequests.delete(message.id);
        }
      };
      const cleanup = () => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        abortSignal?.removeEventListener("abort", onAbort);
      };

      this._pendingRequests.set(message.id, {
        resolve: (value: any) => {
          cleanup();
          resolve(value);
        },
        reject: (error: any) => {
          cleanup();
          reject(error);
        },
      });

      timeoutId = setTimeout(() => {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          this.cancelToolCall(message.id);
          pending.reject(new Error(timeoutMessage));
          this._pendingRequests.delete(message.id);
        }
      }, timeout);
      abortSignal?.addEventListener("abort", onAbort, { once: true });

      try {
        this._iframeWindow.postMessage(
          { channel: FRAME_MESSAGE_CHANNEL, message },
          this._targetOrigin,
        );
      } catch (error) {
        const pending = this._pendingRequests.get(message.id);
        this._pendingRequests.delete(message.id);
        pending?.reject(error);
      }
    });
  }

  private cancelToolCall(
    id: string,
    onError: (error: unknown) => void = logCancellationFailure,
  ) {
    try {
      this._iframeWindow.postMessage(
        {
          channel: FRAME_MESSAGE_CHANNEL,
          message: { type: "tool-cancel", id } satisfies FrameMessage,
        },
        this._targetOrigin,
      );
    } catch (error) {
      onError(error);
    }
  }

  private requestContext(requestId?: string) {
    this._iframeWindow.postMessage(
      {
        channel: FRAME_MESSAGE_CHANNEL,
        message: {
          type: "model-context-request",
          ...(requestId !== undefined && { requestId }),
        } as FrameMessage,
      },
      this._targetOrigin,
    );
  }

  private notifySubscribers() {
    notifyStateSubscribers(this._subscribers);
  }

  getModelContext(): ModelContext {
    return this._context;
  }

  subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  dispose() {
    this._disposed = true;
    if (this._frameLoadTimeout !== undefined)
      clearTimeout(this._frameLoadTimeout);
    window.removeEventListener("message", this.handleMessage);
    this._subscribers.clear();
    const error = new Error("AssistantFrameHost has been disposed");
    let cancellationFailed = false;
    let cancellationError: unknown;

    for (const [id, pending] of this._pendingRequests) {
      this._pendingRequests.delete(id);
      this.cancelToolCall(id, (error) => {
        if (!cancellationFailed) {
          cancellationFailed = true;
          cancellationError = error;
        } else {
          logCancellationFailure(error);
        }
      });
      pending.reject(error);
    }

    if (cancellationFailed) throw cancellationError;
  }
}
