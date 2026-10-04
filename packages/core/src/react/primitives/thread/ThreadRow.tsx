import { type FC, type ReactNode, memo } from "react";
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
        /** Carries the turn's `startedAt` and, once it completes, `completedAt`. */
        readonly row: Extract<ThreadRow, { type: "turn-end" }>;
        /** The turn's last message. */
        readonly message: MessageState;
      };

  export type Props = {
    /** A row from `createThreadRowsSelector`. */
    readonly row: ThreadRow;
    /** Render function for the row; keep its identity stable across renders. */
    readonly children: (info: RenderInfo) => ReactNode;
  };
}

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
    children({ type: "part", row, part: info.part, children: info.children }),
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
}> = ({ row, children }) => (
  <RenderChildrenWithAccessor getItemState={(aui) => aui.message.getState()}>
    {(getItem) =>
      children({
        type: "turn-end",
        row,
        get message() {
          return getItem();
        },
      })
    }
  </RenderChildrenWithAccessor>
);

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
 *         return <TurnFooter row={info.row} />;
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
