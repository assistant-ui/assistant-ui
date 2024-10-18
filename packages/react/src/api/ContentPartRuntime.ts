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
  /**
   * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
   */
  part: ThreadUserContentPart | ThreadAssistantContentPart;
  status: ContentPartStatus | ToolCallContentPartStatus;
};

type ContentPartSnapshotBinding = SubscribableWithState<
  ContentPartState,
  ContentPartRuntimePath
>;

export type ContentPartRuntime = {
  path: ContentPartRuntimePath;

  getState(): ContentPartState;
  addToolResult(result: any): void;
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
