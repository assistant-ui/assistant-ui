import {
  ThreadMessage,
  AppendMessage,
  ThreadAssistantContentPart,
  ThreadUserContentPart,
} from "../types";
import {
  ContentPartStatus,
  ToolCallContentPartStatus,
} from "../types/AssistantTypes";
import { AttachmentState, MessageAttachmentRuntime } from "./AttachmentRuntime";
import { EditComposerRuntime } from "./ComposerRuntime";
import { ContentPartRuntime, ContentPartState } from "./ContentPartRuntime";
import { ThreadRuntimeCoreBinding } from "./ThreadRuntime";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SubscribableWithState } from "./subscribable/Subscribable";

const COMPLETE_STATUS: ContentPartStatus = {
  type: "complete",
};

export const toContentPartStatus = (
  message: ThreadMessage,
  partIndex: number,
  part: ThreadUserContentPart | ThreadAssistantContentPart,
): ToolCallContentPartStatus => {
  if (message.role !== "assistant") return COMPLETE_STATUS;

  const isLastPart = partIndex === Math.max(0, message.content.length - 1);
  if (part.type !== "tool-call") {
    if (
      "reason" in message.status &&
      message.status.reason === "tool-calls" &&
      isLastPart
    )
      throw new Error(
        "Encountered unexpected requires-action status. This is likely an internal bug in assistant-ui.",
      );

    return isLastPart ? (message.status as ContentPartStatus) : COMPLETE_STATUS;
  }

  if (!!part.result) {
    return COMPLETE_STATUS;
  }

  return message.status as ToolCallContentPartStatus;
};

export const EMPTY_CONTENT = Object.freeze({ type: "text", text: "" });

const getContentPartState = (
  message: MessageState,
  partIndex: number,
): ContentPartState | SKIP_UPDATE => {
  let part = message.content[partIndex];
  if (!part) {
    // for empty messages, show an empty text content part
    if (message.content.length === 0 && partIndex === 0) {
      part = EMPTY_CONTENT;
    } else {
      return SKIP_UPDATE;
    }
  } else if (
    message.content.length === 1 &&
    part.type === "text" &&
    part.text.length === 0
  ) {
    // ensure reference equality for equivalent empty text parts
    part = EMPTY_CONTENT;
  }

  // if the content part is the same, don't update
  const status = toContentPartStatus(message, partIndex, part);
  return Object.freeze({ ...part, part, status });
};

export type MessageState = ThreadMessage & {
  /**
   * @deprecated You can directly access message fields in the state. Replace `.message.content` with `.content` etc. This will be removed in 0.6.0.
   */
  message: ThreadMessage;
  parentId: string | null;
  isLast: boolean;
  /**
   * @deprecated Use `branchNumber` and `branchCount` instead. This will be removed in 0.6.0.
   */
  branches: readonly string[];

  branchNumber: number;
  branchCount: number;
};

export type MessageStateBinding = SubscribableWithState<MessageState>;

export class MessageRuntime {
  constructor(
    private _core: MessageStateBinding,
    private _threadBinding: ThreadRuntimeCoreBinding,
  ) {}

  public composer = new EditComposerRuntime(
    new NestedSubscriptionSubject({
      getState: () =>
        this._threadBinding
          .getState()
          .getEditComposer(this._core.getState().id),
      subscribe: (callback) => this._threadBinding.subscribe(callback),
    }),
    () => this._threadBinding.getState().beginEdit(this._core.getState().id),
  );

  public getState() {
    return this._core.getState();
  }

  // TODO improve type
  public unstable_edit(message: Omit<AppendMessage, "parentId">) {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    this._threadBinding.getState().append({
      ...(message as AppendMessage),
      parentId: state.parentId,
    });
  }

  public reload() {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");
    if (state.role !== "assistant")
      throw new Error("Can only reload assistant messages");

    this._threadBinding.getState().startRun(state.parentId);
  }

  public speak() {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    return this._threadBinding.getState().speak(state.id);
  }

  public submitFeedback({ type }: { type: "positive" | "negative" }) {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    this._threadBinding.getState().submitFeedback({
      messageId: state.id,
      type,
    });
  }

  public switchToBranch({
    position,
    branchId,
  }: {
    position?: "previous" | "next" | undefined;
    branchId?: string | undefined;
  }) {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    if (branchId && position) {
      throw new Error("May not specify both branchId and position");
    } else if (!branchId && !position) {
      throw new Error("Must specify either branchId or position");
    }

    const thread = this._threadBinding.getState();
    const branches = thread.getBranches(state.id);
    let targetBranch = branchId;
    if (position === "previous") {
      targetBranch = branches[state.branchNumber - 2];
    } else if (position === "next") {
      targetBranch = branches[state.branchNumber];
    }
    if (!targetBranch) throw new Error("Branch not found");

    this._threadBinding.getState().switchToBranch(targetBranch);
  }

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }

  public unstable_getContentPartByIndex(idx: number) {
    if (idx < 0) throw new Error("Message index must be >= 0");
    return new ContentPartRuntime(
      new ShallowMemoizeSubject({
        getState: () => {
          return getContentPartState(this.getState(), idx);
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
      this._threadBinding,
    );
  }

  public unstable_getAttachmentByIndex(idx: number) {
    return new MessageAttachmentRuntime(
      new ShallowMemoizeSubject({
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments?.[idx];
          if (!attachment) return SKIP_UPDATE;

          return {
            ...attachment,
            attachment: attachment,
            source: "message",
          } satisfies AttachmentState & { source: "message" };
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
    );
  }
}
