import { resource } from "@assistant-ui/tap";
import type { ScopeDefinition, ScopeValue, DerivedScopeProps } from "./types";

/**
 * Creates a derived scope field that memoizes based on source and query.
 * The get callback always calls the most recent version (useEffectEvent pattern).
 *
 * @example
 * ```typescript
 * const MessageScope = DerivedScope<MessageScopeDefinition>({
 *   source: "thread",
 *   query: { type: "index", index: 0 },
 *   get: () => messageApi,
 * });
 * ```
 */
export const DerivedScope = resource(
  <T extends ScopeDefinition>(config: DerivedScopeProps<T>): ScopeValue<T> => {
    return config;
  },
);
