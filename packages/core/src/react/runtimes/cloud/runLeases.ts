import { useEffect } from "react";
import type { AssistantClient } from "@assistant-ui/store";
import type { ThreadMessage } from "../../../types";
import type { AssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";

const CHECKPOINT_INTERVAL_MS = 20_000;
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
    const unsubscribe = thread.subscribe(check);
    check();
    return () => {
      unsubscribe();
      clearInterval(checkpoint);
      if (tracked?.settleTimer !== undefined) clearTimeout(tracked.settleTimer);
    };
  }, [adapter, aui]);
};
