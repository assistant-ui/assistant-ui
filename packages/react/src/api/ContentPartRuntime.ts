import {
  ThreadAssistantContentPart,
  ThreadUserContentPart,
  ContentPartStatus,
  ToolCallContentPartStatus,
  ToolCallContentPart,
  TextContentPart,
  ImageContentPart,
  UIContentPart,
} from "../types/AssistantTypes";
import { ThreadRuntimeCoreBinding } from "./ThreadRuntime";
import { MessageSnapshotBinding } from "./MessageRuntime";
import { SubscribableWithState } from "./subscribable/Subscribable";

type ContentPartSnapshot = {
  part: ThreadUserContentPart | ThreadAssistantContentPart;
  status: ContentPartStatus | ToolCallContentPartStatus;
};

type ContentPartSnapshotBinding = SubscribableWithState<
  ContentPartSnapshot | undefined
>;

type ContentPartState = (ThreadUserContentPart | ThreadAssistantContentPart) &
  ContentPartSnapshot & {
    /**
     * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
     */
    part: ThreadUserContentPart | ThreadAssistantContentPart;
  };

const ContentPartState = class {
  constructor(private snapshot: ContentPartSnapshot) {}

  get part() {
    return this.snapshot.part;
  }

  get status() {
    return this.snapshot.status;
  }

  get type() {
    return this.snapshot.part.type;
  }

  get text() {
    return (this.snapshot.part as TextContentPart).text;
  }

  get image() {
    return (this.snapshot.part as ImageContentPart).image;
  }

  get display() {
    return (this.snapshot.part as UIContentPart).display;
  }

  get toolCallId() {
    return (this.snapshot.part as ToolCallContentPart).toolCallId;
  }

  get toolName() {
    return (this.snapshot.part as ToolCallContentPart).toolName;
  }

  get args() {
    return (this.snapshot.part as ToolCallContentPart).args;
  }

  get argsText() {
    return (this.snapshot.part as ToolCallContentPart).argsText;
  }

  get result() {
    return (this.snapshot.part as ToolCallContentPart).result;
  }

  get isError() {
    return (this.snapshot.part as ToolCallContentPart).isError;
  }
} as new (snapshot: ContentPartSnapshot) => ContentPartState;

export class ContentPartRuntime {
  constructor(
    private contentBinding: ContentPartSnapshotBinding,
    private messageApi: MessageSnapshotBinding,
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

    if (state.part.type !== "tool-call")
      throw new Error("Tried to add tool result to non-tool content part");

    const toolName = state.part.toolName;
    const toolCallId = state.part.toolCallId;

    this.threadApi.getState().addToolResult({
      messageId: message.id,
      toolName,
      toolCallId,
      result,
    });
  }
}
