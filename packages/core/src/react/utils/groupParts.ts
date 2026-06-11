import { isMcpAppUri } from "../../types/message";
import type { PartState } from "../../store/scopes/part";
import type { ToolsState } from "../types/scopes/tools";

/**
 * Registry context passed to a `groupBy` function as its second argument by
 * `<MessagePrimitive.GroupedParts>`. Carries the live tool-UI registry so a
 * `groupBy` can resolve registry-driven grouping (e.g. standalone tool calls)
 * without the part itself having to carry that information.
 */
export type GroupByContext = {
  /** Tool UIs registered in the tool-UI registry, keyed by tool name. */
  readonly toolUIs?: ToolsState["toolUIs"];
};

/**
 * Hierarchical adjacent-coalescing grouping for message parts.
 *
 * Given a group path per part (from `groupBy`), builds a tree of group
 * nodes wrapping individual parts. Adjacent parts sharing a path prefix
 * coalesce into the same group; ungrouped parts are direct children of
 * the root.
 *
 * Each node gets a structural `nodeKey` built from sibling indices
 * (`"0.1.0"`), stable under append-only streaming.
 */

/**
 * Symbol attached to memoizable `groupBy` functions (e.g. those returned
 * by {@link groupPartByType}). Carries a string fingerprint of the config
 * so `MessagePrimitive.GroupedParts` can memo the tree on
 * `[parts, memoKey]` across renders — even when the helper call site
 * reconstructs the function each render.
 */
export const GROUPBY_MEMO_KEY: unique symbol = Symbol.for(
  "@assistant-ui/groupBy.memoKey",
);

/**
 * Synthetic part-type keys recognized by {@link groupPartByType}, in
 * addition to real {@link PartState} types:
 *
 * - `"standalone-tool-call"` — a tool-call whose UI should be presented on its
 *   own, outside the chain-of-thought grouping. Matches MCP-app tool calls plus
 *   any tool-call whose registered UI opts into standalone display (human
 *   tools, the built-in generative-UI tool, and tools that set
 *   `display: "standalone"`). Resolving the registry-driven cases reads the
 *   {@link GroupByContext} passed to the `groupBy` function. Takes precedence
 *   over the `"tool-call"` entry.
 * - `"mcp-app"` — **deprecated**, kept for back-compat. Matches only MCP-app
 *   tool calls. Prefer `"standalone-tool-call"`, which is a superset.
 */
type GroupPartType = PartState["type"] | "standalone-tool-call" | "mcp-app";

/**
 * Build a `groupBy` from a `part.type → group-key path` lookup.
 * Parts whose type isn't in the map are left ungrouped. The returned
 * function carries a stable {@link GROUPBY_MEMO_KEY} fingerprint so
 * `<MessagePrimitive.GroupedParts>` can memoize its tree across renders.
 *
 * The synthetic `"standalone-tool-call"` key matches tool calls that should
 * render outside the chain-of-thought grouping. MCP-app calls are detected from
 * the part alone; the registry-driven cases (human tools, the generative-UI
 * tool, `display: "standalone"` opt-ins) are resolved from the
 * {@link GroupByContext} that `<MessagePrimitive.GroupedParts>` passes to the
 * `groupBy` function — the helper needs nothing threaded into it.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.GroupedParts
 *   groupBy={groupPartByType({
 *     reasoning: ["group-thought", "group-reasoning"],
 *     "tool-call": ["group-thought", "group-tool"],
 *     "standalone-tool-call": [],
 *   })}
 * >
 *   {({ part, children }) => { ... }}
 * </MessagePrimitive.GroupedParts>
 * ```
 */
export const groupPartByType = <TKey extends `group-${string}`>(
  map: Partial<Readonly<Record<GroupPartType, readonly TKey[]>>>,
): ((part: PartState, context?: GroupByContext) => readonly TKey[]) => {
  const lookup = map as Readonly<Record<string, readonly TKey[] | undefined>>;
  const fn = ((part, context) => {
    if (part.type === "tool-call") {
      const isMcpApp = isMcpAppUri(part.mcp?.app?.resourceUri);
      // Read the first registration's flag — the same one `resolveToolRender`
      // renders — so grouping and rendering never disagree for a tool name.
      const isStandalone =
        isMcpApp ||
        (context?.toolUIs?.[part.toolName]?.[0]?.standalone ?? false);
      if (isStandalone && lookup["standalone-tool-call"] !== undefined) {
        return lookup["standalone-tool-call"]!;
      }
      // TODO(v0.15): drop the deprecated "mcp-app" key (superseded by "standalone-tool-call").
      if (isMcpApp && lookup["mcp-app"] !== undefined) {
        return lookup["mcp-app"]!;
      }
    }
    return lookup[part.type] ?? [];
  }) as ((part: PartState, context?: GroupByContext) => readonly TKey[]) & {
    [GROUPBY_MEMO_KEY]?: string;
  };
  // Sort keys so the fingerprint is insensitive to map insertion order —
  // two maps with the same key/value pairs but different declaration order
  // would otherwise hash differently and invalidate the memo unnecessarily.
  const sortedKeys = Object.keys(map).sort();
  const sortedEntries = sortedKeys.map((k) => [k, map[k as keyof typeof map]]);
  fn[GROUPBY_MEMO_KEY] = `groupPartByType:${JSON.stringify(sortedEntries)}`;
  return fn;
};

