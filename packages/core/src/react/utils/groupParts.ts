import { isMcpAppUri } from "../../types/message";
import type { PartState } from "../../store/scopes/part";

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
 * Synthetic part-type key recognized by {@link groupPartByType}: a
 * tool-call whose `mcp.app.resourceUri` points at an assistant-ui MCP
 * app. Map this key to control how MCP-app tool calls are grouped —
 * separately from regular `"tool-call"` parts.
 */
type GroupPartType = PartState["type"] | "mcp-app";

/**
 * Build a `groupBy` from a `part.type → group-key path` lookup.
 * Parts whose type isn't in the map are left ungrouped. The returned
 * function carries a stable {@link GROUPBY_MEMO_KEY} fingerprint so
 * `<MessagePrimitive.GroupedParts>` can memoize its tree across renders.
 *
 * Special key `"mcp-app"` matches tool-call parts that point at an
 * assistant-ui MCP app resource (`ui://...`) and takes precedence over
 * the `"tool-call"` entry for those parts.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.GroupedParts
 *   groupBy={groupPartByType({
 *     reasoning: ["group-thought", "group-reasoning"],
 *     "tool-call": ["group-thought", "group-tool"],
 *     "mcp-app": [],
 *   })}
 * >
 *   {({ part, children }) => { ... }}
 * </MessagePrimitive.GroupedParts>
 * ```
 */
export const groupPartByType = <TKey extends `group-${string}`>(
  map: Partial<Readonly<Record<GroupPartType, readonly TKey[]>>>,
): ((part: PartState) => readonly TKey[]) => {
  const lookup = map as Readonly<Record<string, readonly TKey[] | undefined>>;
  const fn = ((part) => {
    if (
      part.type === "tool-call" &&
      lookup["mcp-app"] !== undefined &&
      isMcpAppUri(part.mcp?.app?.resourceUri)
    ) {
      return lookup["mcp-app"]!;
    }
    return lookup[part.type] ?? [];
  }) as ((part: PartState) => readonly TKey[]) & {
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
}

interface BuildFrame {
  key: string;
  nodeKey: string;
  indices: number[];
  children: GroupNode[];
  nextChildIdx: number;
}

const makeChildNodeKey = (parent: BuildFrame): string => {
  const idx = parent.nextChildIdx++;
  return parent.nodeKey === "" ? String(idx) : `${parent.nodeKey}.${idx}`;
};

/**
 * Build the group tree from an array of normalized group paths.
 * `paths[i]` is the path for part `i`. The output tree contains one
 * `part` node per part and one `group` node per coalesced run.
 */
export const buildGroupTree = (
  paths: readonly (readonly string[])[],
): readonly GroupNode[] => {
  const root: BuildFrame = {
    key: "",
    nodeKey: "",
    indices: [],
    children: [],
    nextChildIdx: 0,
  };
  const stack: BuildFrame[] = [root];

  const closeTop = (): void => {
    const closing = stack.pop()!;
    const parent = stack[stack.length - 1]!;
    parent.children.push({
      type: "group",
      key: closing.key,
      nodeKey: closing.nodeKey,
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
      });
    }

    // Push this part as a leaf in the deepest open group (or root).
    const top = stack[stack.length - 1]!;
    top.children.push({
      type: "part",
      index: i,
      nodeKey: makeChildNodeKey(top),
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
