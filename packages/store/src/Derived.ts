import { resource, ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantClient,
  ClientNames,
  AssistantClientAccessor,
  ClientMeta,
} from "./types/client";

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
  <K extends ClientNames>(_config: Derived.Props<K>): null => {
    return null;
  },
);

export type DerivedElement<K extends ClientNames> = ResourceElement<
  null,
  Derived.Props<K>
>;

export namespace Derived {
  /**
   * Props passed to a derived client resource element.
   */
  export type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & (ClientMeta<K> | { getMeta: (client: AssistantClient) => ClientMeta<K> });
}
