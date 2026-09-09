import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud, AssistantCloudEvent } from "assistant-cloud";

type ResolveRemoteMessageId = (
  threadId: string,
  messageId: string,
) => string | undefined;

export class CloudEngagementReporter {
  private runStartedAt = new Map<string, number>();
  private stoppedRuns = new Set<string>();
  private shownErrors = new Set<string>();
  private reportedApprovals = new Set<string>();

  private readonly cloud: AssistantCloud;
  private readonly resolveRemoteMessageId: ResolveRemoteMessageId;

  constructor(
    cloud: AssistantCloud,
    resolveRemoteMessageId: ResolveRemoteMessageId,
  ) {
    this.cloud = cloud;
    this.resolveRemoteMessageId = resolveRemoteMessageId;
  }

  public messageSent(threadId: string, messages: UIMessage[]): void {
    const message = getLastMessage(messages, "user");
    this.runStartedAt.set(threadId, Date.now());
    this.stoppedRuns.delete(threadId);
    this.shownErrors.delete(threadId);
    if (!message) return;

    this.track({
      kind: "message_sent",
      thread_id: threadId,
      ...withMessageId(threadId, message.id, this.resolveRemoteMessageId),
      props: {
        chars: countTextCharacters(message),
        attachments: countAttachments(message),
      },
    });
  }

  public runStopped(threadId: string): void {
    if (this.stoppedRuns.has(threadId)) return;
    this.stoppedRuns.add(threadId);
    const startedAt = this.runStartedAt.get(threadId);
    this.runStartedAt.delete(threadId);
    this.track({
      kind: "run_stopped",
      thread_id: threadId,
      ...(startedAt !== undefined
        ? { value: Math.max(0, Date.now() - startedAt) }
        : undefined),
    });
  }

  public messageRegenerated(threadId: string, messages: UIMessage[]): void {
    const message = getLastMessage(messages, "assistant");
    this.runStartedAt.set(threadId, Date.now());
    this.stoppedRuns.delete(threadId);
    this.shownErrors.delete(threadId);
    this.track({
      kind: "message_regenerated",
      thread_id: threadId,
      ...(message
        ? withMessageId(threadId, message.id, this.resolveRemoteMessageId)
        : undefined),
    });
  }

  public toolApprovalResponded(
    threadId: string,
    messages: UIMessage[],
    decision: { id: string; approved: boolean },
  ): void {
    // Reports the decision the SDK recorded: it only answers gates on the last
    // message, keeps the first answer, and ignores repeats.
    const message = messages.at(-1);
    if (
      !message ||
      this.reportedApprovals.has(decision.id) ||
      !message.parts.some(
        (part) =>
          "approval" in part &&
          part.approval?.id === decision.id &&
          part.approval.approved === decision.approved,
      )
    ) {
      return;
    }
    this.reportedApprovals.add(decision.id);
    this.track({
      kind: decision.approved ? "tool_approved" : "tool_rejected",
      thread_id: threadId,
      ...withMessageId(threadId, message.id, this.resolveRemoteMessageId),
    });
  }

  public errorShown(threadId: string, messages: UIMessage[]): void {
    if (this.shownErrors.has(threadId)) return;
    this.shownErrors.add(threadId);
    const message = getLastMessage(messages, "assistant");
    this.track({
      kind: "error_shown",
      thread_id: threadId,
      ...(message
        ? withMessageId(threadId, message.id, this.resolveRemoteMessageId)
        : undefined),
      props: { reason: "error" },
    });
  }

  private track(event: AssistantCloudEvent): void {
    this.cloud.events?.track(event);
  }
}

const getLastMessage = (
  messages: UIMessage[],
  role: UIMessage["role"],
): UIMessage | undefined =>
  messages.findLast((message) => message.role === role);

const withMessageId = (
  threadId: string,
  messageId: string,
  resolveRemoteMessageId: ResolveRemoteMessageId,
): Pick<AssistantCloudEvent, "message_id"> => {
  const remoteMessageId = resolveRemoteMessageId(threadId, messageId);
  return remoteMessageId ? { message_id: remoteMessageId } : {};
};

const countTextCharacters = (message: UIMessage): number =>
  message.parts.reduce(
    (count, part) => count + (part.type === "text" ? part.text.length : 0),
    0,
  );

const countAttachments = (message: UIMessage): number =>
  message.parts.filter((part) => part.type === "file").length;
