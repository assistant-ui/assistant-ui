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
 * Public group key type. Group keys must be prefixed with `group-` so
 * that a unified `switch (part.type)` in the renderer can distinguish
 * a group key (e.g. `"group-thought"`) from a real part type
 * (`"text"`, `"tool-call"`).
 */
export type GroupKey<TKey extends `group-${string}` = `group-${string}`> =
  | TKey
  | readonly TKey[]
  | null
  | undefined;

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

const EMPTY_PATH: readonly string[] = Object.freeze([]);

/**
 * Normalize a `groupBy` return value to a path array.
 * `null`/`undefined`/`[]` → `[]` (ungrouped).
 * `"foo"` → `["foo"]`. Arrays pass through.
 */
export const normalizeGroupKey = (key: GroupKey): readonly string[] => {
  if (key == null) return EMPTY_PATH;
  if (typeof key === "string") return [key];
  return key;
};

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
