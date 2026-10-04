import type { AssistantState } from "@assistant-ui/store";
import type { MessageState } from "../../store/scopes/message";
import type { PartState } from "../../store/scopes/part";
import { getMessagePartKeys } from "../../utils/getMessagePartKeys";
import type { ToolsState } from "../types/scopes/tools";
import {
  buildGroupTree,
  type GroupByContext,
  type GroupNode,
} from "./groupParts";

/**
 * One row of a flattened thread, for rendering a long thread through a
 * virtualized list with `ThreadPrimitive.Row`. A row is structural: it names
 * what to render, and the content is read from the store when it renders.
 *
 * - `"message"`: a whole user or system message, or an assistant message that
 *   is being edited.
 * - `"part"`: one top-level node of an assistant message's part grouping: a
 *   single part, or a group of adjacent parts that `groupBy` coalesced.
 * - `"turn-end"`: closes a turn (a user message, or the thread start, and the
 *   messages up to the next user message) once the turn has a reply; it renders
 *   in the scope of the turn's last message.
 */
export type ThreadRow =
  | {
      readonly type: "message";
      /** Stable across streaming and earlier pages; use it as the list key. */
      readonly key: string;
      readonly messageId: string;
      /** The first message of the row's turn. */
      readonly turnMessageId: string;
    }
  | {
      readonly type: "part";
      readonly key: string;
      readonly messageId: string;
      readonly turnMessageId: string;
      /** Indices of the message parts in this row, in order. */
      readonly indices: readonly number[];
      /** The group key `groupBy` returned for the row, when it coalesced parts. */
      readonly group?: `group-${string}`;
    }
  | {
      readonly type: "turn-end";
      readonly key: string;
      /** The turn's last message, whose scope the row renders in. */
      readonly messageId: string;
      readonly turnMessageId: string;
    };

export type ThreadRowsOptions = {
  /**
   * Coalesces adjacent parts of an assistant message into one row, with the
   * same contract as `MessagePrimitive.GroupedParts`; a row is a top-level node
   * of that grouping. Without it, every part is its own row.
   */
  readonly groupBy?:
    | ((
        part: PartState,
        context: GroupByContext,
      ) => readonly `group-${string}`[] | null)
    | undefined;
};

const rowNodes = new WeakMap<ThreadRow, GroupNode>();

/** The group subtree a part row renders, when the row came from a selector. */
export const getThreadRowNode = (row: ThreadRow): GroupNode | undefined =>
  rowNodes.get(row);

const EMPTY_ROWS: readonly ThreadRow[] = Object.freeze([]);
const NO_TOOL_UIS = {};

const isSameRow = (a: ThreadRow, b: ThreadRow) => {
  if (
    a.type !== b.type ||
    a.key !== b.key ||
    a.messageId !== b.messageId ||
    a.turnMessageId !== b.turnMessageId
  )
    return false;
  if (a.type !== "part" || b.type !== "part") return true;
  return (
    a.group === b.group &&
    a.indices.length === b.indices.length &&
    a.indices.every((index, i) => index === b.indices[i])
  );
};

/**
 * Creates a selector for `useAuiState` that flattens the current thread into
 * {@link ThreadRow}s. The selector returns the same array for the same thread
 * state, and keeps returning the previous array and row objects while a
 * streamed token leaves the row structure unchanged, so a list keyed by
 * `row.key` re-renders only when rows appear, disappear or regroup. Create one
 * selector per list, at module scope or with `useState`.
 *
 * @example
 * ```tsx
 * const selectRows = createThreadRowsSelector({
 *   groupBy: groupPartByType({ reasoning: ["group-reasoning"] }),
 * });
 *
 * function VirtualThread() {
 *   const rows = useAuiState(selectRows);
 *   // feed rows to a virtualizer and render each with ThreadPrimitive.Row
 * }
 * ```
 */
export const createThreadRowsSelector = (options: ThreadRowsOptions = {}) => {
  const { groupBy } = options;
  const byInput = new WeakMap<
    readonly MessageState[],
    { toolUIs: object; rows: readonly ThreadRow[] }
  >();
  const byMessage = new WeakMap<
    MessageState,
    { toolUIs: object; turnMessageId: string; rows: readonly ThreadRow[] }
  >();
  let previous = new Map<string, ThreadRow>();
  let previousRows: readonly ThreadRow[] = EMPTY_ROWS;

  const reuse = (row: ThreadRow, node?: GroupNode) => {
    const existing = previous.get(row.key);
    const next = existing && isSameRow(existing, row) ? existing : row;
    if (node) rowNodes.set(next, node);
    return next;
  };

  const rowsOfMessage = (
    message: MessageState,
    turnMessageId: string,
    toolUIs: ToolsState["toolUIs"] | undefined,
  ): readonly ThreadRow[] => {
    if (message.role !== "assistant" || message.composer.isEditing)
      return [
        reuse({
          type: "message",
          key: `message:${message.id}`,
          messageId: message.id,
          turnMessageId,
        }),
      ];

    const parts = message.parts;
    if (parts.length === 0) return EMPTY_ROWS;
    const partKeys = getMessagePartKeys(parts);
    const context: GroupByContext = toolUIs ? { toolUIs } : {};
    const tree = buildGroupTree(
      parts.map((part) => groupBy?.(part, context) ?? []),
      partKeys,
    );
    return tree.map((node) =>
      node.type === "part"
        ? reuse(
            {
              type: "part",
              key: `part:${message.id}:${partKeys[node.index]}`,
              messageId: message.id,
              turnMessageId,
              indices: [node.index],
            },
            node,
          )
        : reuse(
            {
              type: "part",
              key: `group:${message.id}:${node.key}:${node.idKey ?? node.indices[0]}`,
              messageId: message.id,
              turnMessageId,
              indices: node.indices,
              group: node.key as `group-${string}`,
            },
            node,
          ),
    );
  };

  return (state: AssistantState): readonly ThreadRow[] => {
    const messages = state.thread.messages;
    const toolUIs = state.optional.tools?.toolUIs;
    const toolUIsKey = toolUIs ?? NO_TOOL_UIS;
    const cached = byInput.get(messages);
    if (cached?.toolUIs === toolUIsKey) return cached.rows;

    const rows: ThreadRow[] = [];
    let turnMessageId: string | undefined;
    let turnHasReply = false;
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index]!;
      if (message.role === "user" || turnMessageId === undefined) {
        turnMessageId = message.id;
        turnHasReply = false;
      }
      if (message.role !== "user") turnHasReply = true;

      const messageCache = byMessage.get(message);
      const messageRows =
        messageCache?.toolUIs === toolUIsKey &&
        messageCache.turnMessageId === turnMessageId
          ? messageCache.rows
          : rowsOfMessage(message, turnMessageId, toolUIs);
      if (messageCache?.rows !== messageRows)
        byMessage.set(message, {
          toolUIs: toolUIsKey,
          turnMessageId,
          rows: messageRows,
        });
      rows.push(...messageRows);

      const next = messages[index + 1];
      if (turnHasReply && (next === undefined || next.role === "user"))
        rows.push(
          reuse({
            type: "turn-end",
            key: `turn-end:${turnMessageId}`,
            messageId: message.id,
            turnMessageId,
          }),
        );
    }

    const result =
      rows.length === previousRows.length &&
      rows.every((row, index) => row === previousRows[index])
        ? previousRows
        : rows;
    previous = new Map(result.map((row) => [row.key, row]));
    previousRows = result;
    byInput.set(messages, { toolUIs: toolUIsKey, rows: result });
    return result;
  };
};
