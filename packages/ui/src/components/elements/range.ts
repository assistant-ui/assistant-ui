/**
 * Range normalization for the numeric props the elements take.
 *
 * Elements are driven by a caller's state, so a prop can arrive negative, past
 * the end of its collection, or NaN. Left raw, those reach the DOM: a negative
 * percentage is an invalid CSS width that the browser drops, leaving a bar at
 * its natural full width, and a negative slice length counts from the end of
 * the array instead of returning nothing.
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

/** The position `index` names in `items`, for an `index` out of range. */
export function indexIn<T>(items: readonly T[], index: number) {
  return Math.floor(clamp(index, 0, Math.max(0, items.length - 1)));
}

/** The item at `index`, for an `index` that may be out of range. */
export function at<T>(items: readonly T[], index: number) {
  if (items.length === 0) return undefined;
  return items[indexIn(items, index)];
}

/** `value` as a share of `total`, as a percentage in `0…100`. */
export function pct(value: number, total: number) {
  if (!(total > 0)) return 0;
  return clamp((value / total) * 100, 0, 100);
}

/** A count of completed items out of `total`, in `0…total`. */
export function progressOf(index: number, total: number) {
  if (!(total > 0)) return 0;
  return Math.floor(clamp(index, 0, total));
}
