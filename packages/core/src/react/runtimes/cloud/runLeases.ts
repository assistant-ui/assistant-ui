import { useEffect } from "react";
import type { AssistantClient } from "@assistant-ui/store";
import type { ThreadMessage } from "../../../types";
import { getMessageRunState } from "../../../store/message-run-state";
import type {
  AssistantCloudThreadHistoryAdapter,
  CloudRunWriter,
} from "./AssistantCloudThreadHistoryAdapter";

const CHECKPOINT_INTERVAL_MS = 20_000;
const POLL_MIN_MS = 2_000;
const POLL_MAX_MS = 10_000;
// Past the lease's expiry, so a lapsed run reads as stale on the next poll.
const POLL_EXPIRY_MARGIN_MS = 500;
// A runtime writes its settled message right after the run ends; the tracker closes the lease itself only when that write never comes.
const SETTLE_GRACE_MS = 3_000;

type TrackedRun = {
  writer: CloudRunWriter;
  messageId: string;
  /** The persistence key of the message: its id, or its format-native message's id. */
  key: string;
  parent: ThreadMessage | undefined;
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
 * tab that hides ends its runs as interrupted, and a run whose heartbeats
 * stop otherwise lapses after the server's TTL; either way the cloud reports
 * it stale. Runtimes keep writing the settled message as they do today; that
 * write lands on the same row and closes the lease. A lease the persistence
 * lost (stale, or resumed elsewhere) gets no more checkpoints.
 *
 * Runtimes that persist through `withFormat` (the AI SDK) are covered when a
 * thread message maps to exactly one format-native message; their stored run
 * state is not shown on load.
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
      if (adapter.servesFormattedMessages) return;
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
        .then(() => run.writer.write(message, run.parent))
        .catch((error: unknown) => {
          console.warn("[assistant-ui] Cloud run checkpoint failed:", error);
        });

    const settle = (run: TrackedRun) => {
      if (run.settleTimer !== undefined) return;
      const settled = findMessage(aui, run.messageId);
      if (settled && settled.status?.type !== "running")
        run.writer.noteSettled(settled);
      run.settleTimer = setTimeout(() => {
        if (!run.writer.hasOpenRun(run.key)) return;
        const message = findMessage(aui, run.messageId);
        if (message && message.status?.type !== "running") {
          void write(run, message);
        }
      }, SETTLE_GRACE_MS);
    };

    const check = () => {
      const writer = adapter.getRunWriter();
      if (!writer) return;
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
      const parent = branch.at(-2);
      if (tracked && tracked.messageId !== head?.id) {
        const from = tracked.messageId;
        // AG-UI replaces its placeholder with the backend's message once the reply starts, and may hang it under another parent when the agent's history skipped an empty message; the stored row keeps its place.
        if (
          head?.role === "assistant" &&
          head.status?.type === "running" &&
          tracked.settleTimer === undefined &&
          !branch.some((message) => message.id === from)
        ) {
          const toKey = tracked.writer.keyOf(head);
          if (toKey !== undefined) {
            const fromKey = tracked.key;
            const { writer } = tracked;
            tracked.messageId = head.id;
            tracked.key = toKey;
            if (toKey !== fromKey)
              tracked.stored = tracked.stored.then(() =>
                writer.rename(fromKey, toKey),
              );
            return;
          }
        }
        settle(tracked);
      }
      if (!head || head.role !== "assistant") return;
      if (head.status.type !== "running") {
        if (tracked?.messageId === head.id) settle(tracked);
        return;
      }
      if (tracked?.messageId === head.id) return;
      const key = writer.keyOf(head);
      // A formatted row is chained under its parent's row, so the store waits for the runtime to store the prompt.
      if (key === undefined || !writer.canStore(parent)) return;
      const run: TrackedRun = {
        writer,
        messageId: head.id,
        key,
        parent,
        checkpointed: head.content,
        settleTimer: undefined,
        stored: writer.write(head, parent).catch((error: unknown) => {
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
      if (!run || !run.writer.hasOpenRun(run.key)) return;
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
