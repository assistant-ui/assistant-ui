export const matchInTransit = <
  T extends { readonly known: ReadonlySet<string> },
>(
  entries: readonly T[],
  messageKeys: (entry: T) => readonly string[] | undefined,
  isEligible: (entry: T, key: string) => boolean = () => true,
) => {
  const claimed = new Set<string>();
  const landed = new Set<T>();
  for (const entry of entries) {
    const key = messageKeys(entry)?.find(
      (candidate) =>
        !entry.known.has(candidate) &&
        !claimed.has(candidate) &&
        isEligible(entry, candidate),
    );
    if (key === undefined) continue;
    claimed.add(key);
    landed.add(entry);
  }
  return { landed, claimed };
};

export const retainInTransit = <
  T extends { readonly known: ReadonlySet<string> },
>(
  entries: readonly T[],
  match: { landed: ReadonlySet<T>; claimed: ReadonlySet<string> },
): T[] =>
  entries
    .filter((entry) => !match.landed.has(entry))
    .map((entry) => ({
      ...entry,
      known: new Set([...entry.known, ...match.claimed]),
    }));
