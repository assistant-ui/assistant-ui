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
    const keys = messageKeys(entry);
    if (keys === undefined) continue;
    // The host appends the send's message after the ones already present, so
    // only a key past the last known one can be its echo; prepended history
    // sits before them and must not land a send still waiting for its own.
    let lastKnownIndex = -1;
    for (let index = 0; index < keys.length; index++) {
      if (entry.known.has(keys[index]!)) lastKnownIndex = index;
    }
    let key: string | undefined;
    for (let index = lastKnownIndex + 1; index < keys.length; index++) {
      const candidate = keys[index]!;
      if (
        !entry.known.has(candidate) &&
        !claimed.has(candidate) &&
        isEligible(entry, candidate)
      ) {
        key = candidate;
        break;
      }
    }
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
