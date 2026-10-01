import type { ThreadMessage } from "../types/message";

const keysByParts = new WeakMap<
  readonly ThreadMessage["content"][number][],
  string[]
>();

export const getMessagePartKeys = (
  parts: readonly ThreadMessage["content"][number][],
): string[] => {
  const cached = keysByParts.get(parts);
  if (cached) return cached;

  const keyCounts = new Map<string, number>();
  const identityKeys = parts.map((part) => {
    const identity =
      part.type === "tool-call"
        ? part.toolCallId
        : "id" in part
          ? part.id
          : undefined;
    if (!identity) return undefined;
    const key = `${part.type}:${identity}`;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    return key;
  });
  const keys = parts.map((part, index) => {
    const key = identityKeys[index];
    return key && keyCounts.get(key) === 1 ? key : `${part.type}@${index}`;
  });
  keysByParts.set(parts, keys);
  return keys;
};

export const getMessagePartGroupIdentity = (
  partKeys: readonly (string | undefined)[],
): string | undefined => {
  let smallest: string | undefined;
  for (const key of partKeys) {
    if (key?.includes(":") && (smallest === undefined || key < smallest)) {
      smallest = key;
    }
  }
  return smallest;
};
