import { toContentPartStatus } from "../context/providers/ContentPartProvider";
import { ThreadMessage, AppendMessage } from "../types";
import { ContentPartRuntime } from "./ContentPartRuntime";
import { ThreadRuntimeCoreBinding } from "./ThreadRuntime";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SubscribableWithState } from "./subscribable/Subscribable";

export type MessageSnapshot = {
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

export type MessageSnapshotBinding = SubscribableWithState<MessageSnapshot>;

type MessageState = ThreadMessage &
  MessageSnapshot & {
    /**
     * @deprecated You can directly access message fields in the state. Replace `.message.content` with `.content` etc. This will be removed in 0.6.0.
     */
    message: ThreadMessage;
  };

const MessageState = class {
  constructor(private snapshot: MessageSnapshot) {}

  /**
   * @deprecated Replace `.message.content` with `.content` etc. This will be removed in 0.6.0.
   */
  get message() {
    return this.snapshot.message;
  }

  get id() {
    return this.snapshot.message.id;
  }

  get createdAt() {
    return this.snapshot.message.createdAt;
  }

  get role() {
    return this.snapshot.message.role;
  }

  get content() {
    return this.snapshot.message.content;
  }

  get attachments() {
    return this.snapshot.message.attachments;
  }

  get metadata() {
    return this.snapshot.message.metadata;
  }

  get status() {
    return this.snapshot.message.status;
  }

  get parentId() {
    return this.snapshot.parentId;
  }

  get isLast() {
    return this.snapshot.isLast;
  }

  get branches() {
    return this.snapshot.branches;
  }

  get branchNumber() {
    return this.snapshot.branchNumber;
  }

  get branchCount() {
    return this.snapshot.branchCount;
  }
} as new (snapshot: MessageSnapshot) => MessageState;

export class MessageRuntime {
  constructor(
    private _core: MessageSnapshotBinding,
    private _threadBinding: ThreadRuntimeCoreBinding,
  ) {}

  public getState() {
    return new MessageState(this._core.getState());
  }

  // TODO improve type
  public edit(message: Omit<AppendMessage, "parentId">) {
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

    this._threadBinding.getState().startRun(state.parentId);
  }

  public speak() {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    this._threadBinding.getState().speak(state.message.id);
  }

  public submitFeedback({ type }: { type: "positive" | "negative" }) {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    this._threadBinding.getState().submitFeedback({
      messageId: state.message.id,
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
    const branches = thread.getBranches(state.message.id);
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

  public getContentPartByIdx(idx: number) {
    if (idx < 0) throw new Error("Message index must be >= 0");
    return new ContentPartRuntime(
      new ShallowMemoizeSubject({
        getState: () => {
          const state = this.getState();
          if (!state) return undefined;

          const message = state.message;
          const part = message.content[idx];
          if (!part) return undefined;

          return {
            part,
            status: toContentPartStatus(message, idx, part),
          };
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
      this._threadBinding,
    );
  }
}
