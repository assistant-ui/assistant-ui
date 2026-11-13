import {
  ExportedMessageRepository,
  type ExportedMessageRepositoryItem,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/core";
import { fromAgUiMessages } from "./adapter/conversions";
import type { Logger } from "./logger";

/** A thread as a durable AG-UI server reports it, such as `GET /threads/{id}` of `DurableAGUI`. */
export type AgUiDurableThread = {
  /**
   * The thread's AG-UI messages. While a run is going, the run's input: the
   * conversation up to and including the message that started it. Once the
   * run ended, the whole transcript with its answer.
   */
  messages: readonly unknown[];
  /** Whether a run is still going on the server. */
  running: boolean;
};

/**
 * Pairs a history adapter that stores messages itself, such as Assistant
 * Cloud's, with an AG-UI server whose runs outlive the browser.
 */
export type AgUiDurableRuns = {
  /**
   * Reads the thread from the durable server. `threadId` is the agent's
   * `threadId`. Resolve `null` when the server has no such thread.
   */
  getThread: (threadId: string) => Promise<AgUiDurableThread | null>;
};

type Item = ExportedMessageRepositoryItem;

/** What a loaded thread needs from the durable server. */
export type DurableDecision =
  | { type: "keep" }
  /** Another tab is writing the reply; check again in `recheckInMs`. */
  | { type: "follow"; recheckInMs: number }
  /** The run is still going: drop the stored partial reply and rejoin. */
  | {
      type: "resume";
      messages: Item[];
      headId: string;
      remove: Item[];
    }
  /** The run ended while no tab followed it: swap the stored partial reply for the server's answer. */
  | {
      type: "replace";
      messages: Item[];
      headId: string;
      remove: Item[];
      add: Item[];
    };

/** Where the reply after the last user message stands in the stored history. */
type TailState =
  | { type: "missing" }
  | { type: "settled" }
  | { type: "stale" }
  | { type: "elsewhere"; staleInMs: number };

const RUN_STALE = "run_stale";
const RUN_IN_PROGRESS = "run_in_progress";
const RECHECK_MIN_MS = 1_000;
const RECHECK_MAX_MS = 10_000;
const RECHECK_MARGIN_MS = 500;

const errorOf = (message: ThreadMessage) => {
  const status = message.status;
  if (status?.type !== "incomplete" || status.reason !== "error")
    return undefined;
  const error = status.error;
  return typeof error === "object" && error !== null && !Array.isArray(error)
    ? (error as { code?: unknown; stale_in_ms?: unknown })
    : undefined;
};

const tailStateOf = (tail: readonly ThreadMessage[]): TailState => {
  const last = tail.at(-1);
  if (!last) return { type: "missing" };
  if (last.role !== "assistant") return { type: "settled" };
  const error = errorOf(last);
  if (error?.code === RUN_IN_PROGRESS) {
    return {
      type: "elsewhere",
      staleInMs: typeof error.stale_in_ms === "number" ? error.stale_in_ms : 0,
    };
  }
  // Nothing runs locally while a thread loads, so a stored reply still marked running never settled.
  if (error?.code === RUN_STALE || last.status?.type === "running")
    return { type: "stale" };
  return { type: "settled" };
};

/**
 * Where the reply of a thread that follows another tab stands now: still
 * written `elsewhere`, gone `stale` (that tab stopped beating), or undefined
 * once it settled or the thread moved on. The Cloud run tracker keeps the
 * shown reply current while it is in progress elsewhere.
 */
export const durableFollowState = (
  messages: readonly ThreadMessage[],
): "elsewhere" | "stale" | undefined => {
  const userIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );
  if (userIndex === -1) return undefined;
  const state = tailStateOf(messages.slice(userIndex + 1)).type;
  return state === "elsewhere" || state === "stale" ? state : undefined;
};

/** The messages from the root to the head, in order. */
const headBranch = (repository: ExportedMessageRepository): Item[] => {
  const byId = new Map(
    repository.messages.map((item) => [item.message.id, item]),
  );
  const branch: Item[] = [];
  let id: string | null | undefined =
    repository.headId ?? repository.messages.at(-1)?.message.id;
  while (id) {
    const item = byId.get(id);
    if (!item || branch.includes(item)) break;
    branch.unshift(item);
    id = item.parentId;
  }
  return branch;
};

