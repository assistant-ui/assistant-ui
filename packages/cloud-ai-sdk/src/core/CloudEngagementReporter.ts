import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud, AssistantCloudEvent } from "assistant-cloud";

type ResolveRemoteMessageId = (
  threadId: string,
  messageId: string,
) => string | undefined;

export class CloudEngagementReporter {
  private runStartedAt = new Map<string, number>();
  private stoppedRuns = new Set<string>();
  private regeneratingThreads = new Set<string>();
  private shownErrors = new Set<string>();

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
    if (this.regeneratingThreads.delete(threadId) || !message) return;

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
    this.regeneratingThreads.add(threadId);
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
