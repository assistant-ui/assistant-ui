import type { AssistantClient } from "../types/client";

export const isIgnoredClientKey = (
  key: string | symbol,
): key is "on" | "subscribe" | "optional" | symbol => {
  return (
    key === "on" ||
    key === "subscribe" ||
    key === "optional" ||
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

// A hand-built parent in the prototype chain can leave a scope entirely
// absent or resolve it to an Object.prototype member; both carry no source
export const isScopeAvailable = (
  accessor: { source: string | null } | undefined,
): boolean => accessor?.source != null;

// Scope resolution is tri-state: available (string source), present but
// unavailable (error accessor, null source), absent (no accessor, e.g. a
// hand-built parent chain). isScopeAvailable collapses the last two; on()
// must keep them apart because an absent scope forwards to the parent
export const isScopePresentButUnavailable = (
  accessor: { source: string | null } | undefined,
): boolean => accessor?.source === null;
