import type {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  ToolApprovalResponse,
  ToolCallMessagePartStatus,
  Unstable_ToolInteractionInput,
} from "../../types/message";
import { resolveToolApprovalResponse } from "../utils/resolveToolApprovalResponse";
import { createToolInteraction } from "../utils/tool-interactions";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { MessagePartStatus } from "../../types/message";
import type { SubscribableWithState } from "../../subscribable/subscribable";
import type {
  ThreadRuntimeCoreBinding,
  ThreadRuntimeImpl,
} from "./thread-runtime";
import type { MessageStateBinding } from "./bindings";
import type { MessagePartRuntimePath } from "./paths";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
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
  respondToToolApproval(response: ToolApprovalResponse): Promise<void>;
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_recordInteraction?: (
    input: Unstable_ToolInteractionInput,
  ) => Promise<void>;

  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe;
};

export class MessagePartRuntimeImpl implements MessagePartRuntime {
  public get path() {
    return this.contentBinding.path;
  }

  private contentBinding: MessagePartSnapshotBinding;
  private threadApi: ThreadRuntimeImpl["__internal_threadBinding"] | undefined;

  /**
   * The tool call this part runtime was created for, captured at construction.
   * A tool UI may retain a part runtime past a thread switch, a branch switch,
   * or a reload; resolving the target at call time would then address whatever
   * part now sits at the same position (the bug #9386 describes). Callers that
   * resolve through {@link resolveTarget} send their payload to the captured
   * tool call while it still exists on the current thread, and to the captured
   * thread's core otherwise — the same policy `unstable_recordInteraction`
   * follows (see #9340).
   */
  private readonly capturedState: MessagePartState;
  private readonly capturedThreadId: string | undefined;
  private readonly capturedMessageId: string | undefined;
  private readonly capturedCore: ThreadRuntimeCore | undefined;

  constructor(
    contentBinding: MessagePartSnapshotBinding,
    messageApi?: MessageStateBinding,
    threadApi?: ThreadRuntimeCoreBinding,
  ) {
    this.contentBinding = contentBinding;
    this.threadApi = threadApi as
      | ThreadRuntimeImpl["__internal_threadBinding"]
      | undefined;
    const state = contentBinding.getState();
    if (!state) throw new Error("Message part is not available");
    this.capturedState = state;
    if (state.type === "tool-call") {
      this.capturedMessageId = messageApi?.getState().id;
      // Not every binding carries the thread state (plain core bindings do
      // not); without it there is nothing to compare against at call time,
      // so the live core stays the target.
      this.capturedThreadId = this.#liveThreadId();
      this.capturedCore =
        typeof threadApi?.getState === "function"
          ? threadApi.getState()
          : undefined;
    }
    this.__internal_bindMethods();
  }

  /**
   * Resolve the tool call, message id, and thread core a tool-call-facing
   * operation should address: the captured identity from construction, with
   * the live core while it still hosts the captured thread and the captured
   * core once the runtime has moved on (thread switch, branch switch, reload).
   * `action` completes the non-tool error, preserving each method's original
   * message.
   */
  private resolveTarget(action: string): {
    state: MessagePartState & { type: "tool-call" };
    messageId: string;
    core: ThreadRuntimeCore;
  } {
    const state = this.capturedState;
    if (state.type !== "tool-call")
      throw new Error(`Tried to ${action} non-tool message part`);

    const messageId = this.capturedMessageId;
    if (messageId === undefined) throw new Error("Message is not available");

    const liveThreadId = this.#liveThreadId();
    const core =
      liveThreadId === this.capturedThreadId
        ? this.threadApi?.getState()
        : this.capturedCore;
    if (!core) throw new Error("Thread API is not available");

    return { state, messageId, core };
  }

  /**
   * The live thread id from the binding's thread state, or `undefined` when
   * the binding does not carry one (plain core bindings) — in which case the
   * live core stays the target because there is nothing to compare against.
   */
  #liveThreadId(): string | undefined {
    const binding = this.threadApi;
    if (!binding) return undefined;
    if (!("getStateState" in binding)) return undefined;
    if (typeof binding.getStateState !== "function") return undefined;
    return binding.getStateState().threadId;
  }

  protected __internal_bindMethods() {
    this.addToolResult = this.addToolResult.bind(this);
    this.resumeToolCall = this.resumeToolCall.bind(this);
    this.respondToToolApproval = this.respondToToolApproval.bind(this);
    this.unstable_recordInteraction =
      this.unstable_recordInteraction.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  public getState() {
    return this.contentBinding.getState();
  }

  public addToolResult(result: any | ToolResponse<any>) {
    const { state, messageId, core } = this.resolveTarget(
      "add tool result to a",
    );

    const toolName = state.toolName;
    const toolCallId = state.toolCallId;

    const response = ToolResponse.toResponse(result);
    core.addToolResult({
      messageId,
      toolName,
      toolCallId,
      result: response.result,
      isError: response.isError,
      ...(response.artifact !== undefined && { artifact: response.artifact }),
      ...(response.modelContent !== undefined && {
        modelContent: response.modelContent,
      }),
    });
  }

  public resumeToolCall(payload: unknown) {
    const { state, core } = this.resolveTarget("resume tool call on a");

    const toolCallId = state.toolCallId;
    core.resumeToolCall({
      toolCallId,
      payload,
    });
    void this.unstable_recordInteraction({
      type: "human-response",
      payload,
    }).catch(() => {});
  }

  public respondToToolApproval(response: ToolApprovalResponse): Promise<void> {
    const { state, core } = this.resolveTarget("respond to tool approval on a");

    if (
      !state.approval ||
      state.approval.approved !== undefined ||
      state.approval.resolution !== undefined
    )
      throw new Error("Tool call has no pending approval");

    return core.respondToToolApproval(
      resolveToolApprovalResponse(state.approval, response),
    );
  }

  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  public async unstable_recordInteraction(
    input: Unstable_ToolInteractionInput,
  ): Promise<void> {
    const { state, messageId, core } = this.resolveTarget(
      "record interaction on",
    );

    if (!core.unstable_recordToolInteraction)
      throw new Error("Runtime does not support recording tool interactions.");

    await core.unstable_recordToolInteraction({
      messageId,
      toolCallId: state.toolCallId,
      interaction: createToolInteraction(input),
    });
  }

  public subscribe(callback: () => void) {
    return this.contentBinding.subscribe(callback);
  }
}
