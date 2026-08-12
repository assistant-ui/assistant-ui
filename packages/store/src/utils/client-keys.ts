import type { AssistantClient } from "../types/client";

export const isIgnoredClientKey = (
  key: string | symbol,
): key is "optional" | "subscribe" | "on" | "__proto__" | symbol => {
  return (
    key === "optional" ||
    key === "subscribe" ||
    key === "on" ||
    // Resolving it against the client would answer with the prototype object
    key === "__proto__" ||
    typeof key === "symbol"
  );
};

// Derived clients hold inherited scopes on the prototype chain, so
// enumeration must use for..in rather than Object.keys
export const clientScopeKeys = (client: AssistantClient): string[] => {
  const keys: string[] = [];
  for (const key in client) {
    if (!isIgnoredClientKey(key)) keys.push(key);
  }
  return keys;
};
