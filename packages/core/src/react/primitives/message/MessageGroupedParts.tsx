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
  GROUPBY_MEMO_KEY,
  type GroupByContext,
  type GroupNode,
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

  /**
   * Synthetic trailing slot for a streaming/loading affordance (a
   * "thinking…" dot, etc.). Surfaced through the same `{ part }` channel
   * as groups and leaf parts so a single `switch (part.type)` renders it
   * via `case "indicator"`.
   *
   * It is only ever emitted while the message is running, so its presence
   * alone means "render your loading UI here" — there's no `status` to
   * branch on.
   */
  export type IndicatorPart = {
    readonly type: "indicator";
  };

  /**
   * When to emit the synthetic {@link IndicatorPart}. It is **only** emitted
   * while the message is running (streaming); the mode further restricts
   * which running states qualify:
   * - `"never"` — never.
   * - `"empty"` — only when the message has no parts yet.
   * - `"no-text"` (default) — when the message has no parts yet or the last
   *   part isn't `text`/`reasoning` (e.g. it ended on a tool call, so the
   *   assistant likely isn't done).
   * - `"always"` — whenever the message is running, regardless of parts.
   */
  export type IndicatorMode = "never" | "empty" | "no-text" | "always";

  export type RenderInfo<TKey extends `group-${string}` = `group-${string}`> = {
    /**
     * Either a coalesced group ({@link GroupPart}, identified by a
     * `group-…` `type`), a single enriched leaf part, or the synthetic
     * {@link IndicatorPart} (`type: "indicator"`). Use one switch over
     * `part.type` to handle all three.
     */
    readonly part: GroupPart<TKey> | EnrichedPartState | IndicatorPart;
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
     * Maps each part to a group-key path. Adjacent parts that share a
     * prefix coalesce into the same group. Return `[]` (or `null`) to
     * leave a part ungrouped.
     *
     * Group keys must start with `"group-"` so the renderer's
     * `switch (part.type)` can tell groups apart from real part types.
     *
     * **Prefer {@link groupPartByType}** for the common case of mapping by
     * `part.type` — it ships a stable memo fingerprint so the tree
     * survives unrelated re-renders. Use an inline function only when
     * the helper isn't expressive enough (e.g. branching on
     * `part.toolName` or part metadata).
     *
     * The second argument is a {@link GroupByContext} carrying the tool-UI
     * registry, for grouping that depends on it (e.g. standalone tool calls).
     *
     * @example
     * ```tsx
     * import { groupPartByType } from "@assistant-ui/react";
     *
     * <MessagePrimitive.GroupedParts
     *   groupBy={groupPartByType({
     *     reasoning: ["group-thought", "group-reasoning"],
     *     "tool-call": ["group-thought", "group-tool"],
     *   })}
     * >
     * ```
     */
    readonly groupBy: (
      part: PartState,
      context: GroupByContext,
    ) => readonly TKey[] | null;

    /**
     * Controls emission of the synthetic {@link IndicatorPart} — a
     * trailing `{ part: { type: "indicator", status } }` render call you
     * handle with `case "indicator"` to show loading/status UI.
     *
     * @default "no-text"
     * @see IndicatorMode
     */
    readonly indicator?: IndicatorMode;

    /**
     * Render function called once per group node, once per leaf part, and
     * (when the `indicator` condition is met) once for the trailing
     * {@link IndicatorPart}. Switch on `part.type`: `"group-…"` cases wrap
     * `children`; real part types (`"text"`, `"tool-call"`, …) render the
     * part directly; `"indicator"` renders status/loading UI.
     *
     * Leaf parts receive the same {@link EnrichedPartState} that
     * `<MessagePrimitive.Parts>` would produce (`toolUI`, `addResult`,
     * `resume`, `respondToApproval`, `dataRendererUI`).
     */
    readonly children: (info: RenderInfo<TKey>) => ReactNode;
  };
}

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