export type GroupNode = GroupNodeGroup | GroupNodePart;

export interface GroupNodeGroup {
  readonly type: "group";
  /** Current-level group key (last segment of the path). */
  readonly key: string;
  /** Structural React key: sibling-index path, e.g. `"0.1.0"`. */
  readonly nodeKey: string;
  /**
   * Identity key (`"id:<partId>"`) from the group's first part; undefined
   * when absent or already claimed by an earlier sibling.
   */
  readonly idKey: string | undefined;
  /** Indices of parts in this subtree, in order. */
  readonly indices: readonly number[];
  readonly children: readonly GroupNode[];
}

export interface GroupNodePart {
  readonly type: "part";
  /** Index of the part in the message. */
  readonly index: number;
  /** Structural React key: sibling-index path within parent. */
  readonly nodeKey: string;
  /**
   * Identity key (`"id:<partId>"`); undefined when absent or already
   * claimed by an earlier sibling.
   */
  readonly idKey: string | undefined;
}

interface BuildFrame {
  key: string;
  nodeKey: string;
  indices: number[];
  children: GroupNode[];
  nextChildIdx: number;
  claimed: Set<string>;
}

const makeChildNodeKey = (parent: BuildFrame): string => {
  const idx = parent.nextChildIdx++;
  return parent.nodeKey === "" ? String(idx) : `${parent.nodeKey}.${idx}`;
};

const claimIdKey = (
  frame: BuildFrame,
  id: string | undefined,
): string | undefined => {
  if (id === undefined || frame.claimed.has(id)) return undefined;
  frame.claimed.add(id);
  return `id:${id}`;
};

/**
 * Build the group tree from an array of normalized group paths.
 * `paths[i]` is the path for part `i`. The output tree contains one
 * `part` node per part and one `group` node per coalesced run.
 * `partIds[i]` optionally carries a stable identity for part `i` (e.g. a
 * tool call id), from which nodes derive an `idKey`.
 */
export const buildGroupTree = (
  paths: readonly (readonly string[])[],
  partIds?: readonly (string | undefined)[],
): readonly GroupNode[] => {
  const root: BuildFrame = {
    key: "",
    nodeKey: "",
    indices: [],
    children: [],
    nextChildIdx: 0,
    claimed: new Set(),
  };
  const stack: BuildFrame[] = [root];

  const closeTop = (): void => {
    const closing = stack.pop()!;
    const parent = stack[stack.length - 1]!;
    parent.children.push({
      type: "group",
      key: closing.key,
      nodeKey: closing.nodeKey,
      idKey: claimIdKey(parent, partIds?.[closing.indices[0]!]),
      indices: closing.indices,
      children: closing.children,
    });
  };

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]!;

    // Find the longest prefix shared between currently-open groups
    // (excluding root) and this part's path.
    let common = 0;
    while (
      common < stack.length - 1 &&
      common < path.length &&
      stack[common + 1]!.key === path[common]
    ) {
      common++;
    }

    // Close groups not on this path.
    while (stack.length - 1 > common) {
      closeTop();
    }

    // Open new groups down to the part's depth.
    while (stack.length - 1 < path.length) {
      const parent = stack[stack.length - 1]!;
      stack.push({
        key: path[stack.length - 1]!,
        nodeKey: makeChildNodeKey(parent),
        indices: [],
        children: [],
        nextChildIdx: 0,
        claimed: new Set(),
      });
    }

    // Push this part as a leaf in the deepest open group (or root).
    const top = stack[stack.length - 1]!;
    top.children.push({
      type: "part",
      index: i,
      nodeKey: makeChildNodeKey(top),
      idKey: claimIdKey(top, partIds?.[i]),
    });

    // Record the part index in every open ancestor group.
    for (let s = 1; s < stack.length; s++) {
      stack[s]!.indices.push(i);
    }
  }

  // Close any still-open groups.
  while (stack.length > 1) {
    closeTop();
  }

  return root.children;
};
