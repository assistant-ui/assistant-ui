import type { HarnessMessage, HarnessState, SendMessageCommand } from "./types";

export type HarnessSubagent = {
  readonly messages: readonly HarnessMessage[];
  readonly subagents: Readonly<Record<string, HarnessSubagent>>;
};

export type HarnessThreadViews = {
  readonly messages: readonly HarnessMessage[];
  readonly subagents: Readonly<Record<string, HarnessSubagent>>;
};

type ChildrenIndex = Map<string | null, HarnessMessage[]>;

const indexChildren = (
  messages: Readonly<Record<string, HarnessMessage>>,
): ChildrenIndex => {
  const index: ChildrenIndex = new Map();
  for (const message of Object.values(messages)) {
    const siblings = index.get(message.parentId);
    if (siblings) siblings.push(message);
    else index.set(message.parentId, [message]);
  }
  return index;
};

/** Walk the active branch from a root; on branch points the latest child wins. */
const chainFrom = (
  index: ChildrenIndex,
  root: string | null,
): HarnessMessage[] => {
  const chain: HarnessMessage[] = [];
  let key = root;
  for (;;) {
    const children = index.get(key);
    const next = children?.[children.length - 1];
    if (!next) break;
    chain.push(next);
    key = next.id;
  }
  return chain;
};

/** The server accepted the send: its id appears as a message or queue item. */
export const isEchoed = (
  state: HarnessState,
  command: SendMessageCommand,
): boolean =>
  command.id in state.messages || state.queue.some((q) => q.id === command.id);

/**
 * Append pending optimistic sends at the leaf of the main thread. A command
 * whose id the server already echoed (as a message or a queue item) is
 * skipped: the echo is an identity merge, not a swap.
 */
export const applyOptimistic = (
  state: HarnessState,
  optimistic: readonly SendMessageCommand[],
): HarnessState => {
  const pending = optimistic.filter((c) => !isEchoed(state, c));
  if (pending.length === 0) return state;

  const chain = chainFrom(indexChildren(state.messages), null);
  let parentId = chain[chain.length - 1]?.id ?? null;

  const messages = { ...state.messages };
  for (const command of pending) {
    messages[command.id] = {
      id: command.id,
      parentId,
      role: "user",
      parts: command.parts,
    };
    parentId = command.id;
  }
  return { ...state, messages };
};

/**
 * Flatten the message tree into the main transcript plus a recursive record
 * of nested transcripts keyed by the dispatching tool call id.
 */
export const buildViews = (state: HarnessState): HarnessThreadViews => {
  const index = indexChildren(state.messages);

  const nodes = new Map<
    string,
    {
      messages: readonly HarnessMessage[];
      subagents: Record<string, HarnessSubagent>;
    }
  >();
  for (const key of index.keys()) {
    if (key !== null && !(key in state.messages)) {
      nodes.set(key, { messages: chainFrom(index, key), subagents: {} });
    }
  }

  const mainMessages = chainFrom(index, null);

  // toolCallId -> the root whose transcript contains that tool call
  const ownerRoot = new Map<string, string | null>();
  const scan = (messages: readonly HarnessMessage[], root: string | null) => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (part.type === "tool") ownerRoot.set(part.toolCallId, root);
      }
    }
  };
  scan(mainMessages, null);
  for (const [key, node] of nodes) scan(node.messages, key);

  const main: Record<string, HarnessSubagent> = {};
  for (const [key, node] of nodes) {
    const owner = ownerRoot.get(key);
    if (owner === undefined) continue;
    const target = owner === null ? main : nodes.get(owner)!.subagents;
    target[key] = node;
  }

  return { messages: mainMessages, subagents: main };
};
