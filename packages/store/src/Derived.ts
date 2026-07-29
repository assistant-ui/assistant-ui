import { resource, type ResourceElement } from "@assistant-ui/tap";
import { useSyncExternalStore } from "react";
import type {
  AssistantClient,
  ClientNames,
  AssistantClientAccessor,
  ClientMeta,
} from "./types/client";
import { useBuildingClient } from "./utils/tap-assistant-context";

type DerivedInstance<K extends ClientNames> = ReturnType<
  AssistantClientAccessor<K>
>;

export const useDerived = <K extends ClientNames>({
  get,
}: Derived.Props<K>): DerivedInstance<K> => {
  const client = useBuildingClient();
  const select = () => get(client) as DerivedInstance<K>;
  return useSyncExternalStore(client.subscribe, select, select);
};

/**
 * Creates a derived client field whose resolved instance is bound into the
 * client returned by `useAui`; a structural swap produces a new client through
 * a React re-render. `get` must return a client created via
 * `useClientResource` (or `useClientLookup`/`useClientList`).
 *
 * @example
 * ```typescript
 * const aui = useAui({
 *   message: Derived({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (aui) => aui.thread.message({ index: 0 }),
 *   }),
 * });
 * ```
 */
export const Derived = resource(useDerived) as <K extends ClientNames>(
  config: Derived.Props<K>,
) => DerivedElement<K>;

export type DerivedElement<K extends ClientNames> = ResourceElement<
  DerivedInstance<K>
>;

export namespace Derived {
  /**
   * Props passed to a derived client resource element.
   */
  export type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & ClientMeta<K>;
}