const shouldShowIndicator = (
  mode: MessagePrimitiveGroupedParts.IndicatorMode,
  parts: readonly PartState[],
  isRunning: boolean,
): boolean => {
  // The indicator is a streaming affordance — never show it on a settled
  // message, whatever the mode.
  if (!isRunning) return false;

  switch (mode) {
    case "never":
      return false;
    case "always":
      return true;
    case "empty":
      return parts.length === 0;
    case "no-text": {
      const last = parts[parts.length - 1];
      return (
        last === undefined ||
        (last.type !== "text" && last.type !== "reasoning")
      );
    }
  }
};

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
    // Key by part identity when available, else absolute part index — never
    // the structural nodeKey, which leaves zombie fiber subscriptions when
    // parts reshape (#4051).
    return (
      <MessagePartChildren
        key={node.idKey ? `part-${node.idKey}` : `part-${node.index}`}
        index={node.index}
      >
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
    <Fragment key={node.idKey ?? node.nodeKey}>
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
 *   groupBy={groupPartByType({
 *     reasoning: ["group-thought", "group-reasoning"],
 *     "tool-call": ["group-thought", "group-tool"],
 *   })}
 * >
 *   {({ part, children }) => {
 *     switch (part.type) {
 *       case "group-thought":   return <Thought>{children}</Thought>;
 *       case "group-reasoning": return <Reasoning>{children}</Reasoning>;
 *       case "group-tool":      return <ToolStack>{children}</ToolStack>;
 *       case "text":            return <MarkdownText />;
 *       case "tool-call":       return part.toolUI ?? <ToolFallback {...part} />;
 *       case "indicator":       return <LoadingDots />;
 *       default:                return null;
 *     }
 *   }}
 * </MessagePrimitive.GroupedParts>
 * ```
 */
export const MessagePrimitiveGroupedParts = <TKey extends `group-${string}`>({
  groupBy,
  indicator = "no-text",
  children,
}: MessagePrimitiveGroupedParts.Props<TKey>): ReactNode => {
  const parts = useAuiState(useShallow((s) => s.message.parts));
  // Handed to `groupBy` as its `context` argument (see GroupByContext).
  const toolUIs = useAuiState((s) => s.tools.toolUIs);
  // Subscribe to a boolean, not the status object: the tree only needs to
  // re-render when running-ness flips, and `"never"` opts out entirely.
  const isRunning = useAuiState((s) =>
    indicator === "never" ? false : s.message.status?.type === "running",
  );

  // Helpers like `groupPartByType` tag the function with `GROUPBY_MEMO_KEY`
  // (a stable string fingerprint of the helper config). When present,
  // memo on `[parts, memoKey]` so the tree survives unrelated renders.
  // For inline `groupBy`, fall back to recomputing each render — O(n)
  // and cheap.
  const memoKey = (groupBy as { [GROUPBY_MEMO_KEY]?: string })[
    GROUPBY_MEMO_KEY
  ];
  const memoDep = memoKey ?? groupBy;
  const tree = useMemo(() => {
    const context: GroupByContext = { toolUIs };
    return buildGroupTree(
      parts.map((part) => groupBy(part, context) ?? []),
      parts.map((part) =>
        part.type === "tool-call" ? part.toolCallId : undefined,
      ),
    );
    // oxlint-disable-next-line react/exhaustive-deps -- groupBy is captured via memoDep (either its identity or the helper's memoKey fingerprint); listing it directly would defeat the helper-tagged memo path
  }, [parts, memoDep, toolUIs]);

  return (
    <>
      {tree.map((node) => renderNode(node, parts, children))}
      {shouldShowIndicator(indicator, parts, isRunning) &&
        children({
          part: { type: "indicator" },
          children: <PartChildrenSentinel />,
        })}
    </>
  );
};

MessagePrimitiveGroupedParts.displayName = "MessagePrimitive.GroupedParts";
