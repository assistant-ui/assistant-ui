import {
  ThreadAssistantContentPart,
  ThreadUserContentPart,
  ContentPartStatus,
  ToolCallContentPartStatus,
} from "../types/AssistantTypes";
import { ThreadRuntimeCoreBinding } from "./ThreadRuntime";
import { MessageStateBinding } from "./MessageRuntime";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { Unsubscribe } from "../types";
import { ContentPartRuntimePath } from "./RuntimePathTypes";
import { ToolResponse } from "assistant-stream";

export type ContentPartState = (
  | ThreadUserContentPart
  | ThreadAssistantContentPart
) & {
  readonly status: ContentPartStatus | ToolCallContentPartStatus;
};

type ContentPartSnapshotBinding = SubscribableWithState<
  ContentPartState,
  ContentPartRuntimePath
>;

export type ContentPartRuntime = {
  /**
   * Add tool result to a tool call content part that has no tool result yet.
   * This is useful when you are collecting a tool result via user input ("human tool calls").
   */
  addToolResult(result: any | ToolResponse<any>): void;

  readonly path: ContentPartRuntimePath;
  getState(): ContentPartState;
  subscribe(callback: () => void): Unsubscribe;
};

export class ContentPartRuntimeImpl implements ContentPartRuntime {
  public get path() {
    return this.contentBinding.path;
  }

  constructor(
    private contentBinding: ContentPartSnapshotBinding,
    private messageApi?: MessageStateBinding,
    private threadApi?: ThreadRuntimeCoreBinding,
  ) {}

  protected __internal_bindMethods() {
    this.addToolResult = this.addToolResult.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  public getState() {
    return this.contentBinding.getState();
  }

  public addToolResult(result: any | ToolResponse<any>) {
    const state = this.contentBinding.getState();
    if (!state) throw new Error("Content part is not available");

    if (state.type !== "tool-call")
      throw new Error("Tried to add tool result to non-tool content part");

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

  public subscribe(callback: () => void) {
    return this.contentBinding.subscribe(callback);
  }
}
