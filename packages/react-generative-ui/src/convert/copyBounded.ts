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
 *
 * A reported `length` is normalized the way `ToLength` does before it reaches
 * `count`, because a fractional one would otherwise reach `items.length` and
 * throw `RangeError` where `slice` returns a bounded result. `truncated` reads
 * that same normalized figure, so a `length` whose `valueOf` answers differently
 * on a second conversion cannot separate the warning from the bound.
 */
export const copyBounded = <T>(
  value: readonly T[],
  cap: number,
): { readonly items: T[]; readonly truncated: boolean } => {
  const reported = value.length;
  const integral = Math.trunc(Number(reported));
  const usable =
    Number.isNaN(integral) || integral <= 0
      ? 0
      : Math.min(integral, Number.MAX_SAFE_INTEGER);
  const count = Math.min(cap, usable);
  const items: T[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index in value) items[index] = value[index] as T;
  }
  items.length = count;
  return { items, truncated: usable > cap };
};
