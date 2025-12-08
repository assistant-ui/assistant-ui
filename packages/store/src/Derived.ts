import { resource } from "@assistant-ui/tap";
import type { AssistantClient, ClientSchema } from "./types/client";

/**
 * Creates a derived client field that memoizes based on source and query.
 * The get callback always calls the most recent version (useEffectEvent pattern).
 *
 * @example
 * ```typescript
 * const client = useAssistantClient({
 *   message: Derived({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (client) => client.thread().message({ index: 0 }),
 *   }),
 * });
 * ```
 */
export const Derived = resource(
  <T extends ClientSchema<any, any, any, any>>(
    _config: Derived.Props<T>,
  ): null => {
    return null;
  },
);

export namespace Derived {
  /**
   * Props passed to a derived client resource element.
   */
  export type Props<T extends ClientSchema<any, any, any, any>> = {
    get: (parent: AssistantClient) => T["methods"];
    source: NonNullable<T["meta"]>["source"];
    query: NonNullable<T["meta"]>["query"];
  };
}
