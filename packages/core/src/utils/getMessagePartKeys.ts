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

  const claimed = new Set<string>();
  const keys = parts.map((part, index) => {
    const identity =
      part.type === "tool-call"
        ? part.toolCallId
        : "id" in part && part.id
          ? part.id
          : undefined;
    if (identity !== undefined) {
      const key = `${part.type}:${identity}`;
      if (!claimed.has(key)) {
        claimed.add(key);
        return key;
      }
    }
    return `${part.type}@${index}`;
  });
  keysByParts.set(parts, keys);
  return keys;
};
