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

type ThreadBindingWithState = ThreadRuntimeCoreBinding &
  Partial<Pick<ThreadRuntimeImpl["__internal_threadBinding"], "getStateState">>;

export class MessagePartRuntimeImpl implements MessagePartRuntime {
  public get path() {
    return this.contentBinding.path;
  }

  private contentBinding: MessagePartSnapshotBinding;
  private messageApi: MessageStateBinding | undefined;
  private threadApi: ThreadBindingWithState | undefined;
  private readonly interactionState: MessagePartState;
  private readonly interactionMessageId: string | undefined;
  private readonly interactionThreadId: string | undefined;
  private readonly interactionCore: ThreadRuntimeCore | undefined;

  constructor(
    contentBinding: MessagePartSnapshotBinding,
    messageApi?: MessageStateBinding,
    threadApi?: ThreadRuntimeCoreBinding,
  ) {
    this.contentBinding = contentBinding;
    this.messageApi = messageApi;
    this.threadApi = threadApi;
    this.interactionState = contentBinding.getState();
    this.interactionMessageId =
      this.interactionState.type === "tool-call"
        ? messageApi?.getState().id
        : undefined;
    this.interactionThreadId =
      this.interactionState.type === "tool-call"
        ? this.threadApi?.getStateState?.().threadId
        : undefined;
    this.interactionCore =
      this.interactionState.type === "tool-call"
        ? threadApi?.getState()
        : undefined;
    this.__internal_bindMethods();
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

  private getInteractionCore() {
    const core =
      this.interactionThreadId !== undefined &&
      this.threadApi?.getStateState?.().threadId === this.interactionThreadId
        ? this.threadApi.getState()
        : this.interactionCore;
    if (!core) throw new Error("Thread API is not available");
    return core;
  }

  public addToolResult(result: any | ToolResponse<any>) {
    const state = this.interactionState;

    if (state.type !== "tool-call")
      throw new Error("Tried to add tool result to non-tool message part");

    if (!this.messageApi)
      throw new Error(
        "Message API is not available. This is likely a bug in assistant-ui.",
      );
    if (!this.threadApi) throw new Error("Thread API is not available");

    const messageId = this.interactionMessageId;
    if (messageId === undefined) throw new Error("Message is not available");

    const toolName = state.toolName;
    const toolCallId = state.toolCallId;

    const response = ToolResponse.toResponse(result);
    this.getInteractionCore().addToolResult({
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
    const state = this.interactionState;

    if (state.type !== "tool-call")
      throw new Error("Tried to resume tool call on non-tool message part");

    if (!this.threadApi) throw new Error("Thread API is not available");

    this.getInteractionCore().resumeToolCall({
      toolCallId: state.toolCallId,
      payload,
    });
    void this.unstable_recordInteraction({
      type: "human-response",
      payload,
    }).catch(() => {});
  }

  public respondToToolApproval(response: ToolApprovalResponse): Promise<void> {
    const state = this.interactionState;

    if (state.type !== "tool-call")
      throw new Error(
        "Tried to respond to tool approval on non-tool message part",
      );

    if (!this.threadApi) throw new Error("Thread API is not available");

    const core = this.getInteractionCore();
    const part =
      this.interactionMessageId === undefined
        ? undefined
        : core
            .getMessageById(this.interactionMessageId)
            ?.message.content.find(
              (part) =>
                part.type === "tool-call" &&
                part.toolCallId === state.toolCallId,
            );
    const approval = part?.type === "tool-call" ? part.approval : undefined;
    if (
      !approval ||
      approval.approved !== undefined ||
      approval.resolution !== undefined
    )
      throw new Error("Tool call has no pending approval");

    return core.respondToToolApproval(
      resolveToolApprovalResponse(approval, response),
    );
  }

  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  public async unstable_recordInteraction(
    input: Unstable_ToolInteractionInput,
  ): Promise<void> {
    const state = this.interactionState;
    if (state.type !== "tool-call")
      throw new Error("Tried to record interaction on non-tool message part");

    const messageId = this.interactionMessageId;
    if (messageId === undefined) throw new Error("Message is not available");

    const core = this.getInteractionCore();
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
