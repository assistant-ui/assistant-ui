import { toContentPartStatus } from "../context/providers/ContentPartProvider";
import { ThreadMessage, AppendMessage } from "../types";
import { ComposerRuntime } from "./ComposerRuntime";
import { ContentPartRuntime } from "./ContentPartRuntime";
import { ThreadRuntimeCoreBinding } from "./ThreadRuntime";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SubscribableWithState } from "./subscribable/Subscribable";

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

export type MessageSnapshotBinding = SubscribableWithState<MessageState>;

export class MessageRuntime {
  constructor(
    private _core: MessageSnapshotBinding,
    private _threadBinding: ThreadRuntimeCoreBinding,
  ) {}

  public composer = new ComposerRuntime(
    new NestedSubscriptionSubject({
      getState: () =>
        this._threadBinding
          .getState()
          .getEditComposer(this._core.getState().id),
      subscribe: (callback) => this._threadBinding.subscribe(callback),
    }),
    () => this._threadBinding.getState().beginEdit(this._core.getState().id),
  ) as ComposerRuntime & { type: "edit" };

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

    this._threadBinding.getState().startRun(state.parentId);
  }

  public speak() {
    const state = this._core.getState();
    if (!state) throw new Error("Message is not available");

    this._threadBinding.getState().speak(state.id);
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
