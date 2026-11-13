import { useEffect } from "react";
import {
  ExportedMessageRepository,
  type AssistantRuntime,
  type ExportedMessageRepositoryItem,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  fromAgUiMessages,
  type FromAgUiMessagesOptions,
} from "@assistant-ui/react-ag-ui";
import type { DurableThread as StoredThread } from "./durable-agent";

/** What the durable server reports for a thread (`GET /threads/{id}`). */
type DurableThread = Pick<StoredThread, "messages" | "running">;

/**
 * Pairs a history adapter that stores messages itself (Assistant Cloud's)
 * with a durable AG-UI server that keeps runs going after the tab closes.
 *
 * - `withDurableRuns` wraps the history's `load()`: a thread opened while its
 *   run is still going drops the stored partial reply and returns
 *   `unstable_resume`, so the runtime rejoins the run through `connect()`. A
 *   run that ended while no tab was open has its answer stored in place of
 *   the interrupted reply.
 * - `useDurableTakeover` covers a reply another tab was writing: once that
 *   tab's run lease goes stale, it reads the thread again and calls
 *   `resumeRun`, which follows the run through `connect()`.
 *
 * Only the stored branch's turn is matched, by position: the server and the
 * store give messages different ids, so the stored last user message is the
 * server's user message with the same index. When they disagree on the turn
 * count or on that message's text, the thread is left as stored.
 */

type Item = ExportedMessageRepositoryItem;
type DurableSource = {
  readonly threadId: string;
  getThread(threadId: string): Promise<DurableThread | null>;
};

type Decision =
  | { type: "keep" }
  | { type: "resume"; messages: Item[]; headId: string; remove: Item[] }
  | {
      type: "replace";
      messages: Item[];
      headId: string;
      remove: Item[];
      add: Item[];
    };

type TailState = "missing" | "settled" | "stale" | "elsewhere";

// Error codes Assistant Cloud gives a reply whose run lease is fresh or stale.
const RUN_STALE = "run_stale";
const RUN_IN_PROGRESS = "run_in_progress";
// The status AG-UI gives a reply whose stream ended without RUN_FINISHED; a durable run can still be going.
const CONNECTION_ENDED = "The connection ended before the answer finished.";

const lastIndexOf = <T>(items: readonly T[], test: (item: T) => boolean) => {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i]!)) return i;
  return -1;
};

const tailStateOf = (tail: readonly ThreadMessage[]): TailState => {
  const last = tail.at(-1);
  if (!last) return "missing";
  if (last.role !== "assistant") return "settled";
  const status = last.status;
  if (status?.type === "running") return "stale";
  if (status?.type !== "incomplete" || status.reason !== "error")
    return "settled";
  const error = status.error as unknown;
  if (error === CONNECTION_ENDED) return "stale";
  const code =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown }).code
      : undefined;
  if (code === RUN_IN_PROGRESS) return "elsewhere";
  if (code === RUN_STALE) return "stale";
  return "settled";
};

const headBranch = (repository: ExportedMessageRepository): Item[] => {
  const byId = new Map(repository.messages.map((i) => [i.message.id, i]));
  const branch: Item[] = [];
  let id = repository.headId ?? repository.messages.at(-1)?.message.id;
  while (id) {
    const item = byId.get(id);
    if (!item || branch.includes(item)) break;
    branch.unshift(item);
    id = item.parentId ?? undefined;
  }
  return branch;
};

