/**
 * Copies at most `cap` entries out of `value` by index.
 *
 * Every array method dispatches on the input: a replaced `slice` is called
 * directly, and the intrinsic `Array.prototype.slice.call` still reaches a
 * `constructor` with a `@@species` whose `[[Construct]]` returns an arbitrary
 * object, which then supplies the `map` or `some` the caller runs next. Reading
 * indices consults neither, so it is the only form that bounds a hostile array.
 */
export const copyBounded = (value: unknown[], cap: number): unknown[] => {
  const length = value.length;
  const count = Math.min(
    cap,
    typeof length === "number" && length > 0 ? length : 0,
  );
  const items: unknown[] = [];
  for (let index = 0; index < count; index += 1) items.push(value[index]);
  return items;
};
