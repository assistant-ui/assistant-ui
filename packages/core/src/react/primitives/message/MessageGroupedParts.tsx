"use client";

import { Fragment, type FC, type ReactNode, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useShallow } from "zustand/shallow";
import type { PartState } from "../../../store/scopes/part";
import type {
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../../../types/message";
import {
  buildGroupTree,
  type GroupKey,
  type GroupNode,
  normalizeGroupKey,
} from "../../utils/groupParts";
import { MessagePartChildren, type EnrichedPartState } from "./MessageParts";

export namespace MessagePrimitiveGroupedParts {
  /**
   * A coalesced group of adjacent parts. Surfaced through the same
   * `{ part }` channel as a leaf {@link EnrichedPartState} so consumers
   * dispatch on a single `switch (part.type)`. `type` is the group key
   * (always `"group-…"`); `status` mirrors the last contained part.
   */
  export type GroupPart<TKey extends `group-${string}` = `group-${string}`> = {
    readonly type: TKey;
    readonly status: MessagePartStatus | ToolCallMessagePartStatus;
    readonly indices: readonly number[];
  };

  export type RenderInfo<TKey extends `group-${string}` = `group-${string}`> = {
    /**
     * Either a coalesced group ({@link GroupPart}, identified by a
     * `group-…` `type`) or a single enriched part. Use one switch over
     * `part.type` to handle both.
     */
    readonly part: GroupPart<TKey> | EnrichedPartState;
    /**
     * For group nodes: the recursively-rendered subtree (subgroups +
     * leaf parts). For leaf parts: a sentinel that throws when rendered
     * — accidental fall-through (`default: return children;`) errors
     * loudly instead of silently rendering nothing.
     */
    readonly children: ReactNode;
  };

  export type Props<TKey extends `group-${string}` = `group-${string}`> = {
    /**
     * Maps each part to its group key path. Adjacent parts that share a
     * prefix coalesce up to that prefix. Return `null`, `undefined`, or
     * `[]` to leave a part ungrouped — it will be rendered as a leaf
     * through `children` with `part` set to its {@link EnrichedPartState}.
     *
     * Keys must start with `"group-"` so the renderer's
     * `switch (part.type)` can distinguish groups from real part types.
     *
     * For best performance, pass a stable reference (module-level
     * constant or `useCallback`).
     *
     * @example
     * ```ts
     * const groupBy = (part) =>
     *   part.type === "reasoning" ? ["group-thought", "group-reasoning"] :
     *   part.type === "tool-call" ? ["group-thought", "group-tool"] :
     *   null;
     * ```
     */
    readonly groupBy: (
      part: PartState,
      index: number,
      parts: readonly PartState[],
    ) => GroupKey<TKey>;

    /**
     * Render function called once per group node and once per leaf part.
     * Switch on `part.type`: `"group-…"` cases wrap `children`; real
     * part types (`"text"`, `"tool-call"`, …) render the part directly.
     *
     * Leaf parts receive the same {@link EnrichedPartState} that
     * `<MessagePrimitive.Parts>` would produce (`toolUI`, `addResult`,
     * `resume`, `dataRendererUI`).
     */
    readonly children: (info: RenderInfo<TKey>) => ReactNode;
  };
}

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

/**
 * `children` placeholder passed for leaf-part renders. Leaf parts have no
 * inner subtree; rendering this sentinel signals the consumer wrote
 * `default: return children;` and accidentally fell through for a part —
 * surface the bug loudly instead of silently rendering nothing.
 */
const PartChildrenSentinel: FC = () => {
  throw new Error(
    "MessagePrimitive.GroupedParts: rendered `children` under a leaf " +
      "part. `children` is only meaningful for `group-…` cases — add a " +
      "matching case for the part type or return `null` to skip it.",
  );
};

const renderNode = <TKey extends `group-${string}`>(
  node: GroupNode,
  parts: readonly PartState[],
  render: (info: MessagePrimitiveGroupedParts.RenderInfo<TKey>) => ReactNode,
): ReactNode => {
  if (node.type === "part") {
    return (
      <MessagePartChildren key={node.nodeKey} index={node.index}>
        {({ part }) => render({ part, children: <PartChildrenSentinel /> })}
      </MessagePartChildren>
    );
  }

  const status = parts[node.indices.at(-1)!]?.status ?? COMPLETE_STATUS;
  const groupPart: MessagePrimitiveGroupedParts.GroupPart<TKey> = {
    type: node.key as TKey,
    status,
    indices: node.indices,
  };

  return (
    <Fragment key={node.nodeKey}>
      {render({
        part: groupPart,
        children: (
          <>{node.children.map((child) => renderNode(child, parts, render))}</>
        ),
      })}
    </Fragment>
  );
};

/**
 * Groups adjacent message parts into a tree of coalesced runs and
 * renders each node — group or part — through a single `children`
 * function.
 *
 * The render function receives `{ part, children }` where `part.type`
 * is either a `"group-…"` literal (for a group, `children` is the
 * recursively-rendered subtree) or a real part type (`"text"`,
 * `"tool-call"`, …) for a leaf (`children` is a sentinel that throws
 * if rendered — use `part.type` to distinguish).
 *
 * @example
 * ```tsx
 * <MessagePrimitive.GroupedParts
 *   groupBy={(part) =>
 *     part.type === "reasoning" ? ["group-thought", "group-reasoning"] :
 *     part.type === "tool-call" ? ["group-thought", "group-tool"] :
 *     null
 *   }
 * >
 *   {({ part, children }) => {
 *     switch (part.type) {
 *       case "group-thought":   return <Thought>{children}</Thought>;
 *       case "group-reasoning": return <Reasoning>{children}</Reasoning>;
 *       case "group-tool":      return <ToolStack>{children}</ToolStack>;
 *       case "text":            return <MarkdownText />;
 *       case "tool-call":       return part.toolUI ?? <ToolFallback {...part} />;
 *       default:                return null;
 *     }
 *   }}
 * </MessagePrimitive.GroupedParts>
 * ```
 */
export const MessagePrimitiveGroupedParts = <TKey extends `group-${string}`>({
  groupBy,
  children,
}: MessagePrimitiveGroupedParts.Props<TKey>): ReactNode => {
  const parts = useAuiState(useShallow((s) => s.message.parts));

  const tree = useMemo(
    () =>
      buildGroupTree(
        parts.map((part, i) => normalizeGroupKey(groupBy(part, i, parts))),
      ),
    [parts, groupBy],
  );

  return <>{tree.map((node) => renderNode(node, parts, children))}</>;
};

MessagePrimitiveGroupedParts.displayName = "MessagePrimitive.GroupedParts";
