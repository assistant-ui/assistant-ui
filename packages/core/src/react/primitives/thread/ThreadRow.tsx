import { type FC, type ReactNode, memo, useMemo } from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { useShallowSelector } from "@assistant-ui/store/internal";
import type { MessageState } from "../../../store";
import { MessageByIdProvider } from "../../providers/MessageByIdProvider";
import type { GroupNode } from "../../utils/groupParts";
import { getThreadRowNode, type ThreadRow } from "../../utils/threadRows";
import type { EnrichedPartState } from "../message/MessageParts";
import {
  type MessagePrimitiveGroupedParts,
  renderGroupNode,
} from "../message/MessageGroupedParts";
import { hasMessageId } from "./ThreadMessages";

export namespace ThreadPrimitiveRow {
  /**
   * Wall-clock span of a turn, in epoch milliseconds: from its first message
   * to the end of its reply. `completedAt` is absent while the turn runs or
   * waits on the user; otherwise it is the latest end the turn records (the
   * last assistant message's stream timing or a part's `timing.completedAt`),
   * falling back to the last message's `createdAt`.
   */
  export type Turn = {
    readonly startedAt: number;
    readonly completedAt?: number;
  };

  /** Switch on `type`, which repeats `row.type` so it narrows the rest. */
  export type RenderInfo =
    | {
        readonly type: "message";
        readonly row: Extract<ThreadRow, { type: "message" }>;
        readonly message: MessageState;
      }
    | {
        readonly type: "part";
        readonly row: Extract<ThreadRow, { type: "part" }>;
        /**
         * A group part for a row that coalesced parts, whose `children` is the
         * rendered subtree, or a leaf part, exactly as
         * `MessagePrimitive.GroupedParts` passes them. Returning `null` for a
         * tool or data leaf renders its registered UI.
         */
        readonly part:
          | MessagePrimitiveGroupedParts.GroupPart
          | EnrichedPartState;
        readonly children: ReactNode;
      }
    | {
        readonly type: "turn-end";
        readonly row: Extract<ThreadRow, { type: "turn-end" }>;
        /** The turn's last message. */
        readonly message: MessageState;
        readonly turn: Turn | undefined;
      };

  export type Props = {
    /** A row from `createThreadRowsSelector`. */
    readonly row: ThreadRow;
    /** Render function for the row; keep its identity stable across renders. */
    readonly children: (info: RenderInfo) => ReactNode;
  };
}

const getTurnStartedAt = (
  messages: readonly MessageState[],
  turnMessageId: string,
) =>
  messages.find((message) => message.id === turnMessageId)?.createdAt.getTime();

const getTurnCompletedAt = (
  messages: readonly MessageState[],
  turnMessageId: string,
  lastMessageId: string,
) => {
  const start = messages.findIndex((message) => message.id === turnMessageId);
  const end = messages.findIndex((message) => message.id === lastMessageId);
  const last = messages[end];
  if (start < 0 || !last || end < start) return undefined;
  const statusType = last.status?.type;
  if (statusType === "running" || statusType === "requires-action")
    return undefined;

  let completedAt: number | undefined;
  const record = (time: number) => {
    completedAt =
      completedAt === undefined ? time : Math.max(completedAt, time);
  };
  for (let index = start; index <= end; index++) {
    const message = messages[index]!;
    if (message.role !== "assistant") continue;
    const timing = message.metadata.timing;
    if (timing?.totalStreamTime !== undefined)
      record(timing.streamStartTime + timing.totalStreamTime);
    for (const part of message.parts) {
      if (
        (part.type === "reasoning" || part.type === "tool-call") &&
        part.timing?.completedAt !== undefined
      )
        record(part.timing.completedAt);
    }
  }
  return completedAt ?? last.createdAt.getTime();
};

