import { useEffect } from "react";
import type { AssistantClient } from "@assistant-ui/store";
import type { ThreadMessage } from "../../../types";
import { getMessageRunState } from "../../../store/message-run-state";
import type { AssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";

const CHECKPOINT_INTERVAL_MS = 20_000;
const POLL_MIN_MS = 2_000;
const POLL_MAX_MS = 10_000;
// Past the lease's expiry, so a lapsed run reads as stale on the next poll.
const POLL_EXPIRY_MARGIN_MS = 500;
// A runtime writes its settled message right after the run ends; the tracker closes the lease itself only when that write never comes.
const SETTLE_GRACE_MS = 3_000;

type TrackedRun = {
  messageId: string;
  parentId: string | null;
  stored: Promise<void>;
  checkpointed: ThreadMessage["content"];
  settleTimer: ReturnType<typeof setTimeout> | undefined;
};

// The adapter hook runs once per mounted thread runtime while its client's `thread` is the main thread, so each tracker follows its own item's thread runtime.
const getOwnThread = (aui: AssistantClient) => {
  try {
    if (!aui.threadListItem.source) return undefined;
    const { id } = aui.threadListItem.getState();
    return aui.threads.__internal_getAssistantRuntime?.()?.threads.getById(id);
  } catch {
    return undefined;
  }
};

const readBranch = (aui: AssistantClient): readonly ThreadMessage[] => {
  try {
    return getOwnThread(aui)?.getState().messages ?? [];
  } catch {
    return [];
  }
};

const pollDelay = (message: ThreadMessage) => {
  const error = (message.status as { error?: { expires_in_ms?: unknown } })
    .error;
  const expiresInMs =
    typeof error?.expires_in_ms === "number" ? error.expires_in_ms : 0;
  return Math.min(
    POLL_MAX_MS,
    Math.max(POLL_MIN_MS, expiresInMs + POLL_EXPIRY_MARGIN_MS),
  );
};

// Keyed by thread list item id, so a message's Refresh button reaches the tracker of the thread that renders it.
const refreshers = new Map<string, () => Promise<void>>();

/** Re-reads a thread whose run another session drives; resolves when the thread shows the stored state. */
export const refreshCloudRun = (threadItemId: string): Promise<void> =>
  refreshers.get(threadItemId)?.() ?? Promise.resolve();

const findMessage = (
  aui: AssistantClient,
  messageId: string,
): ThreadMessage | undefined =>
  readBranch(aui).find((message) => message.id === messageId);

/**
 * Stores a thread's running assistant message as soon as the run starts, so
 * the cloud holds a run lease the persistence keeps alive with heartbeats. A
 * run whose tab closes stops heartbeating and the cloud reports it stale.
 * Runtimes keep writing the settled message as they do today; that write
 * lands on the same row and closes the lease.
 */
export const useCloudRunLeases = (
  adapter: AssistantCloudThreadHistoryAdapter,
  aui: AssistantClient,
) => {
  useEffect(() => {
    let tracked: TrackedRun | undefined;
    let poll:
      | {
          messageId: string;
          timer: ReturnType<typeof setTimeout>;
        }
      | undefined;
    let polledUpdatedAt: number | undefined;
    let disposed = false;

    const refresh = async () => {
      const thread = getOwnThread(aui);
      if (!thread || thread.getState().isRunning) return;
      const repository = await adapter.load();
      if (disposed) return;
      const current = getOwnThread(aui);
      if (!current || current.getState().isRunning) return;
      polledUpdatedAt = undefined;
      current.import(repository);
    };

    const watchRemoteRun = (message: ThreadMessage) => {
      if (poll) return;
      const messageId = message.id;
      poll = {
        messageId,
        timer: setTimeout(() => {
          void (async () => {
            const state = await adapter
              .readRunState(messageId)
              .catch(() => null);
            if (disposed) return;
            if (state === null) {
              poll = undefined;
              check();
              return;
            }
            const unchanged =
              state?.run?.status === "running" &&
              (polledUpdatedAt === undefined ||
                polledUpdatedAt === state.updatedAt);
            if (state) polledUpdatedAt = state.updatedAt;
            if (!unchanged) await refresh().catch(() => undefined);
            poll = undefined;
            check();
          })();
        }, pollDelay(message)),
      };
    };

    const write = (run: TrackedRun, message: ThreadMessage) =>
      run.stored
        .then(() => adapter.update({ parentId: run.parentId, message }))
        .catch((error: unknown) => {
          console.warn("[assistant-ui] Cloud run checkpoint failed:", error);
        });

    const settle = (run: TrackedRun) => {
      if (run.settleTimer !== undefined) return;
      run.settleTimer = setTimeout(() => {
        if (!adapter.hasOpenRun(run.messageId)) return;
        const message = findMessage(aui, run.messageId);
        if (message && message.status?.type !== "running") {
          void write(run, message);
        }
      }, SETTLE_GRACE_MS);
    };

    const check = () => {
      if (!adapter.servesThreadMessages || adapter.servesFormattedMessages)
        return;
      const branch = readBranch(aui);
      const head = branch.at(-1);
      const remoteRun = branch.find(
        (message) => getMessageRunState(message) === "in-progress",
      );
      if (remoteRun) watchRemoteRun(remoteRun);
      else if (poll) {
        clearTimeout(poll.timer);
        poll = undefined;
      }
      const parentId = branch.at(-2)?.id ?? null;
      if (tracked && tracked.messageId !== head?.id) {
        const from = tracked.messageId;
        // AG-UI replaces its placeholder with the backend's message once the reply starts, and may hang it under another parent when the agent's history skipped an empty message; the stored row keeps its place.
        if (
          head?.role === "assistant" &&
          head.status?.type === "running" &&
          tracked.settleTimer === undefined &&
          !branch.some((message) => message.id === from)
        ) {
          const to = head.id;
          tracked.messageId = to;
          tracked.stored = tracked.stored.then(() =>
            adapter.renameRun(from, to),
          );
          return;
        }
        settle(tracked);
      }
      if (!head || head.role !== "assistant") return;
      if (head.status.type !== "running") {
        if (tracked?.messageId === head.id) settle(tracked);
        return;
      }
      if (tracked?.messageId === head.id) return;
      const run: TrackedRun = {
        messageId: head.id,
        parentId,
        checkpointed: head.content,
        settleTimer: undefined,
        stored: adapter
          .append({ parentId, message: head })
          .catch((error: unknown) => {
            console.warn(
              "[assistant-ui] Could not store the running message:",
              error,
            );
          }),
      };
      tracked = run;
    };

    const checkpoint = setInterval(() => {
      const run = tracked;
      if (!run || !adapter.hasOpenRun(run.messageId)) return;
      const message = findMessage(aui, run.messageId);
      if (!message || message.status?.type !== "running") return;
      if (message.content === run.checkpointed) return;
      run.checkpointed = message.content;
      void write(run, message);
    }, CHECKPOINT_INTERVAL_MS);

    const thread = getOwnThread(aui);
    if (!thread) {
      clearInterval(checkpoint);
      return;
    }
    const threadItemId = aui.threadListItem.getState().id;
    refreshers.set(threadItemId, refresh);
    const unsubscribe = thread.subscribe(check);
    check();
    return () => {
      disposed = true;
      if (refreshers.get(threadItemId) === refresh)
        refreshers.delete(threadItemId);
      if (poll) clearTimeout(poll.timer);
      unsubscribe();
      clearInterval(checkpoint);
      if (tracked?.settleTimer !== undefined) clearTimeout(tracked.settleTimer);
    };
  }, [adapter, aui]);
};
