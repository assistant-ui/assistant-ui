import { resource } from "@assistant-ui/tap";
import type { ScopeDefinition, DerivedScopeProps } from "./types";

/**
 * Creates a derived scope field that memoizes based on source and query.
 * The get callback always calls the most recent version (useEffectEvent pattern).
 *
 * @example
 * ```typescript
 * const client = useAssistantClient({
 *   message: DerivedScope({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (client) => client.thread().message({ index: 0 }),
 *   }),
 * });
 * ```
 */
export const DerivedScope = resource(
  <T extends ScopeDefinition>(_config: DerivedScopeProps<T>): null => {
    return null;
  },
);
