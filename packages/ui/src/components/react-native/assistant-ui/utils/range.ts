/**
 * Range normalization for the numeric props the elements take.
 *
 * Elements are driven by a caller's state, so a prop can arrive negative, past
 * the end of its collection, or NaN. Left raw, a negative slice length counts
 * from the end of the array instead of returning nothing, and an index past
 * the end reads a hole.
 */

/**
 * Constrains a value to `min…max`. NaN is decided first and maps to `min`.
 * For any other value, an empty collection can invert the bounds and `max`
 * wins there: `clamp(3, 1, 0)` is `0`, which is what lets a floor of one item
 * still yield none.
 */
export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** The first `count` items, for a `count` that may be out of range. */
export function take<T>(items: readonly T[], count: number) {
  return items.slice(0, Math.floor(clamp(count, 0, items.length)));
}
