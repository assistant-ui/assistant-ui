import {
  CHILDREN_CAP,
  MAX_TRAVERSAL_DEPTH,
  NODE_BUDGET,
  type ClampReason,
} from "./constants";

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
  if (depth > MAX_TRAVERSAL_DEPTH) return null;
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
 * truncated, receiving the reason for that truncation. The walk also spends
 * a total budget of {@link NODE_BUDGET} nodes, so shared references cannot
 * multiply work exponentially, and a node that is its own ancestor is cut to
 * `null`.
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
