import { resource } from "@assistant-ui/tap";
import type { ClientDefinition, DerivedClientProps } from "./types";

/**
 * Creates a derived client field that memoizes based on source and query.
 * The get callback always calls the most recent version (useEffectEvent pattern).
 *
 * @example
 * ```typescript
 * const client = useAssistantClient({
 *   message: DerivedClient({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (client) => client.thread().message({ index: 0 }),
 *   }),
 * });
 * ```
 */
export const DerivedClient = resource(
  <T extends ClientDefinition<any, any, any, any>>(
    _config: DerivedClientProps<T>,
  ): null => {
    return null;
  },
);
