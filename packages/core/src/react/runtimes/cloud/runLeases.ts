import { useEffect } from "react";
import type { AssistantClient } from "@assistant-ui/store";
import type { ThreadMessage } from "../../../types";
import { getMessageRunState } from "../../../store/message-run-state";
import {
  type AssistantCloudThreadHistoryAdapter,
  type CloudRunWriter,
  isEmptyReply,
} from "./AssistantCloudThreadHistoryAdapter";
import {
  setThreadReplyState,
  type ThreadReplyState,
} from "../../../store/thread-reply-state";

const CHECKPOINT_INTERVAL_MS = 20_000;
const POLL_MIN_MS = 2_000;
const POLL_MAX_MS = 10_000;
// Past the moment the run would read as stale, so a quiet run turns stale on the next poll.
const POLL_STALE_MARGIN_MS = 500;
// A runtime writes its settled message right after the run ends; the tracker closes the lease itself only when that write never comes.
const SETTLE_GRACE_MS = 3_000;

type TrackedRun = {
  writer: CloudRunWriter;
  messageId: string;
  /** The persistence key of the message: its id, or its format-native message's id. */
  key: string;
  parent: ThreadMessage | undefined;
  /** Settles once the run's lease is opened and its writes so far landed. */
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

// Around the moment the run would cross staleAfter, and at least every POLL_MAX_MS while it is in progress.
const pollDelay = (message: ThreadMessage) => {
  const error = (message.status as { error?: { stale_in_ms?: unknown } }).error;
  const staleInMs =
    typeof error?.stale_in_ms === "number" ? error.stale_in_ms : 0;
  return Math.min(
    POLL_MAX_MS,
    Math.max(POLL_MIN_MS, staleInMs + POLL_STALE_MARGIN_MS),
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
 * Opens the thread's run lease as soon as a run starts, which the
 * persistence heartbeats, also while the tab is in the background; nothing
 * is stored yet. Checkpoints every 20 s store the reply once it has content
 * and update it after, and the runtime's own settled write lands on the same
 * row and ends the lease. A run that dies before its first write leaves no
 * message. A lease the persistence lost (ended elsewhere, or superseded by a
 * newer run) gets no more writes.
 *
 * Other tabs read the lease: a reply already stored shows as in progress, or
 * as an ordinary interrupted reply once its run went `staleAfter` without a
 * beat. A thread whose last message is the user's reads `in-progress` while
 * a fresh lease answers it, and `interrupted` once none does
 * (`useThreadReplyState`).
 *
 * Runtimes that persist through `withFormat` (the AI SDK) are covered when a
 * thread message maps to exactly one format-native message; their runtime
 * shows the loaded run state and re-reads the thread on refresh.
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
      // A formatted thread's messages live in its runtime, which re-reads them itself.
      if (await adapter.reloadFormatted()) {
        polledUpdatedAt = undefined;
        return;
      }
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
              state?.state?.status === "in-progress" &&
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

    let replyTimer: ReturnType<typeof setTimeout> | undefined;
    const threadItemId = aui.threadListItem.source
      ? aui.threadListItem.getState().id
      : undefined;

    const watchThreadRun = (head: ThreadMessage, staleInMs: number) => {
      if (poll) return;
      poll = {
        messageId: head.id,
        timer: setTimeout(
          () => {
            void (async () => {
              const changed = await adapter
                .readThreadRun(head)
                .catch(() => false);
              if (disposed) return;
              if (changed) await refresh().catch(() => undefined);
              poll = undefined;
              check();
            })();
          },
          Math.min(
            POLL_MAX_MS,
            Math.max(POLL_MIN_MS, staleInMs + POLL_STALE_MARGIN_MS),
          ),
        ),
      };
    };

    // The run answering the last message, when no reply on the branch shows it.
    const updateReplyState = (
      writer: CloudRunWriter | undefined,
      branch: readonly ThreadMessage[],
    ) => {
      if (threadItemId === undefined) return;
      if (replyTimer !== undefined) {
        clearTimeout(replyTimer);
        replyTimer = undefined;
      }
      let state: ThreadReplyState | undefined;
      const head = branch.at(-1);
      const thread = getOwnThread(aui)?.getState();
      if (
        writer &&
        head?.role === "user" &&
        thread &&
        !thread.isRunning &&
        !thread.isLoading
      ) {
        const run = adapter.replyRunOf(head, writer.keyOf(head));
        if (run?.status === "in-progress") {
          state = "in-progress";
          watchThreadRun(head, run.staleInMs);
          // Turns interrupted the moment the run would cross staleAfter, even between polls.
          replyTimer = setTimeout(check, run.staleInMs + POLL_STALE_MARGIN_MS);
        } else if (run !== undefined) {
          state = "interrupted";
        }
      }
      setThreadReplyState(threadItemId, state);
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
        run.writer.noteSettled?.(settled);
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
      else if (poll && poll.messageId !== head?.id) {
        clearTimeout(poll.timer);
        poll = undefined;
      }
      updateReplyState(writer, branch);
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
      if (key === undefined || writer.canStore?.(parent) === false) return;
      const run: TrackedRun = {
        writer,
        messageId: head.id,
        key,
        parent,
        checkpointed: head.content,
        settleTimer: undefined,
        stored: writer.begin(head, parent).then(
          () => undefined,
          (error: unknown) => {
            console.warn("[assistant-ui] Could not open the run lease:", error);
          },
        ),
      };
      tracked = run;
    };

    const checkpoint = setInterval(() => {
      const run = tracked;
      if (!run || !run.writer.hasOpenRun(run.key)) return;
      const message = findMessage(aui, run.messageId);
      if (!message || message.status?.type !== "running") return;
      if (message.content === run.checkpointed) return;
      if (isEmptyReply(message)) return;
      run.checkpointed = message.content;
      void write(run, message);
    }, CHECKPOINT_INTERVAL_MS);

    const thread = getOwnThread(aui);
    if (!thread) {
      clearInterval(checkpoint);
      return;
    }
    if (threadItemId !== undefined) refreshers.set(threadItemId, refresh);
    const unsubscribe = thread.subscribe(check);
    check();
    return () => {
      disposed = true;
      if (threadItemId !== undefined) {
        if (refreshers.get(threadItemId) === refresh)
          refreshers.delete(threadItemId);
        setThreadReplyState(threadItemId, undefined);
      }
      if (replyTimer !== undefined) clearTimeout(replyTimer);
      if (poll) clearTimeout(poll.timer);
      unsubscribe();
      clearInterval(checkpoint);
      if (tracked?.settleTimer !== undefined) clearTimeout(tracked.settleTimer);
    };
  }, [adapter, aui]);
};
