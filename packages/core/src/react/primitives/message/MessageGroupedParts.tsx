"use client";

import { Fragment, type FC, type ReactNode, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useShallow } from "zustand/shallow";
import type { PartState } from "../../../store/scopes/part";
import type {
  MessagePartStatus,
  MessageStatus,
  ToolCallMessagePartStatus,
} from "../../../types/message";
import {
  buildGroupTree,
  GROUPBY_MEMO_KEY,
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
   * Synthetic trailing slot for status/loading UI (a "thinking…"
   * indicator, an empty-message placeholder, etc.). Surfaced through the
   * same `{ part }` channel as groups and leaf parts so a single
   * `switch (part.type)` renders it via `case "indicator"`.
   *
   * Unlike a real part it has no underlying {@link PartState}; only
   * `status`, which mirrors the message's running/complete/incomplete
   * state. Emission is controlled by the `indicator` prop.
   */
  export type IndicatorPart = {
    readonly type: "indicator";
    readonly status: MessagePartStatus;
  };

  /**
   * When to emit the synthetic {@link IndicatorPart}:
   * - `"never"` — never.
   * - `"empty"` — only when the message has no parts.
   * - `"no-text"` (default) — when the message has parts but the last one
   *   isn't `text`/`reasoning` (e.g. it ended on a tool call, so the
   *   assistant likely isn't done). Does **not** fire on empty messages.
   * - `"always"` — after every render, regardless of parts.
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
    readonly groupBy: (part: PartState) => readonly TKey[] | null;

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
const RUNNING_STATUS: MessagePartStatus = Object.freeze({ type: "running" });

/**
 * Project the message-level {@link MessageStatus} onto the part-level
 * {@link MessagePartStatus} carried by the indicator. `requires-action`
 * (waiting on a tool/human) reads as still-running; the message-only
 * `tool-calls` incomplete reason collapses to `"other"`.
 */
const toIndicatorStatus = (
  status: MessageStatus | null | undefined,
): MessagePartStatus => {
  switch (status?.type) {
    case "running":
    case "requires-action":
      return RUNNING_STATUS;
    case "incomplete":
      return {
        type: "incomplete",
        reason: status.reason === "tool-calls" ? "other" : status.reason,
        error: status.error,
      };
    default:
      return COMPLETE_STATUS;
  }
};

const shouldShowIndicator = (
  mode: MessagePrimitiveGroupedParts.IndicatorMode,
  parts: readonly PartState[],
): boolean => {
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
        last !== undefined && last.type !== "text" && last.type !== "reasoning"
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
    // Key by absolute part index, not structural nodeKey — prevents zombie fiber subscriptions when parts reshape (#4051).
    return (
      <MessagePartChildren key={`part-${node.index}`} index={node.index}>
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
 *       case "indicator":       return part.status.type === "running" ? <LoadingDots /> : null;
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
  // Skip subscribing to status when the indicator is disabled — otherwise
  // every streaming status transition re-renders the whole grouped tree
  // for nothing.
  const messageStatus = useAuiState((s) =>
    indicator === "never" ? null : s.message.status,
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
  const tree = useMemo(
    () => buildGroupTree(parts.map((part) => groupBy(part) ?? [])),
    // oxlint-disable-next-line tap-hooks/exhaustive-deps -- groupBy is captured via memoDep (either its identity or the helper's memoKey fingerprint); listing it directly would defeat the helper-tagged memo path
    [parts, memoDep],
  );

  return (
    <>
      {tree.map((node) => renderNode(node, parts, children))}
      {shouldShowIndicator(indicator, parts) && (
        <Fragment key="indicator">
          {children({
            part: {
              type: "indicator",
              status: toIndicatorStatus(messageStatus),
            },
            children: <PartChildrenSentinel />,
          })}
        </Fragment>
      )}
    </>
  );
};

MessagePrimitiveGroupedParts.displayName = "MessagePrimitive.GroupedParts";
