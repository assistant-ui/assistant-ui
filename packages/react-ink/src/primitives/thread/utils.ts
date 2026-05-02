export const arraysEqual = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length &&
  a.every((value, index) => Object.is(value, b[index]));

export const mapsEqual = <K, V>(a: Map<K, V>, b: Map<K, V>) => {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (!Object.is(value, b.get(key))) return false;
  }
  return true;
};
