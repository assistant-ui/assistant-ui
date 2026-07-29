import { resource, type ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantClient,
  ClientNames,
  AssistantClientAccessor,
  ClientMeta,
} from "./types/client";

type DerivedInstance<K extends ClientNames> = ReturnType<
  AssistantClientAccessor<K>
>;

// Never mounted: useAui resolves Derived scopes under React's dispatcher.
// The hook only exists as the element identity that marks a scope as derived.
export const useDerived = <K extends ClientNames>(
  _props: Derived.Props<K>,
): DerivedInstance<K> => {
  throw new Error("Derived can only be used as a scope of useAui");
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
