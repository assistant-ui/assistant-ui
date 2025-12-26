export const depsShallowEqual = (
  a: readonly unknown[],
  b: readonly unknown[],
) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};
