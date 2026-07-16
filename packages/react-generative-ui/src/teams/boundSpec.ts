import { CHILDREN_CAP, MAX_TRAVERSAL_DEPTH } from "./constants";

function boundNode(
  value: unknown,
  depth: number,
  onClamp: () => void,
): unknown {
  if (depth > MAX_TRAVERSAL_DEPTH) return null;
  if (Array.isArray(value)) {
    const bounded = Array.prototype.slice.call(
      value,
      0,
      CHILDREN_CAP,
    ) as unknown[];
    if (value.length > CHILDREN_CAP) onClamp();
    return bounded.map((item) => boundNode(item, depth + 1, onClamp));
  }
  if (
    value !== null &&
    typeof value === "object" &&
    "children" in (value as Record<string, unknown>)
  ) {
    const record = value as Record<string, unknown>;
    return {
      ...record,
      children: boundNode(record["children"], depth + 1, onClamp),
    };
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
 * truncated.
 */
export function boundSpec(spec: unknown, onClamp: () => void): unknown {
  return boundNode(spec, 0, onClamp);
}