const textOf = (message: ThreadMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

const splitTurn = (branch: readonly Item[]) => {
  const userIndex = lastIndexOf(branch, (i) => i.message.role === "user");
  return userIndex === -1
    ? undefined
    : {
        userIndex,
        user: branch[userIndex]!,
        tail: branch.slice(userIndex + 1),
      };
};

/** How a stored thread meets its durable run. Elsewhere-written replies are kept: the tab writing them owns them. */
export const decideDurableThread = (
  repository: ExportedMessageRepository,
  durable: DurableThread | null,
  options?: FromAgUiMessagesOptions,
): Decision => {
  if (!durable) return { type: "keep" };
  const branch = headBranch(repository);
  const turnOf = splitTurn(branch);
  if (!turnOf) return { type: "keep" };
  const { userIndex, user, tail } = turnOf;
  const state = tailStateOf(tail.map((i) => i.message));
  if (state === "settled" || state === "elsewhere") return { type: "keep" };

  const turn = branch
    .slice(0, userIndex + 1)
    .filter((i) => i.message.role === "user").length;
  const server = ExportedMessageRepository.fromArray(
    fromAgUiMessages(durable.messages, options),
  ).messages;
  const serverUsers = server.filter((i) => i.message.role === "user");
  if (serverUsers.length !== turn) return { type: "keep" };
  const serverUser = serverUsers[turn - 1]!;
  if (textOf(user.message) !== textOf(serverUser.message))
    return { type: "keep" };

  const removeIds = new Set(tail.map((i) => i.message.id));
  const kept = repository.messages.filter((i) => !removeIds.has(i.message.id));
  if (durable.running)
    return {
      type: "resume",
      messages: kept,
      headId: user.message.id,
      remove: tail,
    };

  const answer = server.slice(server.indexOf(serverUser) + 1);
  const keptIds = new Set(kept.map((i) => i.message.id));
  if (answer.length === 0 || answer.some((i) => keptIds.has(i.message.id)))
    return { type: "keep" };
  const add = answer.map((item, index) => ({
    ...item,
    parentId: index === 0 ? user.message.id : answer[index - 1]!.message.id,
  }));
  return {
    type: "replace",
    messages: [...kept, ...add],
    headId: add.at(-1)!.message.id,
    remove: tail,
    add,
  };
};

/** Wraps `history.load()` so a reopened thread meets its durable run. */
export const withDurableRuns = (
  history: ThreadHistoryAdapter,
  agent: DurableSource,
  options?: FromAgUiMessagesOptions,
): ThreadHistoryAdapter => {
  const load: ThreadHistoryAdapter["load"] = async () => {
    const repository = await history.load();
    // Replacing the stored reply needs a way to delete it.
    if (repository.unstable_resume || !history.delete) return repository;
    const turn = splitTurn(headBranch(repository));
    if (!turn) return repository;
    const state = tailStateOf(turn.tail.map((i) => i.message));
    if (state === "settled" || state === "elsewhere") return repository;

    let thread: DurableThread | null;
    try {
      thread = await agent.getThread(agent.threadId);
    } catch (error) {
      console.warn("[durable] could not read the thread", error);
      return repository;
    }
    const decision = decideDurableThread(repository, thread, options);
    if (decision.type === "keep") return repository;
    try {
      // The partial reply goes first, so a reply stored under the same id starts a new row.
      if (decision.remove.length > 0) await history.delete(decision.remove);
    } catch (error) {
      console.warn("[durable] could not delete the interrupted reply", error);
      return repository;
    }
    const reconciled = {
      ...repository,
      headId: decision.headId,
      messages: decision.messages,
    };
    if (decision.type === "resume")
      return { ...reconciled, unstable_resume: true };

    const stored: Item[] = [];
    try {
      for (const item of decision.add) {
        await history.append(item);
        stored.push(item);
      }
    } catch (error) {
      // Take back what was stored, so the next load sees no reply and tries again.
      console.warn("[durable] could not store the answer", error);
      await history.delete(stored).catch(() => {});
      const user = decision.add[0]!.parentId!;
      return {
        ...repository,
        headId: user,
        messages: decision.messages.filter((i) => !decision.add.includes(i)),
      };
    }
    return reconciled;
  };

  return new Proxy(history, {
    get(target, property) {
      if (property === "load") return load;
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
};

/**
 * Rejoins a run another tab was following once that tab stops: when the
 * shown reply turns stale (the Cloud run tracker refreshes it), it reads the
 * thread again through `history` and resumes the run if it is still going.
 */
export const useDurableTakeover = (
  runtime: AssistantRuntime,
  history: ThreadHistoryAdapter | undefined,
) => {
  useEffect(() => {
    if (!history) return;
    const thread = runtime.thread;
    let disposed = false;
    let busy = false;
    let checked: ThreadMessage | undefined;
    const check = () => {
      if (disposed || busy) return;
      const { isRunning, isLoading, messages } = thread.getState();
      if (isRunning || isLoading) return;
      const userIndex = lastIndexOf(messages, (m) => m.role === "user");
      if (userIndex === -1) return;
      const last = messages.at(-1);
      if (last === checked) return;
      if (tailStateOf(messages.slice(userIndex + 1)) !== "stale") return;
      checked = last;
      busy = true;
      void (async () => {
        try {
          const repository = await history.load();
          if (disposed || thread.getState().isRunning) return;
          thread.import(repository);
          if (repository.unstable_resume && repository.headId)
            thread.resumeRun({ parentId: repository.headId });
        } catch (error) {
          console.warn("[durable] could not take the run over", error);
        } finally {
          busy = false;
        }
      })();
    };
    const unsubscribe = thread.subscribe(check);
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [runtime, history]);
};
