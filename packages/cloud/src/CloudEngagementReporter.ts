import type { AssistantCloud } from "./AssistantCloud";
import type {
  AssistantCloudEvent,
  AssistantCloudEventKind,
} from "./AssistantCloudEvents";

export type EngagementEventIds = Pick<
  AssistantCloudEvent,
  "thread_id" | "message_id" | "run_id"
>;

/**
 * Turns the ids an integration knows (its own thread and message ids) into the
 * ids the cloud stores. A send is the one event that may create the remote
 * thread, so it asks for `awaitThread`; every other event reads the ids that
 * already exist.
 */
export type EngagementIdResolver = (
  threadId: string,
  messageId: string | undefined,
  options: { awaitThread: boolean },
) => EngagementEventIds | Promise<EngagementEventIds>;

type EngagementEventInit = Pick<AssistantCloudEvent, "value" | "props">;

const MAX_REMEMBERED_THREADS = 256;

function remember<T>(map: Map<string, T>, threadId: string, value: T): void {
  map.delete(threadId);
  map.set(threadId, value);
  if (map.size > MAX_REMEMBERED_THREADS) {
    map.delete(map.keys().next().value!);
  }
}

function mark(set: Set<string>, threadId: string): void {
  set.delete(threadId);
  set.add(threadId);
  if (set.size > MAX_REMEMBERED_THREADS) {
    set.delete(set.values().next().value!);
  }
}

const passThroughIds: EngagementIdResolver = (threadId, messageId) => ({
  thread_id: threadId,
  ...(messageId !== undefined ? { message_id: messageId } : undefined),
});

/**
 * Derives engagement events from what a chat integration observes and keeps
 * the per thread state the events need: a run's start for the stop duration,
 * a run's end for the time to the next message, one error and one suggestion
 * list per run or thread. A started run is kept until it ends or stops; the
 * rest is kept for the 256 most recently touched threads, so a long session
 * does not grow it without bound. Delivery goes through the cloud's event
 * buffer, so a disabled telemetry setting drops everything here as well.
 */
export class CloudEngagementReporter {
  private readonly runStartedAt = new Map<string, number>();
  private readonly runEndedAt = new Map<string, number>();
  private readonly shownErrors = new Set<string>();
  private readonly shownSuggestions = new Set<string>();
  private readonly reportedApprovals = new Set<string>();

  private readonly getCloud: () => AssistantCloud;
  private readonly resolveIds: EngagementIdResolver;

  constructor(
    cloud: AssistantCloud | (() => AssistantCloud),
    resolveIds: EngagementIdResolver = passThroughIds,
  ) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
    this.resolveIds = resolveIds;
  }

  public runStarted(threadId: string): void {
    this.runStartedAt.set(threadId, Date.now());
    this.shownErrors.delete(threadId);
  }

  public runEnded(threadId: string): void {
    this.runStartedAt.delete(threadId);
    remember(this.runEndedAt, threadId, Date.now());
  }

  /** Reported once per started run, with the time the run had been going. */
  public runStopped(threadId: string): void {
    const startedAt = this.runStartedAt.get(threadId);
    if (startedAt === undefined) return;
    this.runStartedAt.delete(threadId);
    this.track("run_stopped", threadId, undefined, {
      value: Math.max(0, Date.now() - startedAt),
    });
  }

  /** Carries the time since the previous run of the thread ended, when known. */
  public messageSent(
    threadId: string,
    init: {
      messageId?: string | undefined;
      chars: number;
      attachments: number;
    },
  ): void {
    const previousRunEndedAt = this.runEndedAt.get(threadId);
    this.track(
      "message_sent",
      threadId,
      init.messageId,
      {
        props: { chars: init.chars, attachments: init.attachments },
        ...(previousRunEndedAt !== undefined
          ? { value: Math.max(0, Date.now() - previousRunEndedAt) }
          : undefined),
      },
      { awaitThread: true },
    );
  }

  public messageEdited(
    threadId: string,
    init: { messageId: string; chars: number },
  ): void {
    this.track("message_edited", threadId, init.messageId, {
      props: { chars: init.chars },
    });
  }

  public messageRegenerated(threadId: string, messageId?: string): void {
    this.track("message_regenerated", threadId, messageId);
  }

  /** Reported once per run, so a retried render of the same error stays one event. */
  public errorShown(
    threadId: string,
    init: { messageId?: string | undefined; reason: string },
  ): void {
    if (this.shownErrors.has(threadId)) return;
    mark(this.shownErrors, threadId);
    this.track("error_shown", threadId, init.messageId, {
      props: { reason: init.reason },
    });
  }

  /** Reported once per thread, with the number of suggestions on offer. */
  public suggestionsShown(threadId: string, count: number): void {
    if (this.shownSuggestions.has(threadId)) return;
    mark(this.shownSuggestions, threadId);
    this.track("suggestions_shown", threadId, undefined, { value: count });
  }

  public suggestionClicked(threadId: string): void {
    this.track("suggestion_clicked", threadId);
  }

  public attachmentAdded(
    threadId: string,
    init: { messageId?: string | undefined; contentType?: string | undefined },
  ): void {
    this.track("attachment_added", threadId, init.messageId, {
      ...(init.contentType ? { props: { type: init.contentType } } : undefined),
    });
  }

  public attachmentFailed(
    threadId: string,
    init: { messageId?: string | undefined; contentType?: string | undefined },
  ): void {
    this.track("attachment_failed", threadId, init.messageId, {
      ...(init.contentType ? { props: { type: init.contentType } } : undefined),
    });
  }

  public voiceStarted(threadId: string): void {
    this.track("voice_started", threadId);
  }

  public speechStarted(threadId: string, messageId?: string): void {
    this.track("speech_started", threadId, messageId);
  }

  public branchSwitched(threadId: string, messageId?: string): void {
    this.track("branch_switched", threadId, messageId);
  }

  public messageCopied(threadId: string, messageId?: string): void {
    this.track("message_copied", threadId, messageId);
  }

  /**
   * Reported once per approval gate. An integration may observe the same
   * accepted decision more than once (a runtime that records it
   * asynchronously accepts a repeat before its state settles), so the first
   * report of a thread's approval id wins.
   */
  public toolApprovalResponded(
    threadId: string,
    init: {
      messageId?: string | undefined;
      approvalId: string;
      approved: boolean;
    },
  ): void {
    const approvalKey = `${threadId}:${init.approvalId}`;
    if (this.reportedApprovals.has(approvalKey)) return;
    mark(this.reportedApprovals, approvalKey);
    this.track(
      init.approved ? "tool_approved" : "tool_rejected",
      threadId,
      init.messageId,
    );
  }

  /** Reported only for a thread the cloud already knows. */
  public threadSwitched(threadId: string): void {
    this.track("thread_switched", threadId);
  }

  private track(
    kind: AssistantCloudEventKind,
    threadId: string,
    messageId?: string,
    init: EngagementEventInit = {},
    options: { awaitThread: boolean } = { awaitThread: false },
  ): void {
    void Promise.resolve()
      .then(() => this.resolveIds(threadId, messageId, options))
      .then((ids) => {
        if (kind === "thread_switched" && !ids.thread_id) return;
        this.getCloud().events.track({ kind, ...init, ...ids });
      })
      .catch(() => {});
  }
}