const fallbackNode = (indices: readonly number[]): GroupNode =>
  indices.length === 1
    ? { type: "part", index: indices[0]!, nodeKey: "0", idKey: undefined }
    : {
        type: "group",
        key: "group-row",
        nodeKey: "0",
        idKey: undefined,
        indices,
        children: indices.map((index, position) => ({
          type: "part",
          index,
          nodeKey: `0.${position}`,
          idKey: undefined,
        })),
      };

const PartRow: FC<{
  row: Extract<ThreadRow, { type: "part" }>;
  children: ThreadPrimitiveRow.Props["children"];
}> = ({ row, children }) => {
  const parts = useAuiState(useShallowSelector((s) => s.message.parts));
  if (row.indices.some((index) => index >= parts.length)) return null;
  const node = getThreadRowNode(row) ?? fallbackNode(row.indices);
  return renderGroupNode(node, parts, (info) =>
    children({
      type: "part",
      row,
      part: info.part as never,
      children: info.children,
    }),
  );
};

const MessageRow: FC<{
  row: Extract<ThreadRow, { type: "message" }>;
  children: ThreadPrimitiveRow.Props["children"];
}> = ({ row, children }) => (
  <RenderChildrenWithAccessor getItemState={(aui) => aui.message.getState()}>
    {(getItem) =>
      children({
        type: "message",
        row,
        get message() {
          return getItem();
        },
      })
    }
  </RenderChildrenWithAccessor>
);

const TurnEndRow: FC<{
  row: Extract<ThreadRow, { type: "turn-end" }>;
  children: ThreadPrimitiveRow.Props["children"];
}> = ({ row, children }) => {
  const startedAt = useAuiState((s) =>
    getTurnStartedAt(s.thread.messages, row.turnMessageId),
  );
  const completedAt = useAuiState((s) =>
    getTurnCompletedAt(s.thread.messages, row.turnMessageId, row.messageId),
  );
  const turn = useMemo<ThreadPrimitiveRow.Turn | undefined>(
    () =>
      startedAt === undefined
        ? undefined
        : completedAt === undefined
          ? { startedAt }
          : { startedAt, completedAt },
    [startedAt, completedAt],
  );
  return (
    <RenderChildrenWithAccessor getItemState={(aui) => aui.message.getState()}>
      {(getItem) =>
        children({
          type: "turn-end",
          row,
          turn,
          get message() {
            return getItem();
          },
        })
      }
    </RenderChildrenWithAccessor>
  );
};

/**
 * Renders one {@link ThreadRow} of a flattened thread, mounting only the
 * scopes that row needs: its message, and for a part row only that row's
 * parts. A row whose message or parts are gone (a virtualizer can render a row
 * for a frame after it left the thread) renders nothing.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Row row={row}>
 *   {(info) => {
 *     switch (info.type) {
 *       case "message":
 *         return <UserMessage />;
 *       case "part":
 *         return renderPart(info.part, info.children);
 *       case "turn-end":
 *         return <TurnFooter turn={info.turn} />;
 *     }
 *   }}
 * </ThreadPrimitive.Row>
 * ```
 */
const ThreadPrimitiveRowImpl: FC<ThreadPrimitiveRow.Props> = ({
  row,
  children,
}) => {
  const exists = useAuiState((s) =>
    hasMessageId(s.thread.messages, row.messageId),
  );
  if (!exists) return null;

  return (
    <MessageByIdProvider id={row.messageId}>
      {row.type === "message" ? (
        <MessageRow row={row}>{children}</MessageRow>
      ) : row.type === "part" ? (
        <PartRow row={row}>{children}</PartRow>
      ) : (
        <TurnEndRow row={row}>{children}</TurnEndRow>
      )}
    </MessageByIdProvider>
  );
};

export const ThreadPrimitiveRow = memo(
  ThreadPrimitiveRowImpl,
  (prev, next) => prev.row === next.row && prev.children === next.children,
);

ThreadPrimitiveRow.displayName = "ThreadPrimitive.Row";
