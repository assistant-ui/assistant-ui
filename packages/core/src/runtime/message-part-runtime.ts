import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  MessagePartStatus,
  ToolCallMessagePartStatus,
  Unsubscribe,
} from "../types";
import type { SubscribableWithState } from "../subscribable/subscribable";
import type { ThreadRuntimeCoreBinding } from "./thread-runtime";
import type { MessageStateBinding } from "./bindings";
import type { MessagePartRuntimePath } from "./paths";
import { ToolResponse } from "assistant-stream";

export type MessagePartState = (
  | ThreadUserMessagePart
  | ThreadAssistantMessagePart
) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type MessagePartSnapshotBinding = SubscribableWithState<
  MessagePartState,
  MessagePartRuntimePath
>;

export type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;

  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe;
};

export class MessagePartRuntimeImpl implements MessagePartRuntime {
  public get path() {
    return this.contentBinding.path;
  }

  constructor(
    private contentBinding: MessagePartSnapshotBinding,
    private messageApi?: MessageStateBinding,
    private threadApi?: ThreadRuntimeCoreBinding,
  ) {
    this.__internal_bindMethods();
  }

  protected __internal_bindMethods() {
    this.addToolResult = this.addToolResult.bind(this);
    this.resumeToolCall = this.resumeToolCall.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  public getState() {
    return this.contentBinding.getState();
  }

  public addToolResult(result: any | ToolResponse<any>) {
    const state = this.contentBinding.getState();
    if (!state) throw new Error("Message part is not available");

    if (state.type !== "tool-call")
      throw new Error("Tried to add tool result to non-tool message part");

    if (!this.messageApi)
      throw new Error(
        "Message API is not available. This is likely a bug in assistant-ui.",
      );
    if (!this.threadApi) throw new Error("Thread API is not available");

    const message = this.messageApi.getState();
    if (!message) throw new Error("Message is not available");

    const toolName = state.toolName;
    const toolCallId = state.toolCallId;

    const response = ToolResponse.toResponse(result);
    this.threadApi.getState().addToolResult({
      messageId: message.id,
      toolName,
      toolCallId,
      result: response.result,
      artifact: response.artifact,
      isError: response.isError,
    });
  }

  public resumeToolCall(payload: unknown) {
    const state = this.contentBinding.getState();
    if (!state) throw new Error("Message part is not available");

    if (state.type !== "tool-call")
      throw new Error("Tried to resume tool call on non-tool message part");

    if (!this.threadApi) throw new Error("Thread API is not available");

    const toolCallId = state.toolCallId;
    this.threadApi.getState().resumeToolCall({
      toolCallId,
      payload,
    });
  }

  public subscribe(callback: () => void) {
    return this.contentBinding.subscribe(callback);
  }
}
