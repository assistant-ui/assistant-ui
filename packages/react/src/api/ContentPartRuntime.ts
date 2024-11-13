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
  addToolResult(result: any): void;

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
    private messageApi: MessageStateBinding,
    private threadApi: ThreadRuntimeCoreBinding,
  ) {}

  public getState() {
    return this.contentBinding.getState();
  }

  public addToolResult(result: any) {
    const message = this.messageApi.getState();
    if (!message) throw new Error("Message is not available");

    const state = this.contentBinding.getState();
    if (!state) throw new Error("Content part is not available");

    if (state.type !== "tool-call")
      throw new Error("Tried to add tool result to non-tool content part");

    const toolName = state.toolName;
    const toolCallId = state.toolCallId;

    this.threadApi.getState().addToolResult({
      messageId: message.id,
      toolName,
      toolCallId,
      result,
    });
  }

  public subscribe(callback: () => void) {
    return this.contentBinding.subscribe(callback);
  }
}
