/**
 * Copies at most `cap` entries out of `value` by index.
 *
 * Every array method dispatches on the input: a replaced `slice` is called
 * directly, and the intrinsic `Array.prototype.slice.call` still reaches a
 * `constructor` with a `@@species` whose `[[Construct]]` returns an arbitrary
 * object, which then supplies the `map` or `some` the caller runs next. Reading
 * indices consults neither, so it is the only form that bounds a hostile array.
 *
 * Absent indices stay absent, matching what `slice` produces for a sparse
 * input, so callers that skip holes still skip them. `truncated` comes from the
 * same `length` read as the bound, so an input cannot report one figure to the
 * cap and another to the caller's warning.
 */
export const copyBounded = (
  value: unknown[],
  cap: number,
): { readonly items: unknown[]; readonly truncated: boolean } => {
  const length = value.length;
  const usable = typeof length === "number" && length > 0 ? length : 0;
  const count = Math.min(cap, usable);
  const items: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index in value) items[index] = value[index];
  }
  items.length = count;
  return { items, truncated: usable > cap };
};
