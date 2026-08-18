/** The maximum traversal depth, counted in visited values, not tree levels. */
export const MAX_TRAVERSAL_DEPTH = 64;

/**
 * The element-nesting ceiling a caller observes. `boundNode` visits an element
 * and its `children` array separately, so one level of nesting spends two of
 * {@link MAX_TRAVERSAL_DEPTH}; it runs before the conversion walk and is never
 * the looser of the two. A root array costs one more level than a root object.
 */
export const MAX_ELEMENT_DEPTH = MAX_TRAVERSAL_DEPTH / 2;

/**
 * The maximum number of entries kept at any single level (root, or a
 * `children` array at any depth) of the raw spec, before it ever reaches
 * `normalizeSpec`. Bounds a hostile array's reported `length` so the pre-pass
 * can never be made to walk further than this regardless of what the array
 * claims about itself.
 */
export const CHILDREN_CAP = 200;

/**
 * The total number of nodes {@link boundSpec} will visit across one walk,
 * regardless of how many times a shared reference recurs. Bounds the
 * combinatorial work a DAG of shared or self-referential nodes would
 * otherwise force even though each individual array stays within
 * {@link CHILDREN_CAP}.
 */
export const NODE_BUDGET = 5000;

export type ClampReason = "children" | "budget" | "cycle" | "depth";

/** Renders the warning detail a protocol reports for one {@link ClampReason}. */
export function clampReasonDetail(reason: ClampReason): string {
  if (reason === "budget") {
    return `the tree was truncated after ${NODE_BUDGET} nodes.`;
  }
  if (reason === "cycle") return "a self-referencing node was dropped.";
  if (reason === "depth") {
    return `nodes deeper than ${MAX_ELEMENT_DEPTH} levels were dropped.`;
  }
  return `children were clamped to ${CHILDREN_CAP} entries.`;
}

interface BoundState {
  remaining: number;
  exhausted: boolean;
}

function boundNode(
  value: unknown,
  depth: number,
  onClamp: (reason: ClampReason) => void,
  state: BoundState,
  ancestors: WeakSet<object>,
): unknown {
  if (state.remaining <= 0) {
    if (!state.exhausted) {
      state.exhausted = true;
      onClamp("budget");
    }
    return null;
  }
  state.remaining -= 1;
  if (depth > MAX_TRAVERSAL_DEPTH) {
    onClamp("depth");
    return null;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      onClamp("cycle");
      return null;
    }
    ancestors.add(value);
    const bounded = Array.prototype.slice.call(
      value,
      0,
      CHILDREN_CAP,
    ) as unknown[];
    if (value.length > CHILDREN_CAP) onClamp("children");
    const result = bounded.map((item) =>
      boundNode(item, depth + 1, onClamp, state, ancestors),
    );
    ancestors.delete(value);
    return result;
  }
  if (
    value !== null &&
    typeof value === "object" &&
    "children" in (value as Record<string, unknown>)
  ) {
    if (ancestors.has(value)) {
      onClamp("cycle");
      return null;
    }
    ancestors.add(value);
    const record = value as Record<string, unknown>;
    const result = {
      ...record,
      children: boundNode(
        record["children"],
        depth + 1,
        onClamp,
        state,
        ancestors,
      ),
    };
    ancestors.delete(value);
    return result;
  }
  return value;
}

/**
 * Produces a bounded plain copy of a raw generative-ui spec before it
 * reaches `normalizeSpec`, whose own traversal of the root array or any
 * `children` array walks the full reported length of a hostile proxied
 * array before any per-field cap downstream ever applies. Every array
 * (root, or `children` at any depth) is capped to {@link CHILDREN_CAP}
 * entries via `Array.prototype.slice`, which bounds even a proxy with a
 * fabricated `length`; recursion itself is capped at
 * {@link MAX_TRAVERSAL_DEPTH}. `onClamp` fires once per level that was
 * truncated, receiving the reason for that truncation: `"children"`,
 * `"depth"`, `"budget"`, or `"cycle"`. The walk also spends a total budget of
 * {@link NODE_BUDGET} nodes, so shared references cannot multiply work
 * exponentially, and a node that is its own ancestor is cut to `null`.
 */
export function boundSpec(
  spec: unknown,
  onClamp: (reason: ClampReason) => void,
): unknown {
  return boundNode(
    spec,
    0,
    onClamp,
    { remaining: NODE_BUDGET, exhausted: false },
    new WeakSet(),
  );
}
