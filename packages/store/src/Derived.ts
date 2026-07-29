import {
  resource,
  useMemoCache,
  type ResourceElement,
} from "@assistant-ui/tap";
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

const MEMO_CACHE_UNFILLED = Symbol.for("react.memo_cache_sentinel");

const shallowEqualRecord = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
  );
};

export const useDerived = <K extends ClientNames>(
  props: Derived.Props<K>,
): Derived.Output<K> => {
  const buildingClient = useBuildingClient();
  const select = () => props.get(buildingClient) as DerivedInstance<K>;
  const client = useSyncExternalStore(buildingClient.subscribe, select, select);

  const { source, query = {} } = props as unknown as {
    source: ClientNames;
    query?: Record<string, unknown>;
  };

  const cache = useMemoCache(1) as [
    Derived.Output<K> | typeof MEMO_CACHE_UNFILLED,
  ];
  const prev = cache[0];
  if (
    prev !== MEMO_CACHE_UNFILLED &&
    prev.client === client &&
    prev.source === source &&
    shallowEqualRecord(prev.query, query)
  ) {
    return prev;
  }
  const output = { client, source, query };
  cache[0] = output;
  return output;
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
  Derived.Output<K>
>;

export namespace Derived {
  /**
   * Props passed to a derived client resource element.
   */
  export type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & ClientMeta<K>;

  /**
   * The resolved bound instance plus its selection metadata.
   */
  export type Output<K extends ClientNames> = {
    client: DerivedInstance<K>;
    source: ClientNames;
    query: Record<string, unknown>;
  };
}
