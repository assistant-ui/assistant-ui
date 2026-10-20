import { useEffect } from "react";
import { CloudEngagementReporter } from "assistant-cloud";
import { type AssistantClient, getClientId } from "@assistant-ui/store";
import { runCleanups } from "../../../subscribable/subscribable";
import type { AssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";

type EngagementTracker = {
  mounted: Map<AssistantCloudThreadHistoryAdapter, AssistantClient>;
  lastMounted: AssistantCloudThreadHistoryAdapter;
  reporterScope: unknown;
  reporter: CloudEngagementReporter;
  host: AssistantClient | undefined;
  dispose: (() => void) | undefined;
};

const engagementTrackers = new WeakMap<
  getClientId.ClientId,
  EngagementTracker
>();

const mountedAdapter = (
  tracker: EngagementTracker,
  threadId?: string,
): AssistantCloudThreadHistoryAdapter => {
  let fallback: AssistantCloudThreadHistoryAdapter | undefined;
  for (const adapter of tracker.mounted.keys()) {
    if (threadId !== undefined && adapter.ownsThread(threadId)) return adapter;
    fallback ??= adapter;
  }
  return fallback ?? tracker.lastMounted;
};

const createEngagementTracker = (
  adapter: AssistantCloudThreadHistoryAdapter,
): EngagementTracker => {
  let tracker!: EngagementTracker;
  tracker = {
    mounted: new Map(),
    lastMounted: adapter,
    reporterScope: adapter.getScope(),
    reporter: new CloudEngagementReporter(
      () => mountedAdapter(tracker).getCloud(),
      (threadId, messageId, options) =>
        mountedAdapter(tracker, threadId).resolveEngagementEventIds(
          threadId,
          messageId,
          options,
        ),
    ),
    host: undefined,
    dispose: undefined,
  };
  return tracker;
};

const getEngagementReporter = (
  tracker: EngagementTracker,
  threadId?: string,
): CloudEngagementReporter => {
  const adapter = mountedAdapter(tracker, threadId);
  const scope = adapter.getScope();
  if (Object.is(tracker.reporterScope, scope)) return tracker.reporter;

  tracker.reporterScope = scope;
  tracker.reporter = new CloudEngagementReporter(
    () => mountedAdapter(tracker).getCloud(),
    (eventThreadId, messageId, options) =>
      mountedAdapter(tracker, eventThreadId).resolveEngagementEventIds(
        eventThreadId,
        messageId,
        options,
      ),
  );
  return tracker.reporter;
};

const subscribeEngagementEvents = (
  aui: AssistantClient,
  getReporter: (threadId?: string) => CloudEngagementReporter,
): (() => void) => {
  const reportSuggestions = () => {
    const { mainThreadId } = aui.threads.getState();
    const { isEmpty, suggestions } = aui.thread.getState();
    if (!isEmpty || suggestions.length === 0) return;
    getReporter(mainThreadId).suggestionsShown(
      mainThreadId,
      suggestions.length,
    );
  };

  const unsubscribers = [
    aui.on({ scope: "*", event: "threads.selectionChanged" }, (payload) => {
      getReporter(payload.threadId).threadSwitched(payload.threadId);
    }),
    aui.on({ scope: "*", event: "composer.send" }, (payload) => {
      const reporter = getReporter(payload.threadId);
      if (payload.messageId) {
        reporter.messageEdited(payload.threadId, {
          messageId: payload.messageId,
          chars: payload.chars,
        });
      } else {
        reporter.messageSent(payload.threadId, {
          chars: payload.chars,
          attachments: payload.attachments,
        });
      }
      if (payload.suggestion) {
        reporter.suggestionClicked(payload.threadId);
      }
    }),
    aui.on({ scope: "*", event: "composer.attachmentAdd" }, (payload) => {
      getReporter(payload.threadId).attachmentAdded(payload.threadId, {
        messageId: payload.messageId,
        contentType: payload.contentType,
      });
    }),
    aui.on({ scope: "*", event: "composer.attachmentAddError" }, (payload) => {
      getReporter(payload.threadId).attachmentFailed(payload.threadId, {
        messageId: payload.messageId,
        contentType: payload.contentType,
      });
    }),
    aui.on({ scope: "*", event: "composer.cancel" }, (payload) => {
      getReporter(payload.threadId).runStopped(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.runStart" }, (payload) => {
      getReporter(payload.threadId).runStarted(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.runEnd" }, (payload) => {
      getReporter(payload.threadId).runEnded(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.cancelRun" }, (payload) => {
      getReporter(payload.threadId).runStopped(payload.threadId);
    }),
    aui.on({ scope: "*", event: "thread.voiceStarted" }, (payload) => {
      getReporter(payload.threadId).voiceStarted(payload.threadId);
    }),
    aui.on({ scope: "*", event: "message.reload" }, (payload) => {
      getReporter(payload.threadId).messageRegenerated(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "message.branchSwitched" }, (payload) => {
      getReporter(payload.threadId).branchSwitched(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "message.copied" }, (payload) => {
      getReporter(payload.threadId).messageCopied(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "thread.toolApprovalAnswered" }, (payload) => {
      const reporter = getReporter(payload.threadId);
      if (payload.approved) {
        reporter.toolApproved(
          payload.threadId,
          payload.messageId,
          payload.toolCallId,
          payload.toolName,
        );
      } else {
        reporter.toolRejected(
          payload.threadId,
          payload.messageId,
          payload.toolCallId,
          payload.toolName,
        );
      }
    }),
    aui.on({ scope: "*", event: "message.speak" }, (payload) => {
      getReporter(payload.threadId).speechStarted(
        payload.threadId,
        payload.messageId,
      );
    }),
    aui.on({ scope: "*", event: "message.error" }, (payload) => {
      getReporter(payload.threadId).errorShown(payload.threadId, {
        messageId: payload.messageId,
        reason: payload.reason,
      });
    }),
    aui.subscribe(reportSuggestions),
  ];

  reportSuggestions();
  return () => runCleanups(unsubscribers);
};

const installEngagementEvents = (
  tracker: EngagementTracker,
  host: AssistantClient,
) => {
  tracker.host = host;
  tracker.dispose = subscribeEngagementEvents(host, (threadId) =>
    getEngagementReporter(tracker, threadId),
  );
};

const uninstallEngagementEvents = (tracker: EngagementTracker) => {
  const dispose = tracker.dispose;
  tracker.host = undefined;
  tracker.dispose = undefined;
  dispose?.();
};

/**
 * The client delivers an event to every listener once per emission, and a
 * thread runtime, with this adapter inside it, mounts once per visited
 * thread. One subscription set per thread list therefore reports each event
 * once, attributed by the thread id the event carries, and the reporter that
 * keeps run timing per thread lives as long as the list. The subscriptions
 * ride on one mounted thread's client, because a thread's own client stops
 * forwarding state notifications once its runtime unmounts, so they move to
 * another mounted thread when their host leaves.
 */
export const useAssistantCloudEngagementEvents = (
  adapter: AssistantCloudThreadHistoryAdapter,
  aui: AssistantClient,
) => {
  useEffect(() => {
    const key = getClientId(aui.threads);
    let tracker = engagementTrackers.get(key);
    if (!tracker) {
      tracker = createEngagementTracker(adapter);
      engagementTrackers.set(key, tracker);
    }
    const active = tracker;
    active.mounted.set(adapter, aui);
    active.lastMounted = adapter;
    if (active.host === undefined) installEngagementEvents(active, aui);
    return () => {
      active.mounted.delete(adapter);
      if (active.host !== aui) return;
      uninstallEngagementEvents(active);
      const next = active.mounted.values().next();
      if (!next.done) installEngagementEvents(active, next.value);
    };
  }, [adapter, aui]);
};