const textOf = (message: ThreadMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

const toItems = (messages: readonly unknown[]) =>
  ExportedMessageRepository.fromArray(fromAgUiMessages(messages)).messages;

/**
 * Decides how a stored thread meets its durable run. Messages are matched by
 * position, because the durable server and the store give them different ids:
 * the stored branch's last user message is the server's user message with the
 * same index.
 */
export const decideDurableThread = (
  repository: ExportedMessageRepository,
  durable: AgUiDurableThread | null,
): DurableDecision => {
  if (!durable) return { type: "keep" };
  const branch = headBranch(repository);
  const userIndex = branch.findLastIndex(
    (item) => item.message.role === "user",
  );
  if (userIndex === -1) return { type: "keep" };
  const user = branch[userIndex]!;
  const tail = branch.slice(userIndex + 1);
  const state = tailStateOf(tail.map((item) => item.message));
  if (state.type === "settled") return { type: "keep" };

  const turn = branch
    .slice(0, userIndex + 1)
    .filter((item) => item.message.role === "user").length;
  const serverItems = toItems(durable.messages);
  const serverUsers = serverItems.filter(
    (item) => item.message.role === "user",
  );
  // The server is behind the store, or ahead of it with a turn the store has not received yet.
  if (serverUsers.length !== turn) return { type: "keep" };
  const serverUser = serverUsers[turn - 1]!;
  const storedText = textOf(user.message);
  const serverText = textOf(serverUser.message);
  if (storedText && serverText && storedText !== serverText)
    return { type: "keep" };

  if (state.type === "elsewhere") {
    return {
      type: "follow",
      recheckInMs: Math.min(
        RECHECK_MAX_MS,
        Math.max(RECHECK_MIN_MS, state.staleInMs + RECHECK_MARGIN_MS),
      ),
    };
  }

  const removeIds = new Set(tail.map((item) => item.message.id));
  const kept = repository.messages.filter(
    (item) => !removeIds.has(item.message.id),
  );
  if (durable.running) {
    return {
      type: "resume",
      messages: kept,
      headId: user.message.id,
      remove: tail,
    };
  }

  const answer = serverItems.slice(serverItems.indexOf(serverUser) + 1);
  if (answer.length === 0) return { type: "keep" };
  const keptIds = new Set(kept.map((item) => item.message.id));
  if (answer.some((item) => keptIds.has(item.message.id)))
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

/**
 * Wraps `history.load()` so a reopened thread meets its durable run: it
 * rejoins a run that is still going, in place of the partial reply the store
 * holds, and stores the server's answer for a run that ended while no tab was
 * open. While another tab writes the reply it leaves the thread as stored and
 * calls `onFollow` with when to look again.
 */
export const withDurableRuns = (
  history: ThreadHistoryAdapter,
  options: {
    durable: () => AgUiDurableRuns | undefined;
    getThreadId: () => string;
    /** Whether the runtime can follow a run in flight, through the agent's `connect()` or `history.resume()`. */
    canRejoin: () => boolean;
    logger: Logger;
    onFollow: (recheckInMs: number) => void;
  },
): ThreadHistoryAdapter => {
  const load: ThreadHistoryAdapter["load"] = async () => {
    const repository = await history.load();
    const durable = options.durable();
    if (!durable || repository.unstable_resume) return repository;
    const branch = headBranch(repository);
    const userIndex = branch.findLastIndex(
      (item) => item.message.role === "user",
    );
    if (userIndex === -1) return repository;
    const tail = branch.slice(userIndex + 1).map((item) => item.message);
    if (tailStateOf(tail).type === "settled") return repository;

    let thread: AgUiDurableThread | null;
    try {
      thread = await durable.getThread(options.getThreadId());
    } catch (error) {
      options.logger.error("[agui] failed to read the durable thread", error);
      return repository;
    }
    const decision = decideDurableThread(repository, thread);
    if (decision.type === "keep") return repository;
    // Without a way to follow the run, resuming would start the agent again.
    if (decision.type === "resume" && !history.resume && !options.canRejoin()) {
      options.logger.error(
        "[agui] durableRuns needs an agent that implements connect() to rejoin a running thread",
      );
      return repository;
    }
    if (decision.type === "follow") {
      options.onFollow(decision.recheckInMs);
      return repository;
    }
    try {
      // The stored partial reply goes first, so a reply stored under the same id starts a new row.
      if (decision.remove.length > 0) await history.delete?.(decision.remove);
    } catch (error) {
      options.logger.error(
        "[agui] failed to delete the interrupted reply",
        error,
      );
      return repository;
    }
    const reconciled = {
      ...repository,
      headId: decision.headId,
      messages: decision.messages,
    };
    if (decision.type === "resume")
      return { ...reconciled, unstable_resume: true };
    try {
      for (const item of decision.add) await history.append(item);
    } catch (error) {
      options.logger.error("[agui] failed to store the durable answer", error);
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
