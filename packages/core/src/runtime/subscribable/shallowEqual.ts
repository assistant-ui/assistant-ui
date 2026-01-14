export function shallowEqual<T extends object>(
  objA: T | undefined,
  objB: T | undefined,
) {
  if (objA === undefined && objB === undefined) return true;
  if (objA === undefined) return false;
  if (objB === undefined) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    const valueA = objA[key as keyof T];
    const valueB = objB[key as keyof T];
    if (!Object.is(valueA, valueB)) return false;
  }

  return true;
}
